"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, GripVertical, EyeOff, Plus, RotateCcw, Users, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  METRIC_CATALOG, CATALOG_BY_ID, CATALOG_GROUPS, DEFAULT_CARD_IDS,
  type MetricCardDef, type MetricGroup,
} from "@/lib/team/metric-catalog";

/** Reorder `fromId` to just before `toId` (or the end) within `ids`. */
function reorder(ids: string[], fromId: string, toId: string): string[] {
  const next = ids.filter((x) => x !== fromId);
  const to = toId === "__end__" ? next.length : next.indexOf(toId);
  next.splice(to === -1 ? next.length : to, 0, fromId);
  return next;
}

export function AnalyticsCardsDrawer({ open, onClose, selected, onSave }: {
  open: boolean;
  onClose: () => void;
  selected: string[];
  onSave: (ids: string[]) => Promise<void> | void;
}) {
  // Local working copy — live preview of order/visibility; persisted on Save.
  const [ids, setIds] = useState<string[]>(selected);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Render into document.body so the fixed overlay escapes the team page's
  // transformed (.fade animation) ancestor — otherwise `fixed` is relative to
  // that ancestor and the closed drawer peeks in from the right edge.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => { if (open) { setIds(selected); setSaved(false); } }, [open, selected]);

  const shown = useMemo(() => ids.map((id) => CATALOG_BY_ID[id]).filter(Boolean) as MetricCardDef[], [ids]);
  const shownSet = useMemo(() => new Set(ids), [ids]);
  const hiddenByGroup = useMemo(() => {
    const map = new Map<MetricGroup, MetricCardDef[]>();
    for (const c of METRIC_CATALOG) {
      if (shownSet.has(c.id)) continue;
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    }
    return map;
  }, [shownSet]);

  const add = (id: string) => { setIds((p) => [...p, id]); setSaved(false); };
  const remove = (id: string) => { setIds((p) => p.filter((x) => x !== id)); setSaved(false); };
  const commitDrop = (from: string, to: string) => { if (from !== to) { setIds((p) => reorder(p, from, to)); setSaved(false); } };

  async function save() {
    setSaving(true);
    try { await onSave(ids); setSaved(true); }
    finally { setSaving(false); }
  }

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className={cn("fixed inset-0 z-[65] bg-black/50 backdrop-blur-[3px] transition-opacity duration-200", open ? "opacity-100" : "opacity-0 pointer-events-none")}
        onClick={onClose}
      />
      <aside
        className={cn("fixed top-0 right-0 z-[70] h-full w-[360px] max-w-[88vw] bg-surface border-l border-border-subtle shadow-2xl flex flex-col transition-transform duration-200", open ? "translate-x-0" : "translate-x-full")}
        aria-hidden={!open}
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-border-subtle shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Customize cards</h2>
            <p className="text-[11.5px] text-ink-muted mt-0.5">Choose &amp; reorder the stat cards your whole team sees.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-ink-muted hover:bg-hover hover:text-ink transition-colors"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 pt-3">
          {/* Shown (reorderable) */}
          <div className="mb-5">
            <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold mb-2">Shown · {shown.length}</div>
            <div className="flex flex-col gap-1">
              {shown.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => setDragId(c.id)}
                  onDragEnd={() => { setDragId(null); setOverId(null); }}
                  onDragOver={(e) => { e.preventDefault(); if (overId !== c.id) setOverId(c.id); }}
                  onDrop={(e) => { e.preventDefault(); if (dragId) commitDrop(dragId, c.id); setDragId(null); setOverId(null); }}
                  className={cn(
                    "group flex items-center gap-2 px-2 py-1.5 rounded-[8px] border bg-surface transition-colors",
                    dragId === c.id ? "opacity-40" : "",
                    overId === c.id && dragId && dragId !== c.id ? "border-accent bg-accent/5" : "border-border-subtle",
                  )}
                >
                  <GripVertical size={14} className="text-ink-faint cursor-grab active:cursor-grabbing shrink-0" />
                  <span className="text-[12px] text-ink font-medium truncate flex-1">{c.label}</span>
                  <span className="text-[9px] text-ink-faint uppercase tracking-wide">{c.group}</span>
                  <button onClick={() => remove(c.id)} title="Hide card" className="p-1 rounded-md text-ink-muted hover:bg-hover hover:text-ink transition-colors shrink-0">
                    <EyeOff size={13} />
                  </button>
                </div>
              ))}
              {dragId && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setOverId("__end__"); }}
                  onDrop={(e) => { e.preventDefault(); if (dragId) commitDrop(dragId, "__end__"); setDragId(null); setOverId(null); }}
                  className={cn("h-6 rounded-[8px] border border-dashed", overId === "__end__" ? "border-accent bg-accent/5" : "border-border-subtle/60")}
                />
              )}
              {shown.length === 0 && <p className="text-[11px] text-ink-faint px-1 py-2">No cards shown — add some below.</p>}
            </div>
          </div>

          {/* Available, grouped */}
          {CATALOG_GROUPS.map((group) => {
            const cols = hiddenByGroup.get(group);
            if (!cols || cols.length === 0) return null;
            return (
              <div key={group} className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold mb-2">{group}</div>
                <div className="flex flex-col gap-1">
                  {cols.map((c) => (
                    <button key={c.id} onClick={() => add(c.id)} className="group flex items-center gap-2 px-2 py-1.5 rounded-[8px] border border-border-subtle hover:border-border-default hover:bg-hover transition-colors text-left">
                      <Plus size={13} className="text-ink-muted shrink-0" />
                      <span className="text-[12px] text-ink-secondary truncate flex-1">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3.5 border-t border-border-subtle shrink-0 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <button onClick={() => { setIds(DEFAULT_CARD_IDS); setSaved(false); }} className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-muted hover:text-ink transition-colors">
              <RotateCcw size={12} /> Reset to default
            </button>
            {saved && <span className="inline-flex items-center gap-1 text-[11px] font-medium text-signal-green-text"><Check size={12} /> Saved for the team</span>}
          </div>
          <button onClick={save} disabled={saving} className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[20px] bg-ink text-on-ink text-[11.5px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />} Save for the whole team
          </button>
        </div>
      </aside>
    </>,
    document.body,
  );
}
