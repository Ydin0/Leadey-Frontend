"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Video, ChevronRight, Check, X, CircleDashed, HelpCircle } from "lucide-react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getLeadMeetings } from "@/lib/api/calendar";
import type { LeadMeeting, MeetingResponseStatus } from "@/lib/types/calendar";
import { Section } from "./lead-section";

const SOURCE_LABEL: Record<LeadMeeting["source"], string> = {
  google: "Google Calendar",
  outlook: "Outlook",
  calendly: "Calendly",
};

const RSVP: Record<MeetingResponseStatus, { label: string; icon: typeof Check; className: string }> = {
  accepted: { label: "Accepted", icon: Check, className: "bg-signal-green/15 text-signal-green-text" },
  declined: { label: "Declined", icon: X, className: "bg-signal-red/15 text-signal-red-text" },
  tentative: { label: "Tentative", icon: HelpCircle, className: "bg-signal-amber/15 text-signal-amber-text" },
  needsAction: { label: "No response", icon: CircleDashed, className: "bg-signal-slate/15 text-signal-slate-text" },
};

/** Marker for the lead's RSVP to a meeting. Hidden when unknown. */
function RsvpBadge({ status }: { status: MeetingResponseStatus | null }) {
  if (!status) return null;
  const cfg = RSVP[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0 ${cfg.className}`}>
      <Icon size={10} strokeWidth={2.5} /> {cfg.label}
    </span>
  );
}

/** Human date+time, e.g. "Tue, Jul 1 · 2:30 PM". Marks today/tomorrow. */
function meetingWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay(d, now)) return `Today · ${time}`;
  if (sameDay(d, tomorrow)) return `Tomorrow · ${time}`;
  const date = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return `${date} · ${time}`;
}

/** Upcoming meetings for the lead — synced from a rep's connected Google/Outlook
 *  calendar (matched by attendee email) plus any Calendly booking for this lead. */
export function LeadUpcomingMeetingsSection({ funnelId, leadId }: { funnelId: string; leadId: string }) {
  const isAuthReady = useAuthReady();
  const [meetings, setMeetings] = useState<LeadMeeting[]>([]);
  const [calendarConnected, setCalendarConnected] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getLeadMeetings(funnelId, leadId);
      setMeetings(res.meetings);
      setCalendarConnected(res.calendarConnected);
    } catch {
      // leave prior state
    } finally {
      setLoaded(true);
    }
  }, [funnelId, leadId]);

  useEffect(() => {
    if (!isAuthReady) return;
    void load();
  }, [isAuthReady, load]);

  return (
    <Section icon={CalendarClock} title="Upcoming meetings" count={meetings.length || null}>
      <div className="flex flex-col gap-1.5">
        {meetings.length === 0 ? (
          <p className="text-[12px] text-ink-faint px-1">
            {!loaded
              ? "Loading…"
              : !calendarConnected
                ? "No upcoming meetings. Connect a calendar in Settings → Email Accounts to detect meetings automatically."
                : "No upcoming meetings with this lead."}
          </p>
        ) : (
          meetings.map((m) => (
            <div key={m.id} className="flex items-start gap-2.5 py-1.5 px-1 rounded-lg hover:bg-hover/50">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-signal-blue/15 text-signal-blue-text shrink-0 mt-0.5">
                <CalendarClock size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[12.5px] text-ink-secondary leading-snug truncate min-w-0">{m.title}</p>
                  <RsvpBadge status={m.responseStatus} />
                </div>
                <p className="text-[10.5px] text-ink-muted mt-0.5">
                  {meetingWhen(m.startTime)}
                  <span className="text-ink-faint"> · {SOURCE_LABEL[m.source]}</span>
                </p>
                {m.joinUrl && (
                  <a
                    href={m.joinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-signal-blue-text hover:underline mt-1"
                  >
                    <Video size={11} /> Join <ChevronRight size={11} />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Section>
  );
}
