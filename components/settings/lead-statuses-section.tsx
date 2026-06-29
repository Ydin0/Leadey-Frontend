"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2, Lock, Eye, EyeOff, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeadStatuses } from "@/lib/hooks/use-lead-statuses";
import { saveCustomLeadStatuses } from "@/lib/api/lead-statuses";
import {
  BUILTIN_STATUS_OPTIONS,
  STATUS_COLOR_DOT,
  slugifyStatusKey,
  type LeadStatusColor,
} from "@/lib/utils/lead-status";

// "New" is the default status every lead starts in — it can't be hidden.
const PROTECTED_STATUS_KEYS = new Set(["new"]);

const COLORS: LeadStatusColor[] = [
  "slate",
  "blue",
  "green",
  "red",
  "amber",
  "violet",
];

// A single row in the ordered list — either a built-in or a custom status.
type StatusRow = {
  key?: string;
  label: string;
  color: LeadStatusColor;
  isTerminal: boolean;
  isBuiltIn: boolean;
};

export function LeadStatusesSection() {
  const { statuses, loading, reload } = useLeadStatuses();

  // The ordered, visible statuses (built-ins not hidden + custom), exactly as
  // they'll appear in every status picker. Seeded from the server's merged
  // list, which is already returned in the saved order.
  const [rows, setRows] = useState<StatusRow[]>([]);
  // Built-in statuses the org has hidden = the built-ins missing from the
  // merged list the backend returns (it filters hidden ones out).
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState<LeadStatusColor>("blue");
  const [newTerminal, setNewTerminal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // Seed from the loaded statuses whenever they change (initial load + reload).
  useEffect(() => {
    setRows(
      statuses.map((s) => ({
        key: s.key,
        label: s.label,
        color: s.color,
        isTerminal: s.isTerminal,
        isBuiltIn: s.isBuiltIn,
      })),
    );
    const visible = new Set(statuses.filter((s) => s.isBuiltIn).map((s) => s.key));
    setHiddenKeys(
      new Set(BUILTIN_STATUS_OPTIONS.filter((b) => !visible.has(b.key)).map((b) => b.key)),
    );
  }, [statuses]);

  function touched() {
    setSaved(false);
  }

  function moveRow(from: number, to: number) {
    if (from === to) return;
    setRows((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    touched();
  }

  function updateRow(index: number, patch: Partial<StatusRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    touched();
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
    touched();
  }

  function hideBuiltIn(index: number) {
    const row = rows[index];
    if (!row?.key || PROTECTED_STATUS_KEYS.has(row.key)) return;
    setHiddenKeys((prev) => new Set(prev).add(row.key!));
    removeRow(index);
  }

  function showBuiltIn(key: string) {
    const def = BUILTIN_STATUS_OPTIONS.find((b) => b.key === key);
    if (!def) return;
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setRows((prev) => [
      ...prev,
      { key: def.key, label: def.label, color: def.color, isTerminal: def.isTerminal, isBuiltIn: true },
    ]);
    touched();
  }

  function addStatus() {
    const label = newLabel.trim();
    if (!label) return;
    setRows((prev) => [
      ...prev,
      { label, color: newColor, isTerminal: newTerminal, isBuiltIn: false },
    ]);
    setNewLabel("");
    setNewColor("blue");
    setNewTerminal(false);
    touched();
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const custom = rows
        .filter((r) => !r.isBuiltIn)
        .map((r) => ({ key: r.key, label: r.label, color: r.color, isTerminal: r.isTerminal }));
      // Full key order across built-in + custom. New custom rows have no key
      // yet — predict it with the same slug the backend will assign.
      const order = rows.map((r) => r.key || slugifyStatusKey(r.label));
      await saveCustomLeadStatuses(custom, [...hiddenKeys], order);
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

  const hiddenList = BUILTIN_STATUS_OPTIONS.filter((b) => hiddenKeys.has(b.key));

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[14px] font-semibold text-ink">Lead Statuses</h3>
          <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
            {rows.length} shown{hiddenList.length > 0 ? ` · ${hiddenList.length} hidden` : ""}
          </span>
        </div>
        <p className="text-[11px] text-ink-muted mb-4">
          Lead statuses represent a lead&apos;s current relationship to your company.
          Drag to reorder — the dropdown across funnels and the cold-calling view
          shows them in this exact order. Rename or recolour your custom statuses,
          hide built-ins you don&apos;t use, and add your own below.
        </p>

        {/* Ordered list */}
        <div className="space-y-1.5">
          {rows.map((row, i) => {
            const protectedKey = row.isBuiltIn && !!row.key && PROTECTED_STATUS_KEYS.has(row.key);
            return (
              <div
                key={row.key ?? `new-${i}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOver !== i) setDragOver(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex.current !== null) moveRow(dragIndex.current, i);
                  dragIndex.current = null;
                  setDragOver(null);
                }}
                className={cn(
                  "flex items-center gap-2 py-2 px-2.5 rounded-[8px] border bg-section/40 transition-colors",
                  dragOver === i ? "border-signal-blue-text/50 bg-signal-blue/10" : "border-border-subtle",
                )}
              >
                {/* Drag handle */}
                <span
                  draggable
                  onDragStart={() => { dragIndex.current = i; }}
                  onDragEnd={() => { dragIndex.current = null; setDragOver(null); }}
                  className="cursor-grab active:cursor-grabbing text-ink-faint hover:text-ink-muted shrink-0"
                  title="Drag to reorder"
                >
                  <GripVertical size={15} />
                </span>

                {/* Order number */}
                <span className="w-5 text-center text-[11px] font-medium text-ink-faint shrink-0">
                  {i + 1}
                </span>

                {/* Colour */}
                {row.isBuiltIn ? (
                  <span className="w-6 h-6 flex items-center justify-center shrink-0">
                    <span className={cn("w-2.5 h-2.5 rounded-full", STATUS_COLOR_DOT[row.color])} />
                  </span>
                ) : (
                  <ColorPicker value={row.color} onChange={(c) => updateRow(i, { color: c })} />
                )}

                {/* Label */}
                {row.isBuiltIn ? (
                  <span className="flex-1 text-[12px] font-medium text-ink">{row.label}</span>
                ) : (
                  <input
                    value={row.label}
                    onChange={(e) => updateRow(i, { label: e.target.value })}
                    className="flex-1 px-2 py-1 rounded-[6px] bg-surface border border-border-subtle text-[12px] text-ink focus:outline-none focus:border-border-default"
                  />
                )}

                {/* Terminal */}
                {row.isBuiltIn ? (
                  row.isTerminal && (
                    <span className="text-[9px] uppercase tracking-wide text-ink-faint shrink-0">end</span>
                  )
                ) : (
                  <label className="flex items-center gap-1.5 text-[11px] text-ink-secondary cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={row.isTerminal}
                      onChange={(e) => updateRow(i, { isTerminal: e.target.checked })}
                      className="accent-signal-blue-text"
                    />
                    Terminal
                  </label>
                )}

                {/* Action: hide (built-in) / delete (custom) */}
                {row.isBuiltIn ? (
                  protectedKey ? (
                    <span className="p-1.5 text-ink-faint shrink-0" title="The default status can't be hidden">
                      <Lock size={12} />
                    </span>
                  ) : (
                    <button
                      onClick={() => hideBuiltIn(i)}
                      title="Hide this status"
                      className="p-1.5 rounded-md text-ink-muted hover:bg-hover hover:text-ink transition-colors shrink-0"
                    >
                      <EyeOff size={13} />
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => removeRow(i)}
                    title="Remove status"
                    className="p-1.5 rounded-md text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10 transition-colors shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add new status */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
          <span className="w-5 shrink-0" />
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

        {/* Hidden built-ins — click to restore */}
        {hiddenList.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border-subtle">
            <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
              Hidden statuses
            </p>
            <div className="flex flex-wrap gap-2">
              {hiddenList.map((s) => (
                <button
                  key={s.key}
                  onClick={() => showBuiltIn(s.key)}
                  title="Show this status"
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-full border border-border-subtle bg-transparent text-[11px] font-medium text-ink-faint hover:bg-hover hover:text-ink-secondary transition-colors"
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full opacity-40", STATUS_COLOR_DOT[s.color])} />
                  <span className="line-through">{s.label}</span>
                  <Eye size={11} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Save bar */}
        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            Save changes
          </button>
          {error && <span className="text-[11px] text-signal-red-text">{error}</span>}
          {saved && <span className="text-[11px] text-signal-green-text">Statuses saved.</span>}
        </div>
        <p className="text-[10px] text-ink-faint mt-2">
          Mark a status as <span className="font-medium">Terminal</span> to treat
          leads in it as finished (hidden from active queues).
        </p>
      </div>
    </div>
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
