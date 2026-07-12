"use client";

import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WEEKDAYS, type WeeklyAvailability, type WeekdayKey, type TimeRange } from "@/lib/api/booking-pages";

/** Calendly-style weekly availability editor: each weekday can be toggled on
 *  and given one or more start–end time ranges. */
export function WeeklyHoursEditor({ value, onChange }: { value: WeeklyAvailability; onChange: (v: WeeklyAvailability) => void }) {
  const setDay = (key: WeekdayKey, ranges: TimeRange[]) => onChange({ ...value, [key]: ranges });

  return (
    <div className="rounded-[12px] border border-border-subtle divide-y divide-border-subtle">
      {WEEKDAYS.map(({ key, label }) => {
        const ranges = value[key] || [];
        const on = ranges.length > 0;
        return (
          <div key={key} className="flex items-start gap-3 px-3 py-2.5">
            <button
              type="button"
              onClick={() => setDay(key, on ? [] : [{ start: "09:00", end: "17:00" }])}
              className="w-[104px] shrink-0 flex items-center gap-2 pt-1"
            >
              <span className={cn("relative w-8 h-[18px] rounded-full transition-colors", on ? "bg-signal-green-text" : "bg-border-default")}>
                <span className={cn("absolute top-[2px] w-3.5 h-3.5 rounded-full bg-surface shadow-sm transition-all", on ? "left-[16px]" : "left-[2px]")} />
              </span>
              <span className={cn("text-[12px] font-medium", on ? "text-ink" : "text-ink-faint")}>{label.slice(0, 3)}</span>
            </button>

            <div className="flex-1 min-w-0">
              {!on ? (
                <span className="text-[11.5px] text-ink-faint block pt-1">Unavailable</span>
              ) : (
                <div className="space-y-1.5">
                  {ranges.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={r.start}
                        onChange={(e) => setDay(key, ranges.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
                        className="px-2 py-1 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink focus:outline-none focus:border-border-default"
                      />
                      <span className="text-ink-faint text-[12px]">–</span>
                      <input
                        type="time"
                        value={r.end}
                        onChange={(e) => setDay(key, ranges.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
                        className="px-2 py-1 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink focus:outline-none focus:border-border-default"
                      />
                      <button
                        type="button"
                        onClick={() => setDay(key, ranges.filter((_, j) => j !== i))}
                        className="p-1 rounded-md text-ink-muted hover:text-signal-red-text hover:bg-signal-red/10"
                        title="Remove"
                      >
                        <X size={13} />
                      </button>
                      {i === ranges.length - 1 && (
                        <button
                          type="button"
                          onClick={() => setDay(key, [...ranges, { start: "09:00", end: "17:00" }])}
                          className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-hover"
                          title="Add another range"
                        >
                          <Plus size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
