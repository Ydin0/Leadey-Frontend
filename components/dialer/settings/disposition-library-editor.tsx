"use client";

import { useEffect, useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  getDispositions,
  createDisposition,
  updateDisposition,
  deleteDisposition,
} from "@/lib/api/dialer";
import type { CallDisposition, FunnelAction } from "@/lib/types/dialer";

const BUCKET_OPTIONS = [
  { value: "contacted", label: "Contacted" },
  { value: "not_contacted", label: "Not contacted" },
  { value: "negative", label: "Negative" },
];

const ACTION_OPTIONS: Array<{ value: FunnelAction; label: string }> = [
  { value: "advance", label: "Advance to next step" },
  { value: "retry", label: "Retry on this step" },
  { value: "drop", label: "Drop (mark lost)" },
  { value: "none", label: "No funnel action" },
];

export function DispositionLibraryEditor() {
  const [rows, setRows] = useState<CallDisposition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const list = await getDispositions();
      setRows(list);
    } catch (err: any) {
      setError(err?.message || "Failed to load dispositions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  async function handleField(
    id: string,
    field: keyof CallDisposition,
    value: unknown,
  ) {
    setSaving(id);
    setError(null);
    // Optimistic local update
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } as CallDisposition : r)));
    try {
      await updateDisposition(id, { [field]: value } as Partial<CallDisposition>);
    } catch (err: any) {
      setError(err?.message || "Update failed");
      void reload();
    } finally {
      setSaving(null);
    }
  }

  async function handleAdd() {
    setSaving("new");
    setError(null);
    try {
      const created = await createDisposition({
        slug: `custom-${Date.now().toString(36)}`,
        label: "New disposition",
        outcomeBucket: "contacted",
        funnelAction: "none",
      });
      setRows((prev) => [...prev, created]);
    } catch (err: any) {
      setError(err?.message || "Create failed");
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(id: string) {
    setSaving(id);
    try {
      await deleteDisposition(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      setError(err?.message || "Delete failed");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={16} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="px-3 py-2 rounded-[8px] bg-signal-red/10 text-[11px] text-signal-red-text">
          {error}
        </div>
      )}
      <div className="rounded-[10px] border border-border-subtle overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_180px_70px_70px_36px] gap-2 px-3 py-2 bg-section text-[10px] uppercase tracking-wider text-ink-muted font-medium">
          <span>Label / Slug</span>
          <span>Bucket</span>
          <span>Funnel Action</span>
          <span>Retry days</span>
          <span>Hotkey</span>
          <span />
        </div>
        {rows.map((d) => (
          <div
            key={d.id}
            className="grid grid-cols-[1fr_120px_180px_70px_70px_36px] gap-2 px-3 py-2 border-t border-border-subtle items-center"
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <input
                value={d.label}
                onChange={(e) => handleField(d.id, "label", e.target.value)}
                className="text-[12px] text-ink bg-transparent outline-none border-b border-transparent focus:border-border-default"
              />
              <span className="text-[10px] font-mono text-ink-muted truncate">{d.slug}{d.isSystem && " · system"}</span>
            </div>
            <NativeSelect
              value={d.outcomeBucket}
              onChange={(e) => handleField(d.id, "outcomeBucket", e.target.value)}
              className="text-[11px] text-ink bg-section rounded-[6px] px-2 py-1 outline-none"
            >
              {BUCKET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </NativeSelect>
            <NativeSelect
              value={d.funnelAction}
              onChange={(e) => handleField(d.id, "funnelAction", e.target.value)}
              className="text-[11px] text-ink bg-section rounded-[6px] px-2 py-1 outline-none"
            >
              {ACTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </NativeSelect>
            <input
              type="number"
              min={0}
              value={d.retryAfterDays ?? ""}
              onChange={(e) =>
                handleField(d.id, "retryAfterDays", e.target.value === "" ? null : Number(e.target.value))
              }
              disabled={d.funnelAction !== "retry"}
              className="text-[11px] text-ink bg-section rounded-[6px] px-2 py-1 outline-none disabled:opacity-30"
            />
            <input
              value={d.hotkey ?? ""}
              maxLength={1}
              onChange={(e) => handleField(d.id, "hotkey", e.target.value || null)}
              className="text-[11px] text-ink bg-section rounded-[6px] px-2 py-1 outline-none text-center font-mono"
            />
            <div className="flex items-center justify-end">
              {saving === d.id ? (
                <Loader2 size={12} className="animate-spin text-ink-muted" />
              ) : d.isSystem ? (
                <span className="text-[10px] text-ink-faint">—</span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleDelete(d.id)}
                  className="p-1 rounded text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={saving !== null}
        className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover disabled:opacity-50"
      >
        <Plus size={11} /> Add disposition
      </button>
    </div>
  );
}
