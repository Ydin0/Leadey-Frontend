"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getTaskCategories, saveTaskCategories,
  CATEGORY_DOT_CLASS, type TaskCategoryColor, type TaskCategoryDef,
} from "@/lib/api/task-categories";

const COLORS: TaskCategoryColor[] = ["slate", "blue", "green", "red", "amber", "violet"];

export function TaskCategoriesSection() {
  const [categories, setCategories] = useState<TaskCategoryDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    getTaskCategories().then(setCategories).catch(() => setCategories([])).finally(() => setLoading(false));
  }, []);

  function touch() { setSaved(false); }
  function update(i: number, patch: Partial<TaskCategoryDef>) {
    setCategories((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
    touch();
  }
  function remove(i: number) {
    if (categories[i]?.key === "reminder") { setError("The Reminder category powers the Reminders tab and can't be removed."); return; }
    setCategories((prev) => prev.filter((_, idx) => idx !== i));
    touch();
  }
  function add() {
    const label = newLabel.trim();
    if (!label) return;
    if (categories.some((c) => c.label.toLowerCase() === label.toLowerCase())) { setError("That category already exists."); return; }
    setCategories((prev) => [...prev, { key: "", label, color: COLORS[prev.length % COLORS.length] }]);
    setNewLabel("");
    setError(null);
    touch();
  }

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false);
    try {
      const result = await saveTaskCategories(categories.filter((c) => c.label.trim()));
      setCategories(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save categories");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
      <h3 className="text-[14px] font-semibold text-ink mb-1">Task Categories</h3>
      <p className="text-[11px] text-ink-muted mb-4">
        Colour-coded tags for tasks &amp; reminders (Follow up, Call back, etc.). They appear on
        every task in the Inbox and as the type picker when creating one.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-6"><Loader2 size={16} className="animate-spin text-ink-muted" /></div>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {categories.length === 0 ? (
              <p className="text-[11px] text-ink-muted">No categories yet. Add one below.</p>
            ) : (
              categories.map((c, i) => (
                <div key={i} className="flex items-center gap-2 py-2 px-3 rounded-[8px] bg-section/40 border border-border-subtle">
                  <ColorDot value={c.color} onChange={(col) => update(i, { color: col })} />
                  <input
                    value={c.label}
                    onChange={(e) => update(i, { label: e.target.value })}
                    className="flex-1 px-2 py-1 rounded-[6px] bg-surface border border-border-subtle text-[12px] text-ink focus:outline-none focus:border-border-default"
                  />
                  {c.key === "reminder" ? (
                    <span className="text-[9px] uppercase tracking-wide text-ink-faint px-1.5">Built-in</span>
                  ) : (
                    <button onClick={() => remove(i)} title="Remove category"
                      className="p-1.5 rounded-md text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-border-subtle">
            <input
              value={newLabel}
              onChange={(e) => { setNewLabel(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") add(); }}
              placeholder="New category name…"
              className="flex-1 px-2 py-1.5 rounded-[6px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
            />
            <button onClick={add} disabled={!newLabel.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors disabled:opacity-50">
              <Plus size={12} /> Add
            </button>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50">
              {saving && <Loader2 size={12} className="animate-spin" />} Save categories
            </button>
            {error && <span className="text-[11px] text-signal-red-text">{error}</span>}
            {saved && <span className="text-[11px] text-signal-green-text">Categories saved.</span>}
          </div>
          <p className="text-[10px] text-ink-faint mt-2">
            Renaming a category here keeps existing tasks on it; removing one leaves those tasks
            showing the old tag until they&apos;re recategorised.
          </p>
        </>
      )}
    </div>
  );
}

function ColorDot({ value, onChange }: { value: TaskCategoryColor; onChange: (c: TaskCategoryColor) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center hover:bg-hover transition-colors" title="Pick colour">
        <span className={cn("w-2.5 h-2.5 rounded-full", CATEGORY_DOT_CLASS[value])} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 flex gap-1 p-1.5 bg-surface rounded-[10px] border border-border-subtle shadow-lg">
            {COLORS.map((col) => (
              <button key={col} type="button" onClick={() => { onChange(col); setOpen(false); }}
                className={cn("w-5 h-5 rounded-full flex items-center justify-center border", value === col ? "border-ink" : "border-transparent")}>
                <span className={cn("w-3 h-3 rounded-full flex items-center justify-center", CATEGORY_DOT_CLASS[col])}>
                  {value === col && <Check size={9} className="text-white" strokeWidth={3} />}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
