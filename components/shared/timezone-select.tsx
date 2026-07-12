"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { allTimezones, tzOffsetLabel } from "@/lib/utils/timezones";

interface TimezoneSelectProps {
  value: string;
  onChange: (tz: string) => void;
  /** Light palette for the public booking page's white card. */
  light?: boolean;
  className?: string;
  /** Align the dropdown to the trigger's right edge. */
  align?: "left" | "right";
}

/** Searchable, Leadey-styled timezone dropdown (replaces the giant native one). */
export function TimezoneSelect({ value, onChange, light, className, align = "left" }: TimezoneSelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const zones = useMemo(
    () => allTimezones().map((tz) => ({ tz, label: `${tz.replace(/_/g, " ")} (${tzOffsetLabel(tz)})` })),
    [],
  );
  const query = q.trim().toLowerCase();
  const filtered = query ? zones.filter((z) => z.label.toLowerCase().includes(query)) : zones;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const p = light
    ? {
        trigger: "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300",
        panel: "bg-white border-slate-200",
        searchWrap: "border-slate-100",
        search: "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400",
        opt: "text-slate-700 hover:bg-slate-100",
        optSel: "bg-indigo-50 text-indigo-700",
        chev: "text-slate-400",
        empty: "text-slate-400",
      }
    : {
        trigger: "bg-section border-border-subtle text-ink hover:border-border-default",
        panel: "bg-surface border-border-subtle",
        searchWrap: "border-border-subtle",
        search: "bg-section border-border-subtle text-ink placeholder:text-ink-faint",
        opt: "text-ink hover:bg-hover",
        optSel: "bg-accent/10 text-accent",
        chev: "text-ink-muted",
        empty: "text-ink-faint",
      };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setQ(""); }}
        className={cn("w-full flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[12px] transition-colors", p.trigger)}
      >
        <span className="truncate flex-1 text-left">{value.replace(/_/g, " ")} ({tzOffsetLabel(value)})</span>
        <ChevronDown size={13} className={p.chev} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 w-[260px] max-w-[80vw] rounded-[10px] border shadow-lg overflow-hidden",
            align === "right" ? "right-0" : "left-0",
            p.panel,
          )}
        >
          <div className={cn("sticky top-0 p-2 border-b", p.searchWrap, light ? "bg-white" : "bg-surface")}>
            <div className="relative">
              <Search size={13} className={cn("absolute left-2.5 top-1/2 -translate-y-1/2", p.chev)} />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search timezone…"
                className={cn("w-full pl-8 pr-2.5 py-1.5 rounded-[8px] border text-[12px] focus:outline-none", p.search)}
              />
            </div>
          </div>
          <div className="max-h-[240px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className={cn("px-3 py-2 text-[12px]", p.empty)}>No timezone found</p>
            ) : (
              filtered.slice(0, 300).map((z) => (
                <button
                  key={z.tz}
                  type="button"
                  onClick={() => { onChange(z.tz); setOpen(false); setQ(""); }}
                  className={cn("w-full flex items-center gap-2 text-left px-3 py-1.5 text-[12px] transition-colors", z.tz === value ? p.optSel : p.opt)}
                >
                  <span className="truncate flex-1">{z.label}</span>
                  {z.tz === value && <Check size={13} className="shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
