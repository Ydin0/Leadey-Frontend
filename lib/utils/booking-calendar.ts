// Shared date helpers for the booking calendars (lead modal + public page).

export const CAL_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const CAL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Monday-first 42-cell grid of the month, as UTC-midnight calendar days. */
export function monthGrid(year: number, month: number): Date[] {
  const firstDow = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month, 1 - firstDow));
  return Array.from({ length: 42 }, (_, i) => new Date(start.getTime() + i * 86_400_000));
}

export const dateKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

/** The calendar date (YYYY-MM-DD) a UTC instant falls on in a timezone. */
export function dateKeyInTz(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export function timeInTz(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
}

/** Group UTC-ISO slots into per-display-day buckets keyed YYYY-MM-DD. */
export function groupSlotsByTz(slots: string[], tz: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const iso of slots) {
    const k = dateKeyInTz(iso, tz);
    (map.get(k) ?? map.set(k, []).get(k)!).push(iso);
  }
  for (const arr of map.values()) arr.sort();
  return map;
}
