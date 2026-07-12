"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Video, ChevronRight, X, Loader2 } from "lucide-react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getLeadMeetings } from "@/lib/api/calendar";
import { cancelMeeting } from "@/lib/api/meetings";
import type { LeadMeeting } from "@/lib/types/calendar";
import { SOURCE_LABEL, RsvpBadge, meetingWhen } from "@/components/calendar/meeting-bits";
import { Section } from "./lead-section";

/** Upcoming meetings for the lead — booked in Leadey, synced from a rep's
 *  connected Google/Outlook calendar (matched by attendee email), or Calendly.
 *  `refreshKey` bumps after a new booking to refetch. */
export function LeadUpcomingMeetingsSection({ funnelId, leadId, refreshKey }: { funnelId: string; leadId: string; refreshKey?: number }) {
  const isAuthReady = useAuthReady();
  const [meetings, setMeetings] = useState<LeadMeeting[]>([]);
  const [calendarConnected, setCalendarConnected] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

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
  }, [isAuthReady, load, refreshKey]);

  async function handleCancel(id: string) {
    if (!confirm("Cancel this meeting? Attendees will be notified.")) return;
    setCancelingId(id);
    try {
      await cancelMeeting(id);
      await load();
    } finally {
      setCancelingId(null);
    }
  }

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
                <div className="flex items-center gap-3 mt-1">
                  {m.joinUrl && (
                    <a
                      href={m.joinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-signal-blue-text hover:underline"
                    >
                      <Video size={11} /> Join <ChevronRight size={11} />
                    </a>
                  )}
                  {m.source === "leadey" && (
                    <button
                      onClick={() => handleCancel(m.id)}
                      disabled={cancelingId === m.id}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted hover:text-signal-red-text disabled:opacity-50"
                    >
                      {cancelingId === m.id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />} Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Section>
  );
}
