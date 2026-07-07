"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Video,
  MapPin,
  User,
  ArrowUpRight,
  CalendarClock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { listMeetings } from "@/lib/api/calendar";
import type { OrgMeeting } from "@/lib/types/calendar";
import { SOURCE_LABEL, RsvpBadge, meetingTime } from "@/components/calendar/meeting-bits";

const VIEW_KEY = "leadey:calendar-view";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_MS = 86400000;

type View = "month" | "week";
type Scope = "mine" | "org";

// ── date math (Monday-first, local time) ────────────────────────────
const midnight = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
/** Monday of the week containing d. */
function weekStart(d: Date): Date {
  const x = midnight(d);
  const dow = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - dow);
  return x;
}
/** Monday-first 42-cell grid covering the month of `anchor`. */
function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = weekStart(first);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getTime() + i * DAY_MS));
}

function rangeFor(view: View, anchor: Date): { from: Date; to: Date } {
  if (view === "week") {
    const from = weekStart(anchor);
    return { from, to: new Date(from.getTime() + 7 * DAY_MS - 1) };
  }
  const cells = monthGrid(anchor);
  return { from: cells[0], to: new Date(cells[41].getTime() + DAY_MS - 1) };
}

function headerLabel(view: View, anchor: Date): string {
  if (view === "month") return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
  const from = weekStart(anchor);
  const to = new Date(from.getTime() + 6 * DAY_MS);
  const f = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return from.getMonth() === to.getMonth()
    ? `${f(from)} – ${to.getDate()}, ${to.getFullYear()}`
    : `${f(from)} – ${f(to)}, ${to.getFullYear()}`;
}

