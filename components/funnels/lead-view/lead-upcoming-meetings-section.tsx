"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Video, ChevronRight } from "lucide-react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getLeadMeetings } from "@/lib/api/calendar";
import type { LeadMeeting } from "@/lib/types/calendar";
import { SOURCE_LABEL, RsvpBadge, meetingWhen } from "@/components/calendar/meeting-bits";
import { Section } from "./lead-section";

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
