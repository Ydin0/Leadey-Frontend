"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Video, ChevronRight, X, Loader2, Sparkles, FileText, Gauge, PlayCircle } from "lucide-react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getLeadMeetings, setMeetingDisposition } from "@/lib/api/calendar";
import { cancelMeeting } from "@/lib/api/meetings";
import { listLeadTranscripts, pullLeadTranscripts, type MeetingTranscript } from "@/lib/api/meeting-transcripts";
import type { LeadMeeting, MeetingDisposition } from "@/lib/types/calendar";
import { SOURCE_LABEL, RsvpBadge, DispositionControl, meetingWhen } from "@/components/calendar/meeting-bits";
import { MeetingDetailModal } from "./meeting-detail-modal";
import { cn } from "@/lib/utils";
import { Section } from "./lead-section";

const NEAR_MS = 2 * 60 * 60 * 1000; // transcript↔meeting time-match window

/** Meetings with the lead — booked in Leadey, synced from a rep's connected
 *  Google/Outlook calendar, or Calendly — merged with pulled Fathom/Fireflies
 *  recordings. Upcoming meetings show normally; past ones are greyed and can be
 *  marked attended / no-show, and any meeting with a recording shows a
 *  transcript badge that opens the playback + AI summary + call scorecard. */
export function LeadUpcomingMeetingsSection({ funnelId, leadId, refreshKey }: { funnelId: string; leadId: string; refreshKey?: number }) {
  const isAuthReady = useAuthReady();
  const [meetings, setMeetings] = useState<LeadMeeting[]>([]);
  const [transcripts, setTranscripts] = useState<MeetingTranscript[]>([]);
  const [calendarConnected, setCalendarConnected] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const [pullNote, setPullNote] = useState<string | null>(null);
  const [openTranscriptId, setOpenTranscriptId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [res, trs] = await Promise.all([getLeadMeetings(funnelId, leadId), listLeadTranscripts(leadId)]);
      setMeetings(res.meetings);
      setCalendarConnected(res.calendarConnected);
      setTranscripts(trs);
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
    try { await cancelMeeting(id); await load(); } finally { setCancelingId(null); }
  }

  async function handleDispose(m: LeadMeeting, next: MeetingDisposition | null) {
    setMeetings((prev) => prev.map((x) => (x.id === m.id && x.source === m.source ? { ...x, disposition: next } : x)));
    try { await setMeetingDisposition(m.source, m.id, next); } catch { await load(); }
  }

  async function pull() {
    if (pulling) return;
    setPulling(true);
    setPullNote(null);
    try {
      const res = await pullLeadTranscripts(funnelId, leadId);
      if (!res.connected) setPullNote(res.reason || "Connect Fathom or Fireflies in Settings → Integrations.");
      else if (res.linked === 0) setPullNote(`No new recordings matched (checked ${res.checked}).`);
      else { setPullNote(`Linked ${res.linked} recording${res.linked === 1 ? "" : "s"}.`); await load(); }
    } catch (err) {
      setPullNote(err instanceof Error ? err.message : "Failed to pull transcripts.");
    } finally {
      setPulling(false);
      setTimeout(() => setPullNote(null), 6000);
    }
  }

  // Match a transcript to a meeting by explicit link or time proximity.
  const transcriptFor = useCallback(
    (m: LeadMeeting): MeetingTranscript | undefined =>
      transcripts.find(
        (t) =>
          (t.meetingId && t.meetingId === m.id) ||
          (!!t.heldAt && !!m.startTime && Math.abs(new Date(t.heldAt).getTime() - new Date(m.startTime).getTime()) < NEAR_MS),
      ),
    [transcripts],
  );

  // Split meetings; collect transcripts that didn't attach to any listed meeting.
  const { upcoming, past, orphanTranscripts, total } = useMemo(() => {
    const nowMs = Date.now();
    const up: LeadMeeting[] = [];
    const pa: LeadMeeting[] = [];
    const attached = new Set<string>();
    for (const m of meetings) {
      const t = m.startTime ? new Date(m.startTime).getTime() : NaN;
      const tr = transcriptFor(m);
      if (tr) attached.add(tr.id);
      if (!Number.isNaN(t) && t < nowMs) pa.push(m);
      else up.push(m);
    }
    pa.reverse();
    const orphans = transcripts.filter((t) => !attached.has(t.id));
    return { upcoming: up, past: pa, orphanTranscripts: orphans, total: meetings.length + orphans.length };
  }, [meetings, transcripts, transcriptFor]);

  return (
    <>
      <Section
        icon={CalendarClock}
        title="Meetings"
        count={total || null}
        actions={
          <button
            onClick={pull}
            disabled={pulling}
            title="Pull recordings from Fathom / Fireflies"
            className="flex items-center gap-1 px-2 py-1 rounded-[14px] bg-accent/15 text-link text-[10.5px] font-medium hover:bg-accent/25 transition-colors disabled:opacity-60"
          >
            {pulling ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            {pulling ? "Pulling…" : "Pull transcripts"}
          </button>
        }
      >
        <div className="flex flex-col gap-1.5">
          {total === 0 ? (
            <p className="text-[12px] text-ink-faint px-1">
              {!loaded
                ? "Loading…"
                : !calendarConnected
                  ? "No meetings. Connect a calendar in Settings → Email Accounts, then hit Pull transcripts to attach recordings."
                  : "No meetings with this lead."}
            </p>
          ) : (
            <>
              {upcoming.map((m) => (
                <MeetingRow key={`${m.source}:${m.id}`} m={m} transcript={transcriptFor(m)} onOpenTranscript={setOpenTranscriptId} onCancel={handleCancel} cancelingId={cancelingId} />
              ))}

              {(past.length > 0 || orphanTranscripts.length > 0) && (
                <p className="text-[10px] uppercase tracking-wider text-ink-faint font-medium px-1 mt-2 mb-0.5">Past</p>
              )}
              {past.map((m) => (
                <MeetingRow key={`${m.source}:${m.id}`} m={m} transcript={transcriptFor(m)} onOpenTranscript={setOpenTranscriptId} past onDispose={handleDispose} />
              ))}
              {orphanTranscripts.map((t) => (
                <TranscriptRow key={t.id} t={t} onOpen={setOpenTranscriptId} />
              ))}
            </>
          )}
          {pullNote && <p className="text-[11px] text-ink-muted px-1 mt-1">{pullNote}</p>}
        </div>
      </Section>

      {openTranscriptId && <MeetingDetailModal id={openTranscriptId} onClose={() => setOpenTranscriptId(null)} />}
    </>
  );
}

/** Small badge shown on a meeting that has a recording/transcript. */
function TranscriptBadge({ t }: { t: MeetingTranscript }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 bg-accent/15 text-link shrink-0">
      {t.scored ? <Gauge size={10} /> : <FileText size={10} />}
      {t.scored ? "Scored" : "Transcript"}
    </span>
  );
}

