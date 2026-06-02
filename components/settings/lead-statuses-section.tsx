"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeadStatuses } from "@/lib/hooks/use-lead-statuses";
import { saveCustomLeadStatuses } from "@/lib/api/lead-statuses";
import {
  STATUS_COLOR_DOT,
  type LeadStatusColor,
  type LeadStatusOption,
} from "@/lib/utils/lead-status";

const COLORS: LeadStatusColor[] = [
  "slate",
  "blue",
  "green",
  "red",
  "amber",
  "violet",
];

type DraftStatus = {
  key?: string;
  label: string;
  color: LeadStatusColor;
  isTerminal: boolean;
};

export function LeadStatusesSection() {
  const { statuses, loading, reload } = useLeadStatuses();

  const builtIns = useMemo(
    () => statuses.filter((s) => s.isBuiltIn),
    [statuses],
  );

  const [custom, setCustom] = useState<DraftStatus[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState<LeadStatusColor>("blue");
  const [newTerminal, setNewTerminal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Seed the editable list from the loaded custom statuses.
  useEffect(() => {
    setCustom(
      statuses
        .filter((s) => !s.isBuiltIn)
        .map((s) => ({
          key: s.key,
          label: s.label,
          color: s.color,
          isTerminal: s.isTerminal,
        })),
    );
  }, [statuses]);

  function addStatus() {
    const label = newLabel.trim();
    if (!label) return;
    setCustom((prev) => [...prev, { label, color: newColor, isTerminal: newTerminal }]);
    setNewLabel("");
    setNewColor("blue");
    setNewTerminal(false);
    setSaved(false);
  }

  function removeStatus(index: number) {
    setCustom((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  function updateStatus(index: number, patch: Partial<DraftStatus>) {
    setCustom((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveCustomLeadStatuses(custom);
      await reload();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save statuses");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Built-in statuses (read-only) */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[14px] font-semibold text-ink">Lead Statuses</h3>
          <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
            {builtIns.length} built-in · {custom.length} custom
          </span>
        </div>
        <p className="text-[11px] text-ink-muted mb-4">
          Statuses appear in the lead status dropdown across funnels and the
          cold-calling view. Built-in statuses can&apos;t be edited.
        </p>
        <div className="flex flex-wrap gap-2">
          {builtIns.map((s) => (
            <StatusChip key={s.key} status={s} locked />
          ))}
        </div>
      </div>

      {/* Custom statuses (editable) */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
        <h3 className="text-[14px] font-semibold text-ink mb-3">
          Custom Statuses
        </h3>

        {custom.length === 0 ? (
          <p className="text-[11px] text-ink-muted mb-4">
            No custom statuses yet. Add one below.
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {custom.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2 py-2 px-3 rounded-[8px] bg-section/40 border border-border-subtle"
              >
                <ColorPicker
                  value={s.color}
                  onChange={(c) => updateStatus(i, { color: c })}
                />
                <input
                  value={s.label}
                  onChange={(e) => updateStatus(i, { label: e.target.value })}
                  className="flex-1 px-2 py-1 rounded-[6px] bg-surface border border-border-subtle text-[12px] text-ink focus:outline-none focus:border-border-default"
                />
                <label className="flex items-center gap-1.5 text-[11px] text-ink-secondary cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={s.isTerminal}
                    onChange={(e) => updateStatus(i, { isTerminal: e.target.checked })}
                    className="accent-signal-blue-text"
                  />
                  Terminal
                </label>
                <button
                  onClick={() => removeStatus(i)}
                  className="p-1.5 rounded-md text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10 transition-colors"
                  title="Remove status"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new */}
        <div className="flex items-center gap-2 pt-3 border-t border-border-subtle">
          <ColorPicker value={newColor} onChange={setNewColor} />
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addStatus();
            }}
            placeholder="New status name…"
            className="flex-1 px-2 py-1.5 rounded-[6px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
          />
          <label className="flex items-center gap-1.5 text-[11px] text-ink-secondary cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={newTerminal}
              onChange={(e) => setNewTerminal(e.target.checked)}
              className="accent-signal-blue-text"
            />
            Terminal
          </label>
          <button
            onClick={addStatus}
            disabled={!newLabel.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors disabled:opacity-50"
          >
            <Plus size={12} />
            Add
          </button>
        </div>

        {/* Save bar */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            Save changes
          </button>
          {error && <span className="text-[11px] text-signal-red-text">{error}</span>}
          {saved && (
            <span className="text-[11px] text-signal-green-text">Statuses saved.</span>
          )}
        </div>
        <p className="text-[10px] text-ink-faint mt-2">
          Mark a status as <span className="font-medium">Terminal</span> to treat
          leads in it as finished (hidden from active queues).
        </p>
      </div>
    </div>
  );
}

function StatusChip({
  status,
  locked,
}: {
  status: LeadStatusOption;
  locked?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary">
      <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_COLOR_DOT[status.color])} />
      {status.label}
      {status.isTerminal && (
        <span className="text-[9px] uppercase tracking-wide text-ink-faint">end</span>
      )}
      {locked && <Lock size={9} className="text-ink-faint" />}
    </span>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: LeadStatusColor;
  onChange: (c: LeadStatusColor) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center hover:bg-hover transition-colors"
        title="Pick colour"
      >
        <span className={cn("w-2.5 h-2.5 rounded-full", STATUS_COLOR_DOT[value])} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 flex gap-1 p-1.5 bg-surface rounded-[10px] border border-border-subtle shadow-lg">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center border",
                  value === c ? "border-ink" : "border-transparent",
                )}
              >
                <span className={cn("w-3 h-3 rounded-full", STATUS_COLOR_DOT[c])} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
