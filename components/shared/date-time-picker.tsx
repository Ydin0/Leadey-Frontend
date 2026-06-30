"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, CalendarClock, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const POPOVER_W = 260;
const POPOVER_H = 380;

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function fmt(d: Date): string {
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

/** A Leadey-styled date + time picker (replaces the browser-default
 *  <input type="datetime-local">). Emits an ISO string, or null when cleared. */
export function DateTimePicker({
  value, onChange, placeholder = "Set date & time", className,
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const selected = value ? new Date(value) : null;
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfDay(selected ?? new Date()));

  // Position the (portaled, fixed) popover relative to the trigger, flipping to
  // stay fully on-screen — so it's never clipped by an overflow-hidden card.
  const reposition = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - POPOVER_W - 8);
    const below = r.bottom + 6;
    const top = below + POPOVER_H > window.innerHeight ? Math.max(8, r.top - POPOVER_H - 6) : below;
    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, reposition]);

  // 6-week grid of days for the displayed month.
  const days = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay()); // back up to the Sunday
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [viewMonth]);

  // Current time parts (default to 9:00 AM when no value yet).
  const base = selected ?? (() => { const d = new Date(); d.setHours(9, 0, 0, 0); return d; })();
  const hour24 = base.getHours();
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minute = base.getMinutes();
  const isPM = hour24 >= 12;

  function emit(next: Date) { onChange(next.toISOString()); }

  function pickDay(day: Date) {
    const d = new Date(selected ?? base);
    d.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    if (!selected) d.setHours(9, 0, 0, 0);
    emit(d);
  }
  function setTime(h12: number, m: number, pm: boolean) {
    const d = new Date(selected ?? base);
    const h24 = (h12 % 12) + (pm ? 12 : 0);
    d.setHours(h24, m, 0, 0);
    emit(d);
  }

  const today = startOfDay(new Date());

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
          selected
            ? "bg-section border-border-subtle text-ink-secondary hover:bg-hover"
            : "bg-section border-border-subtle text-ink-faint hover:bg-hover",
        )}
      >
        <CalendarClock size={12} className="text-ink-muted shrink-0" />
        <span className="whitespace-nowrap">{selected ? fmt(selected) : placeholder}</span>
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: POPOVER_W }}
          className="z-[80] bg-surface rounded-[12px] border border-border-subtle shadow-xl p-3">
          {/* Month header */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
              className="p-1 rounded-md text-ink-muted hover:bg-hover"><ChevronLeft size={14} /></button>
            <span className="text-[12px] font-semibold text-ink">{MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}</span>
            <button type="button" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
              className="p-1 rounded-md text-ink-muted hover:bg-hover"><ChevronRight size={14} /></button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map((w) => <span key={w} className="text-center text-[9px] uppercase tracking-wide text-ink-faint">{w}</span>)}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d, i) => {
              const inMonth = d.getMonth() === viewMonth.getMonth();
              const isSel = selected && sameDay(d, selected);
              const isToday = sameDay(d, today);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickDay(d)}
                  className={cn(
                    "h-7 rounded-[6px] text-[11px] transition-colors",
                    isSel ? "bg-ink text-on-ink font-semibold"
                      : inMonth ? "text-ink-secondary hover:bg-hover" : "text-ink-faint hover:bg-hover",
                    !isSel && isToday && "ring-1 ring-inset ring-signal-blue-text/40",
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Time row */}
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border-subtle">
            <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Time</span>
            <div className="flex items-center gap-1 ml-auto">
              <MiniSelect value={hour12} options={Array.from({ length: 12 }, (_, i) => i + 1)} format={(n) => String(n)} onChange={(h) => setTime(h, minute, isPM)} />
              <span className="text-ink-muted">:</span>
              <MiniSelect value={minute} options={Array.from({ length: 12 }, (_, i) => i * 5)} format={(n) => String(n).padStart(2, "0")} onChange={(m) => setTime(hour12, m, isPM)} />
              <div className="flex rounded-[6px] border border-border-subtle overflow-hidden ml-0.5">
                {(["AM", "PM"] as const).map((ap) => (
                  <button key={ap} type="button" onClick={() => setTime(hour12, minute, ap === "PM")}
                    className={cn("px-1.5 py-1 text-[10px] font-medium", (ap === "PM") === isPM ? "bg-ink text-on-ink" : "bg-section text-ink-muted hover:bg-hover")}>
                    {ap}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2.5">
            <button type="button" onClick={() => { onChange(null); setOpen(false); }}
              className="text-[11px] text-ink-muted hover:text-signal-red-text transition-colors">Clear</button>
            <button type="button" onClick={() => setOpen(false)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-[14px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90"><Check size={11} /> Done</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/** Tiny styled numeric dropdown (hour / minute) — no native <NativeSelect>. */
function MiniSelect({ value, options, format, onChange }: {
  value: number; options: number[]; format: (n: number) => string; onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-9 px-1.5 py-1 rounded-[6px] bg-section border border-border-subtle text-[11px] text-ink text-center hover:bg-hover">
        {format(value)}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 max-h-40 overflow-y-auto bg-surface rounded-[8px] border border-border-subtle shadow-lg py-1 w-12">
          {options.map((o) => (
            <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }}
              className={cn("w-full px-2 py-1 text-[11px] text-center hover:bg-hover", o === value ? "text-ink font-semibold bg-hover/50" : "text-ink-secondary")}>
              {format(o)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