function MeetingRow({
  m, transcript, onOpenTranscript, past, onCancel, cancelingId, onDispose,
}: {
  m: LeadMeeting;
  transcript?: MeetingTranscript;
  onOpenTranscript: (id: string) => void;
  past?: boolean;
  onCancel?: (id: string) => void;
  cancelingId?: string | null;
  onDispose?: (m: LeadMeeting, next: MeetingDisposition | null) => void;
}) {
  const openable = !!transcript;
  return (
    <div className={cn("flex items-start gap-2.5 py-1.5 px-1 rounded-lg hover:bg-hover/50", past && "opacity-75")}>
      <button
        type="button"
        onClick={() => transcript && onOpenTranscript(transcript.id)}
        disabled={!openable}
        title={openable ? "Open recording, summary & scorecard" : undefined}
        className={cn(
          "flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5 transition-colors",
          transcript ? "bg-accent/15 text-link hover:bg-accent/25" : past ? "bg-section text-ink-muted" : "bg-signal-blue/15 text-signal-blue-text",
          !openable && "cursor-default",
        )}
      >
        {transcript ? <PlayCircle size={14} /> : <CalendarClock size={13} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => transcript && onOpenTranscript(transcript.id)}
            disabled={!openable}
            className={cn("text-[12.5px] leading-snug truncate min-w-0 text-left", past ? "text-ink-muted" : "text-ink-secondary", openable && "hover:text-ink cursor-pointer")}
          >
            {m.title}
          </button>
          {transcript ? <TranscriptBadge t={transcript} /> : !past && <RsvpBadge status={m.responseStatus} />}
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
              <a href={m.joinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium text-signal-blue-text hover:underline">
                <Video size={11} /> Join <ChevronRight size={11} />
              </a>
            )}
            {m.source === "leadey" && onCancel && (
              <button onClick={() => onCancel(m.id)} disabled={cancelingId === m.id}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted hover:text-signal-red-text disabled:opacity-50">
                {cancelingId === m.id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />} Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** A recorded meeting that didn't line up with a calendar event — still shown
 *  so its transcript/scorecard is reachable. */
function TranscriptRow({ t, onOpen }: { t: MeetingTranscript; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(t.id)}
      className="flex items-start gap-2.5 py-1.5 px-1 rounded-lg hover:bg-hover/50 text-left w-full opacity-90"
    >
      <span className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5 bg-accent/15 text-link"><PlayCircle size={14} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[12.5px] text-ink-secondary leading-snug truncate min-w-0">{t.title}</span>
          <TranscriptBadge t={t} />
        </div>
        <p className="text-[10.5px] text-ink-muted mt-0.5">
          {meetingWhen(t.heldAt)}
          <span className="text-ink-faint"> · {t.provider === "fathom" ? "Fathom" : "Fireflies"}</span>
        </p>
      </div>
    </button>
  );
}