// ── the shell ───────────────────────────────────────────────────────
export function CalendarShell() {
  const router = useRouter();
  const isAuthReady = useAuthReady();

  // Restore the last-used view synchronously (client component, lazy init).
  const [view, setView] = useState<View>(() => {
    if (typeof window === "undefined") return "month";
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "week" || v === "month") return v;
    } catch { /* storage unavailable */ }
    return "month";
  });
  const [scope, setScope] = useState<Scope>("mine");
  const [anchor, setAnchor] = useState<Date>(() => midnight(new Date()));
  const [meetings, setMeetings] = useState<OrgMeeting[]>([]);
  const [connected, setConnected] = useState({ calendar: true, calendly: true });
  const [loading, setLoading] = useState(true);
  const [popover, setPopover] = useState<{ meeting: OrgMeeting; x: number; y: number } | null>(null);

  // Minute tick for past-meeting styling (React Compiler: no Date.now() in render).
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0); // async first tick (no setState in effect body)
    const t = setInterval(tick, 60_000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, []);

  const pickView = (v: View) => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ }
  };

  const { from, to } = useMemo(() => rangeFor(view, anchor), [view, anchor]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listMeetings({ from, to, scope });
      setMeetings(res.meetings);
      setConnected({ calendar: res.calendarConnected, calendly: res.calendlyConnected });
    } catch {
      // keep prior data on transient errors
    } finally {
      setLoading(false);
    }
  }, [from.getTime(), to.getTime(), scope]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAuthReady) return;
    void load();
  }, [isAuthReady, load]);

  // ‹ › navigation (+ keyboard arrows).
  const step = useCallback((dir: -1 | 1) => {
    setAnchor((a) => {
      if (view === "week") return new Date(a.getTime() + dir * 7 * DAY_MS);
      return new Date(a.getFullYear(), a.getMonth() + dir, 1);
    });
  }, [view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "Escape") setPopover(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step]);

  // Group meetings by local day.
  const byDay = useMemo(() => {
    const map = new Map<string, OrgMeeting[]>();
    for (const m of meetings) {
      if (!m.startTime) continue;
      const k = dayKey(new Date(m.startTime));
      (map.get(k) ?? map.set(k, []).get(k)!).push(m);
    }
    for (const list of map.values()) list.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    return map;
  }, [meetings]);

  const openPopover = (m: OrgMeeting, e: React.MouseEvent) => {
    e.stopPropagation();
    // Clamp so the card never renders off-screen.
    const W = 320, H = 260;
    const x = Math.min(e.clientX, window.innerWidth - W - 16);
    const y = Math.min(e.clientY, window.innerHeight - H - 16);
    setPopover({ meeting: m, x, y });
  };

  const openDay = (d: Date) => { setAnchor(midnight(d)); pickView("week"); };

  const today = midnight(new Date());
  const nothingConnected = !connected.calendar && !connected.calendly;

  const segBtn = (active: boolean) =>
    cn(
      "px-3 py-1 rounded-full text-[11px] font-medium transition-colors",
      active ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
    );

  return (
    <div className="max-w-[1320px] mx-auto" onClick={() => setPopover(null)}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-9 h-9 rounded-[10px] bg-signal-blue/15 text-signal-blue-text">
            <CalendarDays size={17} strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="text-[18px] font-semibold text-ink leading-tight">Calendar</h1>
            <p className="text-[11.5px] text-ink-muted">
              {loading ? "Loading…" : `${meetings.length} meeting${meetings.length === 1 ? "" : "s"} in view`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => step(-1)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-section border border-border-subtle text-ink-secondary hover:bg-hover transition-colors"
            title="Previous (←)"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => setAnchor(midnight(new Date()))}
            className="px-3.5 py-1.5 rounded-full bg-section border border-border-subtle text-[11.5px] font-medium text-ink-secondary hover:bg-hover transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => step(1)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-section border border-border-subtle text-ink-secondary hover:bg-hover transition-colors"
            title="Next (→)"
          >
            <ChevronRight size={15} />
          </button>
          <span className="text-[14px] font-semibold text-ink min-w-[170px] text-center tabular-nums">
            {headerLabel(view, anchor)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-section rounded-full p-0.5 border border-border-subtle">
            <button className={segBtn(scope === "mine")} onClick={() => setScope("mine")}>Mine</button>
            <button className={segBtn(scope === "org")} onClick={() => setScope("org")}>Everyone</button>
          </div>
          <div className="flex items-center bg-section rounded-full p-0.5 border border-border-subtle">
            <button className={segBtn(view === "week")} onClick={() => pickView("week")}>Week</button>
            <button className={segBtn(view === "month")} onClick={() => pickView("month")}>Month</button>
          </div>
        </div>
      </div>

      {/* ── Empty state (nothing connected) ── */}
      {nothingConnected && !loading && meetings.length === 0 ? (
        <div className="card-brand bg-surface rounded-[14px] p-12 text-center max-w-2xl mx-auto">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 bg-signal-blue/15 text-signal-blue-text">
            <CalendarClock size={22} strokeWidth={1.5} />
          </div>
          <h3 className="text-[16px] font-semibold text-ink mb-1">No calendar connected</h3>
          <p className="text-[12px] text-ink-muted leading-[1.6] max-w-md mx-auto mb-5">
            Connect your Google or Outlook calendar — or Calendly — and meetings with your leads
            will appear here and on your Cockpit automatically.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Link href="/dashboard/settings?tab=email-accounts" className="px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors">
              Connect Google / Outlook
            </Link>
            <Link href="/dashboard/settings?tab=integrations" className="px-4 py-2 rounded-[20px] bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors">
              Connect Calendly
            </Link>
          </div>
        </div>
      ) : view === "month" ? (
        <MonthView anchor={anchor} today={today} now={now} byDay={byDay} loading={loading} onDayOpen={openDay} onMeetingClick={openPopover} />
      ) : (
        <WeekView anchor={anchor} today={today} now={now} byDay={byDay} loading={loading} onMeetingClick={openPopover} />
      )}

      {/* ── Meeting detail popover ── */}
      {popover && (
        <div
          className="fixed z-50 w-[320px] bg-surface rounded-[12px] border border-border-subtle shadow-xl p-4"
          style={{ left: popover.x, top: popover.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-2 mb-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-signal-blue/15 text-signal-blue-text shrink-0">
              <CalendarClock size={14} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink leading-snug">{popover.meeting.title || "Meeting"}</p>
              <p className="text-[11px] text-ink-muted mt-0.5">
                {popover.meeting.startTime &&
                  new Date(popover.meeting.startTime).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                {" · "}
                {meetingTime(popover.meeting.startTime)}
                {popover.meeting.endTime ? ` – ${meetingTime(popover.meeting.endTime)}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
            <RsvpBadge status={popover.meeting.responseStatus} />
            <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-section text-ink-muted">
              {SOURCE_LABEL[popover.meeting.source]}
            </span>
          </div>

          {(popover.meeting.leadName || popover.meeting.company) && (
            <p className="flex items-center gap-1.5 text-[11.5px] text-ink-secondary mb-1">
              <User size={11} className="text-ink-faint shrink-0" />
              {popover.meeting.leadName}
              {popover.meeting.company ? ` · ${popover.meeting.company}` : ""}
            </p>
          )}
          {popover.meeting.location && (
            <p className="flex items-center gap-1.5 text-[11.5px] text-ink-muted mb-1 truncate">
              <MapPin size={11} className="text-ink-faint shrink-0" /> {popover.meeting.location}
            </p>
          )}
          {popover.meeting.organizerEmail && (
            <p className="text-[10.5px] text-ink-faint mb-1 truncate">Organized by {popover.meeting.organizerEmail}</p>
          )}

          <div className="flex items-center gap-2 mt-3">
            {popover.meeting.joinUrl && (
              <a
                href={popover.meeting.joinUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
              >
                <Video size={12} /> Join meeting
              </a>
            )}
            {popover.meeting.funnelId && popover.meeting.leadId && (
              <button
                onClick={() => router.push(`/dashboard/funnels/${popover.meeting.funnelId}/leads/${popover.meeting.leadId}`)}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-[20px] bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors"
              >
                Open lead <ArrowUpRight size={11} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Month view ──────────────────────────────────────────────────────
function MonthView({
  anchor, today, now, byDay, loading, onDayOpen, onMeetingClick,
}: {
  anchor: Date; today: Date; now: number; byDay: Map<string, OrgMeeting[]>; loading: boolean;
  onDayOpen: (d: Date) => void;
  onMeetingClick: (m: OrgMeeting, e: React.MouseEvent) => void;
}) {
  const cells = monthGrid(anchor);
  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle overflow-hidden relative">
      {loading && (
        <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden">
          <div className="h-full w-1/3 bg-accent animate-pulse" />
        </div>
      )}
      <div className="grid grid-cols-7 border-b border-border-subtle">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-3 py-2 text-[10px] uppercase tracking-wider font-medium text-ink-muted text-center">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border-subtle">
        {cells.map((d) => {
          const inMonth = d.getMonth() === anchor.getMonth();
          const isToday = sameDay(d, today);
          const items = byDay.get(dayKey(d)) ?? [];
          return (
            <div
              key={d.getTime()}
              className={cn("bg-surface min-h-[110px] p-1.5 flex flex-col gap-1", !inMonth && "opacity-45")}
            >
              <button
                onClick={() => onDayOpen(d)}
                title="Open this week"
                className={cn(
                  "self-start flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-medium transition-colors",
                  isToday ? "bg-accent text-on-ink" : "text-ink-secondary hover:bg-hover",
                )}
              >
                {d.getDate()}
              </button>
              {items.slice(0, 3).map((m) => {
                const past = !!m.startTime && now > 0 && new Date(m.startTime).getTime() < now;
                return (
                  <button
                    key={m.id}
                    onClick={(e) => onMeetingClick(m, e)}
                    className={cn(
                      "flex items-center gap-1 w-full text-left rounded-[6px] px-1.5 py-1 text-[10.5px] font-medium truncate transition-colors",
                      past
                        ? "bg-section text-ink-faint hover:bg-hover"
                        : "bg-signal-blue/15 text-signal-blue-text hover:bg-signal-blue/25",
                    )}
                  >
                    <span className="tabular-nums shrink-0">{meetingTime(m.startTime)}</span>
                    <span className="truncate">{m.title || "Meeting"}</span>
                  </button>
                );
              })}
              {items.length > 3 && (
                <button
                  onClick={() => onDayOpen(d)}
                  className="self-start text-[10px] font-medium text-ink-muted hover:text-ink px-1.5"
                >
                  +{items.length - 3} more
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week view ───────────────────────────────────────────────────────
function WeekView({
  anchor, today, now, byDay, loading, onMeetingClick,
}: {
  anchor: Date; today: Date; now: number; byDay: Map<string, OrgMeeting[]>; loading: boolean;
  onMeetingClick: (m: OrgMeeting, e: React.MouseEvent) => void;
}) {
  const start = weekStart(anchor);
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * DAY_MS));
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 items-start">
      {days.map((d) => {
        const isToday = sameDay(d, today);
        const items = byDay.get(dayKey(d)) ?? [];
        return (
          <div
            key={d.getTime()}
            className={cn(
              "bg-surface rounded-[14px] border flex flex-col min-h-[220px]",
              isToday ? "border-accent/50" : "border-border-subtle",
            )}
          >
            <div className={cn("px-3 py-2.5 border-b border-border-subtle flex items-center justify-between", isToday && "bg-accent/5")}>
              <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isToday ? "text-accent" : "text-ink-muted")}>
                {WEEKDAYS[(d.getDay() + 6) % 7]}
              </span>
              <span
                className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full text-[11.5px] font-semibold tabular-nums",
                  isToday ? "bg-accent text-on-ink" : "text-ink-secondary",
                )}
              >
                {d.getDate()}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 p-2 flex-1">
              {loading && items.length === 0 ? (
                <div className="flex justify-center pt-6"><Loader2 size={13} className="animate-spin text-ink-faint" /></div>
              ) : items.length === 0 ? (
                <p className="text-[10.5px] text-ink-faint text-center pt-6">—</p>
              ) : (
                items.map((m) => {
                  const past = !!m.startTime && now > 0 && new Date(m.startTime).getTime() < now;
                  return (
                    <button
                      key={m.id}
                      onClick={(e) => onMeetingClick(m, e)}
                      className={cn(
                        "w-full text-left rounded-[10px] border px-2.5 py-2 transition-colors",
                        past
                          ? "border-border-subtle bg-section/40 hover:bg-hover"
                          : "border-signal-blue-text/20 bg-signal-blue/10 hover:bg-signal-blue/20",
                      )}
                    >
                      <div className={cn("text-[10.5px] font-medium tabular-nums", past ? "text-ink-faint" : "text-signal-blue-text")}>
                        {meetingTime(m.startTime)}
                        {m.endTime ? ` – ${meetingTime(m.endTime)}` : ""}
                      </div>
                      <div className={cn("text-[12px] font-medium leading-snug mt-0.5 line-clamp-2", past ? "text-ink-faint" : "text-ink")}>
                        {m.title || "Meeting"}
                      </div>
                      {(m.leadName || m.company) && (
                        <div className="text-[10.5px] text-ink-muted truncate mt-0.5">
                          {m.leadName}
                          {m.company ? ` · ${m.company}` : ""}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <RsvpBadge status={m.responseStatus} />
                        {m.joinUrl && !past && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-signal-blue-text">
                            <Video size={10} /> Join
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
