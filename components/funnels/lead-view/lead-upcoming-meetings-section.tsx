"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Video, ChevronRight, X, Loader2 } from "lucide-react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getLeadMeetings, setMeetingDisposition } from "@/lib/api/calendar";
import { cancelMeeting } from "@/lib/api/meetings";
import type { LeadMeeting, MeetingDisposition } from "@/lib/types/calendar";
import { SOURCE_LABEL, RsvpBadge, DispositionControl, meetingWhen } from "@/components/calendar/meeting-bits";
import { cn } from "@/lib/utils";
import { Section } from "./lead-section";

/** Meetings with the lead — booked in Leadey, synced from a rep's connected
 *  Google/Outlook calendar (matched by attendee email), or Calendly. Shows
 *  upcoming meetings plus recent past ones (greyed), where a rep can mark
 *  attended / no-show. `refreshKey` bumps after a new booking to refetch. */
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

  async function handleDispose(m: LeadMeeting, next: MeetingDisposition | null) {
    // Optimistic — patch the row, then persist.
    setMeetings((prev) => prev.map((x) => (x.id === m.id && x.source === m.source ? { ...x, disposition: next } : x)));
    try {
      await setMeetingDisposition(m.source, m.id, next);
    } catch {
      await load(); // revert to server truth on failure
    }
  }

  // Split into upcoming vs past (a meeting with no start time is treated as upcoming).
  const { upcoming, past } = useMemo(() => {
    const nowMs = Date.now();
    const up: LeadMeeting[] = [];
    const pa: LeadMeeting[] = [];
    for (const m of meetings) {
      const t = m.startTime ? new Date(m.startTime).getTime() : NaN;
      if (!Number.isNaN(t) && t < nowMs) pa.push(m);
      else up.push(m);
    }
    // Past newest-first; upcoming soonest-first (the feed is already sorted asc).
    pa.reverse();
    return { upcoming: up, past: pa };
  }, [meetings]);

  return (
    <Section icon={CalendarClock} title="Meetings" count={meetings.length || null}>
      <div className="flex flex-col gap-1.5">
        {meetings.length === 0 ? (
          <p className="text-[12px] text-ink-faint px-1">
            {!loaded
              ? "Loading…"
              : !calendarConnected
                ? "No meetings. Connect a calendar in Settings → Email Accounts to detect meetings automatically."
                : "No meetings with this lead."}
          </p>
        ) : (
          <>
            {upcoming.map((m) => (
              <MeetingRow key={`${m.source}:${m.id}`} m={m} onCancel={handleCancel} cancelingId={cancelingId} />
            ))}

            {past.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-wider text-ink-faint font-medium px-1 mt-2 mb-0.5">Past</p>
                {past.map((m) => (
                  <MeetingRow key={`${m.source}:${m.id}`} m={m} past onDispose={handleDispose} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </Section>
  );
}

function MeetingRow({
  m, past, onCancel, cancelingId, onDispose,
}: {
  m: LeadMeeting;
  past?: boolean;
  onCancel?: (id: string) => void;
  cancelingId?: string | null;
  onDispose?: (m: LeadMeeting, next: MeetingDisposition | null) => void;
}) {
  return (
    <div className={cn("flex items-start gap-2.5 py-1.5 px-1 rounded-lg hover:bg-hover/50", past && "opacity-75")}>
      <span
        className={cn(
          "flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5",
          past ? "bg-section text-ink-muted" : "bg-signal-blue/15 text-signal-blue-text",
        )}
      >
        <CalendarClock size={13} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className={cn("text-[12.5px] leading-snug truncate min-w-0", past ? "text-ink-muted" : "text-ink-secondary")}>{m.title}</p>
          {!past && <RsvpBadge status={m.responseStatus} />}
        </div>
        <p className="text-[10.5px] text-ink-muted mt-0.5">
          {meetingWhen(m.startTime)}
          <span className="text-ink-faint"> · {SOURCE_LABEL[m.source]}</span>
        </p>
        {past ? (
          <div className="mt-1.5">
            <DispositionControl disposition={m.disposition} onChange={(next) => onDispose?.(m, next)} size="xs" />
          </div>
        ) : (
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
            {m.source === "leadey" && onCancel && (
              <button
                onClick={() => onCancel(m.id)}
                disabled={cancelingId === m.id}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted hover:text-signal-red-text disabled:opacity-50"
              >
                {cancelingId === m.id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />} Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
