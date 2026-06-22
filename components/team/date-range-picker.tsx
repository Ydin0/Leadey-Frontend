"use client";

import React from "react";
import { Icon } from "./icon";
import { makeRange, fmtRange, type DayRange } from "@/lib/team/team-data";

const DAY_MS = 86400000;
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function midnight(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Monday-first 6-week grid of day cells for the given month. */
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  // JS getDay: 0=Sun..6=Sat → shift to Monday-first offset.
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => midnight(new Date(start.getTime() + i * DAY_MS)));
}

interface DateRangePickerProps {
  /** Active custom range, or null when a preset window is selected. */
  value: DayRange | null;
  /** Emit the chosen range, or null to clear back to presets. */
  onChange: (range: DayRange | null) => void;
  /** Earliest selectable day (data availability). */
  minDate: Date;
  /** Latest selectable day (today — no future). */
  maxDate: Date;
}

const QUICK: { label: string; days: number; single?: boolean }[] = [
  { label: "Today", days: 0, single: true },
  { label: "Yesterday", days: 1, single: true },
  { label: "Last 7 days", days: 6 },
  { label: "Last 30 days", days: 29 },
  { label: "Last 90 days", days: 89 },
];

export function DateRangePicker({ value, onChange, minDate, maxDate }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState(() => midnight(value?.end ?? maxDate));
  const [start, setStart] = React.useState<Date | null>(value?.start ?? null);
  const [end, setEnd] = React.useState<Date | null>(value?.end ?? null);
  const [hover, setHover] = React.useState<Date | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  const lo = midnight(minDate).getTime();
  const hi = midnight(maxDate).getTime();

  // Re-sync local draft + viewed month whenever the popover opens.
  React.useEffect(() => {
    if (!open) return;
    setStart(value?.start ?? null);
    setEnd(value?.end ?? null);
    setView(midnight(value?.end ?? maxDate));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const disabled = (d: Date) => d.getTime() < lo || d.getTime() > hi;

  function pick(d: Date) {
    if (disabled(d)) return;
    // First click (or restarting after a complete range) sets the start.
    if (!start || (start && end)) { setStart(d); setEnd(null); return; }
    // Second click sets the other bound (order-normalised).
    if (d.getTime() < start.getTime()) { setEnd(start); setStart(d); }
    else setEnd(d);
  }

  function applyQuick(q: { days: number; single?: boolean }) {
    const e = midnight(maxDate);
    if (q.single) {
      const day = new Date(e.getTime() - q.days * DAY_MS);
      onChange(makeRange(day, day));
    } else {
      const s = new Date(e.getTime() - q.days * DAY_MS);
      onChange(makeRange(s, e));
    }
    setOpen(false);
  }

  function apply() {
    if (!start) return;
    onChange(makeRange(start, end ?? start)); // only a start = single day
    setOpen(false);
  }
  function clear() {
    onChange(null);
    setOpen(false);
  }

  // Selection bounds for cell styling (include the live hover preview).
  const selLo = start ? start.getTime() : null;
  const selHi = end ? end.getTime() : (start && hover && hover.getTime() >= start.getTime() ? hover.getTime() : selLo);
  const inSel = (t: number) => selLo != null && selHi != null && t >= Math.min(selLo, selHi) && t <= Math.max(selLo, selHi);

  const grid = monthGrid(view.getFullYear(), view.getMonth());
  const canPrev = grid[0].getTime() > lo;
  const canNext = midnight(new Date(view.getFullYear(), view.getMonth() + 1, 1)).getTime() <= hi;

  const draftLabel = start ? fmtRange(makeRange(start, end ?? start)) : "Select a date or range";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className={"seg-btn" + (value ? " on" : "")}
        onClick={() => setOpen((o) => !o)}
        title="Pick a date or custom range"
        style={{
          border: "1px solid var(--border-subtle)", background: value ? "var(--surface)" : "var(--section)",
          color: value ? "var(--fg1)" : "var(--fg-muted)", borderRadius: 9999, padding: "6px 12px", gap: 6,
        }}
      >
        <Icon name="calendar" size={13} />
        {value ? fmtRange(value) : "Custom"}
        {value && <Icon name="chevron-down" size={12} />}
      </button>

      {open && (
        <div
          className="card"
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 60, width: 320, padding: 14,
            boxShadow: "0 12px 32px rgba(0,0,0,.28)",
          }}
        >
          {/* Quick ranges */}
          <div className="row" style={{ flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {QUICK.map((q) => (
              <button
                key={q.label}
                onClick={() => applyQuick(q)}
                className="pill pill-soft"
                style={{ fontSize: 11, padding: "5px 10px" }}
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Month nav */}
          <div className="between" style={{ marginBottom: 10 }}>
            <button
              onClick={() => canPrev && setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              disabled={!canPrev}
              style={{ padding: 6, borderRadius: 8, color: canPrev ? "var(--fg2)" : "var(--fg-faint)", opacity: canPrev ? 1 : 0.4, cursor: canPrev ? "pointer" : "default" }}
            >
              <Icon name="chevron-left" size={16} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg1)" }}>{MONTHS[view.getMonth()]} {view.getFullYear()}</span>
            <button
              onClick={() => canNext && setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              disabled={!canNext}
              style={{ padding: 6, borderRadius: 8, color: canNext ? "var(--fg2)" : "var(--fg-faint)", opacity: canNext ? 1 : 0.4, cursor: canNext ? "pointer" : "default" }}
            >
              <Icon name="chevron-right" size={16} />
            </button>
          </div>

          {/* Weekday header */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
            {WEEKDAYS.map((w) => (
              <div key={w} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: "var(--fg-faint)", padding: "2px 0" }}>{w}</div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
            {grid.map((d) => {
              const t = d.getTime();
              const off = d.getMonth() !== view.getMonth();
              const dis = disabled(d);
              const selected = inSel(t);
              const isEdge = (start && sameDay(d, start)) || (end && sameDay(d, end));
              const isToday = sameDay(d, midnight(maxDate));
              return (
                <button
                  key={t}
                  onClick={() => pick(d)}
                  onMouseEnter={() => setHover(d)}
                  onMouseLeave={() => setHover(null)}
                  disabled={dis}
                  style={{
                    height: 34, borderRadius: 8, fontSize: 12, position: "relative",
                    cursor: dis ? "default" : "pointer",
                    color: dis ? "var(--fg-faint)" : isEdge ? "var(--on-ink)" : off ? "var(--fg-faint)" : "var(--fg1)",
                    opacity: dis ? 0.35 : 1,
                    fontWeight: isEdge ? 600 : isToday ? 600 : 400,
                    background: isEdge ? "var(--accent)" : selected ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent",
                    border: isToday && !isEdge ? "1px solid var(--border-default)" : "1px solid transparent",
                    transition: "background .1s",
                  }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="between" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
            <span style={{ fontSize: 11, color: start ? "var(--fg2)" : "var(--fg-faint)" }}>{draftLabel}</span>
            <div className="row" style={{ gap: 8 }}>
              <button onClick={clear} className="pill pill-soft" style={{ fontSize: 11, padding: "5px 12px" }}>
                {value ? "Reset" : "Cancel"}
              </button>
              <button onClick={apply} disabled={!start} className="pill pill-primary" style={{ fontSize: 11, padding: "5px 12px", opacity: start ? 1 : 0.5 }}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
