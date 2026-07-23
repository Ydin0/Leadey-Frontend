"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, GripVertical, Eye, EyeOff, Plus, Search, RotateCcw, Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { LB_GROUP_ORDER, type LbColumn, type LbGroup } from "@/lib/team/leaderboard-columns";

/** Leaderboard column picker — mirrors the campaign lead-view Columns drawer
 *  exactly (same slide-over, Shown/Available lists, drag-reorder), but persists
 *  the layout org-wide (managers/admins). */
interface Props {
  open: boolean;
  onClose: () => void;
  resolved: { col: LbColumn; visible: boolean }[];
  onChange: (order: string[], hidden: string[]) => void;
  onReset: () => void;
  onSave: () => void;
  saved?: boolean;
  canSave?: boolean;
}

function reorderVisible(order: string[], hiddenSet: Set<string>, fromKey: string, toKey: string): string[] {
  const visible = order.filter((k) => !hiddenSet.has(k));
  const from = visible.indexOf(fromKey);
  if (from === -1) return order;
  visible.splice(from, 1);
  const to = toKey === "__end__" ? visible.length : visible.indexOf(toKey);
  visible.splice(to === -1 ? visible.length : to, 0, fromKey);
  let vi = 0;
  return order.map((k) => (hiddenSet.has(k) ? k : visible[vi++]));
}

export function LeaderboardColumnsDrawer({ open, onClose, resolved, onChange, onReset, onSave, saved, canSave }: Props) {
  const [query, setQuery] = useState("");
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  // Render into <body> via a portal so `position: fixed` is anchored to the
  // viewport — the leaderboard lives inside a `.fade` container whose animation
  // establishes a transform containing-block, which otherwise left the closed
  // drawer peeking in from the right edge.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const order = useMemo(() => resolved.map((r) => r.col.key), [resolved]);
  const hiddenSet = useMemo(() => new Set(resolved.filter((r) => !r.visible).map((r) => r.col.key)), [resolved]);

  const shown = resolved.filter((r) => r.visible);
  const q = query.trim().toLowerCase();
  const matches = (c: LbColumn) => !q || c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q);

  const hiddenByGroup = useMemo(() => {
    const map = new Map<LbGroup, LbColumn[]>();
    for (const { col, visible } of resolved) {
      if (visible || !matches(col)) continue;
      if (!map.has(col.group)) map.set(col.group, []);
      map.get(col.group)!.push(col);
    }
    return map;
  }, [resolved, q]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(key: string, makeHidden: boolean) {
    const next = new Set(hiddenSet);
    if (makeHidden) next.add(key); else next.delete(key);
    onChange(order, [...next]);
  }
  function commitReorder(fromKey: string, toKey: string) {
    if (fromKey === toKey) return;
    onChange(reorderVisible(order, hiddenSet, fromKey, toKey), [...hiddenSet]);
  }

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className={cn(
          "fixed inset-0 z-[65] bg-black/50 backdrop-blur-[3px] transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed top-0 right-0 z-[70] h-full w-[360px] max-w-[88vw] bg-surface border-l border-border-subtle shadow-2xl flex flex-col transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!open}
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-border-subtle shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Columns</h2>
            <p className="text-[11.5px] text-ink-muted mt-0.5">Choose, reorder &amp; save the columns shown on the leaderboard.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-ink-muted hover:bg-hover hover:text-ink transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-3 shrink-0">
          <div className="relative">
            <Search size={13} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search columns…"
              className="w-full pl-8 pr-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <div className="mb-5">
            <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold mb-2">Shown · {shown.length}</div>
            <div className="flex flex-col gap-1">
              {shown.filter((r) => matches(r.col)).map(({ col }) => (
                <div
                  key={col.key}
                  draggable
                  onDragStart={() => setDragKey(col.key)}
                  onDragEnd={() => { setDragKey(null); setOverKey(null); }}
                  onDragOver={(e) => { e.preventDefault(); if (overKey !== col.key) setOverKey(col.key); }}
                  onDrop={(e) => { e.preventDefault(); if (dragKey) commitReorder(dragKey, col.key); setDragKey(null); setOverKey(null); }}
                  className={cn(
                    "group flex items-center gap-2 px-2 py-1.5 rounded-[8px] border bg-surface transition-colors",
                    dragKey === col.key ? "opacity-40" : "",
                    overKey === col.key && dragKey && dragKey !== col.key ? "border-accent bg-accent/5" : "border-border-subtle",
                  )}
                >
                  <GripVertical size={14} className="text-ink-faint cursor-grab active:cursor-grabbing shrink-0" />
                  <span className="text-[12px] text-ink font-medium truncate flex-1">{col.label}</span>
                  <span className="text-[9px] text-ink-faint uppercase tracking-wide">{col.group}</span>
                  <button onClick={() => toggle(col.key, true)} title="Hide column" className="p-1 rounded-md text-ink-muted hover:bg-hover hover:text-ink transition-colors shrink-0">
                    <EyeOff size={13} />
                  </button>
                </div>
              ))}
              {dragKey && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setOverKey("__end__"); }}
                  onDrop={(e) => { e.preventDefault(); if (dragKey) commitReorder(dragKey, "__end__"); setDragKey(null); setOverKey(null); }}
                  className={cn("h-6 rounded-[8px] border border-dashed", overKey === "__end__" ? "border-accent bg-accent/5" : "border-border-subtle/60")}
                />
              )}
              {shown.length === 0 && <p className="text-[11px] text-ink-faint px-1 py-2">No columns shown — add some below.</p>}
            </div>
          </div>

          {LB_GROUP_ORDER.map((group) => {
            const cols = hiddenByGroup.get(group);
            if (!cols || cols.length === 0) return null;
            return (
              <div key={group} className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold mb-2">{group}</div>
                <div className="flex flex-col gap-1">
                  {cols.map((col) => (
                    <button
                      key={col.key}
                      onClick={() => toggle(col.key, false)}
                      className="group flex items-center gap-2 px-2 py-1.5 rounded-[8px] border border-border-subtle hover:border-border-default hover:bg-hover transition-colors text-left"
                    >
                      <Plus size={13} className="text-ink-muted shrink-0" />
                      <span className="text-[12px] text-ink-secondary truncate flex-1">{col.label}</span>
                      <Eye size={13} className="text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3.5 border-t border-border-subtle shrink-0 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <button onClick={onReset} className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-muted hover:text-ink transition-colors">
              <RotateCcw size={12} /> Reset to default
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-signal-green-text">
                <Check size={12} /> Saved for everyone
              </span>
            )}
          </div>
          {canSave && (
            <button onClick={onSave} className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[20px] bg-ink text-on-ink text-[11.5px] font-medium hover:opacity-90 transition-opacity">
              <Users size={12} /> Save for everyone
            </button>
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}
