"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import {
  getCallOutcomes, saveCallOutcomes, OUTCOME_COLOR_DOT,
  type CallOutcome, type CallOutcomeColor,
} from "@/lib/api/call-outcomes";

const COLORS: CallOutcomeColor[] = ["slate", "blue", "green", "red", "amber", "violet"];

export function CallOutcomesSection() {
  const isAuthReady = useAuthReady();
  const [items, setItems] = useState<CallOutcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState<CallOutcomeColor>("blue");

  useEffect(() => {
    if (!isAuthReady) return;
    getCallOutcomes().then((list) => { setItems(list); setLoading(false); }).catch(() => setLoading(false));
  }, [isAuthReady]);

  function update(i: number, patch: Partial<CallOutcome>) {
    setItems((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
    setSaved(false);
  }
  function remove(i: number) { setItems((prev) => prev.filter((_, idx) => idx !== i)); setSaved(false); }
  function add() {
    const label = newLabel.trim();
    if (!label) return;
    setItems((prev) => [...prev, { key: "", label, color: newColor }]);
    setNewLabel(""); setNewColor("blue"); setSaved(false);
  }

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false);
    try {
      const next = await saveCallOutcomes(items.filter((o) => o.label.trim()));
      setItems(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save outcomes");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-ink-muted" /></div>;
  }

  return (
    <div className="space-y-6 max-w-[680px]">
      <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
        <h3 className="text-[14px] font-semibold text-ink mb-1">Call Outcomes</h3>
        <p className="text-[11px] text-ink-muted mb-4">
          Outcomes label the result of each call (e.g. Booked Meeting, Disqualified). The AI auto-categorises every recorded call into one of these, and reps can change it. They show on each call in the lead profile and on the Recordings page.
        </p>

        <div className="space-y-2 mb-4">
          {items.map((o, i) => (
            <div key={i} className="flex items-center gap-2 py-2 px-3 rounded-[8px] bg-section/40 border border-border-subtle">
              <GripVertical size={13} className="text-ink-faint shrink-0" />
              <ColorPicker value={o.color} onChange={(c) => update(i, { color: c })} />
              <input
                value={o.label}
                onChange={(e) => update(i, { label: e.target.value })}
                className="flex-1 px-2 py-1 rounded-[6px] bg-surface border border-border-subtle text-[12px] text-ink focus:outline-none focus:border-border-default"
              />
              <button onClick={() => remove(i)} className="p-1.5 rounded-md text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10 transition-colors" title="Remove outcome">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {items.length === 0 && <p className="text-[11px] text-ink-muted">No outcomes yet — add one below.</p>}
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-border-subtle">
          <ColorPicker value={newColor} onChange={setNewColor} />
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            placeholder="New outcome name…"
            className="flex-1 px-2 py-1.5 rounded-[6px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
          />
          <button onClick={add} disabled={!newLabel.trim()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors disabled:opacity-50">
            <Plus size={12} /> Add
          </button>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50">
            {saving && <Loader2 size={12} className="animate-spin" />} Save changes
          </button>
          {error && <span className="text-[11px] text-signal-red-text">{error}</span>}
          {saved && <span className="text-[11px] text-signal-green-text">Outcomes saved.</span>}
        </div>
      </div>
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: CallOutcomeColor; onChange: (c: CallOutcomeColor) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center hover:bg-hover transition-colors" title="Pick colour">
        <span className={cn("w-2.5 h-2.5 rounded-full", OUTCOME_COLOR_DOT[value])} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 flex gap-1 p-1.5 bg-surface rounded-[10px] border border-border-subtle shadow-lg">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => { onChange(c); setOpen(false); }} className={cn("w-5 h-5 rounded-full flex items-center justify-center border", value === c ? "border-ink" : "border-transparent")}>
                <span className={cn("w-3 h-3 rounded-full", OUTCOME_COLOR_DOT[c])} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
