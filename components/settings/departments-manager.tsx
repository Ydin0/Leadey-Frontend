"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDepartments, saveDepartments, type Department } from "@/lib/api/team";

// Palette reps can pick from for a department's colour dot.
const PALETTE = [
  "#97A4D6", "#86EFAC", "#6E7BCB", "#E0A878",
  "#C58FD6", "#5FB6C9", "#E08FA8", "#6FBEA8",
];

export function DepartmentsManager({ onSaved }: { onSaved?: (depts: Department[]) => void }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    getDepartments()
      .then((d) => setDepartments(d))
      .catch(() => setDepartments([]))
      .finally(() => setLoading(false));
  }, []);

  function touch() {
    setSaved(false);
  }

  function update(i: number, patch: Partial<Department>) {
    setDepartments((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
    touch();
  }
  function remove(i: number) {
    setDepartments((prev) => prev.filter((_, idx) => idx !== i));
    touch();
  }
  function add() {
    const name = newName.trim();
    if (!name) return;
    if (departments.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      setError("A department with that name already exists.");
      return;
    }
    setDepartments((prev) => [...prev, { name, color: PALETTE[prev.length % PALETTE.length] }]);
    setNewName("");
    setError(null);
    touch();
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const cleaned = departments.filter((d) => d.name.trim().length > 0);
      const result = await saveDepartments(cleaned);
      setDepartments(result);
      onSaved?.(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save departments");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
      <h3 className="text-[14px] font-semibold text-ink mb-1">Departments</h3>
      <p className="text-[11px] text-ink-muted mb-4">
        Group your reps into departments (e.g. Enterprise, SMB, BDR). They power
        the department filter and breakdowns on the Team analytics page.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={16} className="animate-spin text-ink-muted" />
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {departments.length === 0 ? (
              <p className="text-[11px] text-ink-muted">No departments yet. Add one below.</p>
            ) : (
              departments.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 py-2 px-3 rounded-[8px] bg-section/40 border border-border-subtle"
                >
                  <ColorDot value={d.color} onChange={(c) => update(i, { color: c })} />
                  <input
                    value={d.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    className="flex-1 px-2 py-1 rounded-[6px] bg-surface border border-border-subtle text-[12px] text-ink focus:outline-none focus:border-border-default"
                  />
                  <button
                    onClick={() => remove(i)}
                    className="p-1.5 rounded-md text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10 transition-colors"
                    title="Remove department"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-border-subtle">
            <input
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") add(); }}
              placeholder="New department name…"
              className="flex-1 px-2 py-1.5 rounded-[6px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
            />
            <button
              onClick={add}
              disabled={!newName.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors disabled:opacity-50"
            >
              <Plus size={12} /> Add
            </button>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              Save departments
            </button>
            {error && <span className="text-[11px] text-signal-red-text">{error}</span>}
            {saved && <span className="text-[11px] text-signal-green-text">Departments saved.</span>}
          </div>
          <p className="text-[10px] text-ink-faint mt-2">
            Renaming a department here won&apos;t move members already assigned to the
            old name — update their department in the list below if you rename one.
          </p>
        </>
      )}
    </div>
  );
}

function ColorDot({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center hover:bg-hover transition-colors"
        title="Pick colour"
      >
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: value }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 flex gap-1 p-1.5 bg-surface rounded-[10px] border border-border-subtle shadow-lg">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { onChange(c); setOpen(false); }}
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center border",
                  value === c ? "border-ink" : "border-transparent",
                )}
              >
                <span className="w-3 h-3 rounded-full flex items-center justify-center" style={{ background: c }}>
                  {value === c && <Check size={9} className="text-white" strokeWidth={3} />}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
