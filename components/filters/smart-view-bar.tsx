"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bookmark, ChevronDown, Plus, Check, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSmartViews,
  createSmartView,
  updateSmartView,
  deleteSmartView,
  type SmartView,
} from "@/lib/api/smart-views";
import { activeConditionCount, EMPTY_FILTER, type FilterGroup } from "@/lib/types/lead-filter";

interface SmartViewBarProps {
  scope: "campaign" | "org";
  funnelId?: string;
  /** The live filter from the builder. */
  current: FilterGroup;
  onApply: (g: FilterGroup) => void;
}

const sameDef = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function SmartViewBar({ scope, funnelId, current, onApply }: SmartViewBarProps) {
  const [views, setViews] = useState<SmartView[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setViews(await getSmartViews(scope, funnelId));
    } catch (err) {
      console.error("Failed to load smart views:", err);
    }
  }, [scope, funnelId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setNaming(false); }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const active = views.find((v) => v.id === activeId) || null;
  const hasFilter = activeConditionCount(current) > 0;
  const dirty = active ? !sameDef(active.definition, current) : false;

  function select(v: SmartView) {
    setActiveId(v.id);
    onApply(v.definition || EMPTY_FILTER);
    setOpen(false);
  }

  async function saveNew() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const v = await createSmartView({ scope, funnelId, name: name.trim(), definition: current });
      await load();
      setActiveId(v.id);
      setNaming(false);
      setName("");
      setOpen(false);
    } catch (err) {
      console.error("Failed to save view:", err);
    } finally {
      setBusy(false);
    }
  }

  async function saveChanges() {
    if (!active) return;
    setBusy(true);
    try {
      await updateSmartView(active.id, { definition: current });
      await load();
    } catch (err) {
      console.error("Failed to update view:", err);
    } finally {
      setBusy(false);
    }
  }

  async function remove(v: SmartView) {
    setBusy(true);
    try {
      await deleteSmartView(v.id);
      if (activeId === v.id) setActiveId(null);
      await load();
    } catch (err) {
      console.error("Failed to delete view:", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[12px] font-medium transition-colors border",
          active
            ? "bg-signal-blue/10 text-signal-blue-text border-signal-blue-text/20"
            : "bg-surface text-ink-secondary border-border-subtle hover:bg-hover",
        )}
      >
        <Bookmark size={12} />
        {active ? active.name : "Smart Views"}
        {active && dirty && <span className="text-signal-blue-text" title="Unsaved changes">•</span>}
        <ChevronDown size={12} className={cn("text-ink-faint transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-[260px] bg-surface rounded-[10px] border border-border-subtle shadow-lg z-30 py-1">
          <button
            type="button"
            onClick={() => { setActiveId(null); onApply(EMPTY_FILTER); setOpen(false); }}
            className={cn("w-full flex items-center justify-between px-3 py-1.5 text-[12px] hover:bg-hover transition-colors", !active ? "text-ink font-medium" : "text-ink-secondary")}
          >
            All leads {!active && <Check size={12} className="text-signal-blue-text" />}
          </button>

          {views.length > 0 && <div className="my-1 border-t border-border-subtle" />}
          <div className="max-h-[220px] overflow-y-auto">
            {views.map((v) => (
              <div key={v.id} className="group flex items-center justify-between px-3 py-1.5 hover:bg-hover transition-colors">
                <button type="button" onClick={() => select(v)} className="flex-1 min-w-0 text-left flex items-center gap-1.5">
                  <span className={cn("text-[12px] truncate", active?.id === v.id ? "text-ink font-medium" : "text-ink-secondary")}>{v.name}</span>
                  {active?.id === v.id && <Check size={12} className="text-signal-blue-text shrink-0" />}
                </button>
                <button type="button" onClick={() => void remove(v)} disabled={busy} className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-signal-red-text transition-all shrink-0 ml-1" title="Delete view">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          <div className="my-1 border-t border-border-subtle" />
          {active && dirty && (
            <button type="button" onClick={() => void saveChanges()} disabled={busy} className="w-full text-left px-3 py-1.5 text-[12px] text-signal-blue-text hover:bg-hover transition-colors flex items-center gap-1.5">
              {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save changes to “{active.name}”
            </button>
          )}
          {naming ? (
            <div className="px-3 py-2 flex items-center gap-1.5">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void saveNew(); if (e.key === "Escape") setNaming(false); }}
                placeholder="View name"
                className="flex-1 min-w-0 bg-section border border-border-subtle rounded-md px-2 py-1 text-[11.5px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
              />
              <button type="button" onClick={() => void saveNew()} disabled={busy || !name.trim()} className="px-2 py-1 rounded-full bg-ink text-on-ink text-[10px] font-medium disabled:opacity-50">
                {busy ? <Loader2 size={10} className="animate-spin" /> : "Save"}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => { setNaming(true); setName(active && dirty ? "" : ""); }} disabled={!hasFilter} className="w-full text-left px-3 py-1.5 text-[12px] text-ink-secondary hover:bg-hover transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
              <Plus size={12} /> Save current as new view
            </button>
          )}
        </div>
      )}
    </div>
  );
}
