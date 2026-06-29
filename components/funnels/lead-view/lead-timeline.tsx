"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Phone,
  Mail,
  Linkedin,
  Flag,
  FileText,
  Sparkles,
  Download,
  Clock,
  ChevronDown,
  ChevronRight,
  Search,
  Check,
  Pencil,
  Trash2,
  Trophy,
  MessageSquare,
  Loader2,
  Filter,
  X,
  CalendarCheck,
  CalendarX,
  type LucideIcon,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { CallReview } from "@/components/recordings/call-review";
import { summarizeCall, setCallOutcome } from "@/lib/api/phone-lines";
import { CallOutcomeSelect } from "@/components/calling/call-outcome-select";
import { useCallOutcomes } from "@/lib/hooks/use-call-outcomes";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { useTeamMembers } from "@/hooks/use-team-members";
import type { FunnelLeadActivity } from "@/lib/types/funnel-focus";
import type { CallRecord } from "@/lib/types/calling";
import type { LeadEmailMessage } from "@/lib/api/email";
import { EmailActivityCard, type EmailReplyMode } from "./email-activity-card";

/** Who performed an activity — resolved to a display name + a stable id for
 *  the avatar colour. */
interface Actor {
  id: string;
  name: string;
}

/** Small avatar + first-name chip shown on activity rows. */
function ActorBadge({ actor }: { actor: Actor | null | undefined }) {
  if (!actor) return null;
  return (
    <span className="flex items-center gap-1.5 shrink-0" title={actor.name}>
      <MemberAvatar id={actor.id} name={actor.name} />
      <span className="text-[11px] text-ink-muted">{actor.name.split(" ")[0]}</span>
    </span>
  );
}

interface KindMeta {
  icon: LucideIcon;
  tint: string;
  fg: string;
}

const TYPE_META: Record<string, KindMeta> = {
  call: { icon: Phone, tint: "bg-signal-green", fg: "text-signal-green-text" },
  email_sent: { icon: Mail, tint: "bg-signal-blue", fg: "text-signal-blue-text" },
  email_opened: { icon: Mail, tint: "bg-signal-blue", fg: "text-signal-blue-text" },
  linkedin: { icon: Linkedin, tint: "bg-signal-slate", fg: "text-ink-muted" },
  status_change: { icon: Flag, tint: "bg-signal-slate", fg: "text-signal-slate-text" },
  note: { icon: FileText, tint: "bg-section", fg: "text-ink-muted" },
  import: { icon: Download, tint: "bg-signal-slate", fg: "text-signal-slate-text" },
  opportunity: { icon: Trophy, tint: "bg-signal-green", fg: "text-signal-green-text" },
  sms_sent: { icon: MessageSquare, tint: "bg-signal-green", fg: "text-signal-green-text" },
  sms_received: { icon: MessageSquare, tint: "bg-signal-green", fg: "text-signal-green-text" },
  meeting_scheduled: { icon: CalendarCheck, tint: "bg-signal-blue", fg: "text-signal-blue-text" },
  meeting_canceled: { icon: CalendarX, tint: "bg-signal-red", fg: "text-signal-red-text" },
};

type FeedItem =
  | { id: string; kind: "call"; timestamp: Date; record: CallRecord; actor: Actor | null }
  | { id: string; kind: "email"; timestamp: Date; message: LeadEmailMessage; actor: Actor | null }
  | { id: string; kind: "activity"; timestamp: Date; activity: FunnelLeadActivity; actor: Actor | null };

function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

/* ── Call card — real recording + AI summary + full transcript ───────── */
function CallCard({ record, actor }: { record: CallRecord; actor: Actor | null }) {
  const [expanded, setExpanded] = useState(false);
  // Local copy so generated transcript/summary data merges into the record we
  // hand to <CallReview> (the same rich view the Recordings tab renders).
  const [rec, setRec] = useState<CallRecord>(record);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const { outcomes } = useCallOutcomes();

  useEffect(() => { setRec(record); }, [record]);

  const changeOutcome = useCallback((key: string | null) => {
    setRec((prev) => ({ ...prev, outcome: key, outcomeManual: true }));
    void setCallOutcome(rec.id, key).catch((err) => console.error("Failed to set outcome:", err));
  }, [rec.id]);

  const hasReview = !!(rec.transcriptSegments?.length || rec.summaryStructured || rec.transcript || rec.summary);
  const canExpand = !!rec.recordingUrl;

  const generate = useCallback(async () => {
    if (generating || !rec.recordingUrl) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await summarizeCall(rec.id);
      setRec((prev) => ({ ...prev, ...res }));
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Transcription failed");
    } finally {
      setGenerating(false);
    }
  }, [generating, rec.recordingUrl, rec.id]);

  function toggle() {
    if (!canExpand) return;
    const opening = !expanded;
    setExpanded(opening);
    // Auto-transcribe on first open so the transcript "just shows" (Close-style).
    if (opening && !hasReview && !generating) void generate();
  }

  const who = rec.contactName || rec.to;

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3.5">
      <div
        className={cn("flex items-center justify-between", canExpand && "cursor-pointer")}
        onClick={toggle}
      >
        <div className="flex items-center gap-2 min-w-0">
          {canExpand ? (
            expanded ? (
              <ChevronDown size={13} className="text-ink-faint shrink-0" />
            ) : (
              <ChevronRight size={13} className="text-ink-faint shrink-0" />
            )
          ) : (
            <Phone size={13} className="text-signal-green-text shrink-0" />
          )}
          <span className="text-[13px] font-medium text-ink truncate">Called {who}</span>
          <span className="flex items-center gap-1 text-[11px] text-ink-muted shrink-0">
            <Clock size={11} />
            {fmtDuration(rec.duration)}
          </span>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <ActorBadge actor={actor} />
          <span className="text-[10.5px] text-ink-faint">{formatRelativeTime(rec.timestamp)}</span>
        </div>
      </div>

      {/* Call outcome — AI-classified, click to confirm/change */}
      <div className="flex items-center gap-2 mt-2.5 pl-[21px]" onClick={(e) => e.stopPropagation()}>
        <span className="text-[11px] text-ink-muted">Outcome</span>
        <CallOutcomeSelect
          value={rec.outcome}
          outcomes={outcomes}
          onChange={changeOutcome}
          aiSuggested={!rec.outcomeManual}
          size="sm"
        />
      </div>

      {canExpand && expanded && (
        <div className="mt-3.5">
          {generating && !hasReview ? (
            <div className="flex items-center gap-2 text-[12px] text-ink-muted">
              <Loader2 size={14} className="animate-spin" />
              Transcribing &amp; summarizing this call…
            </div>
          ) : hasReview ? (
            <CallReview
              record={rec}
              initialDuration={rec.recordingDuration || rec.duration}
              onRegenerate={() => void generate()}
              regenerating={generating}
            />
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className={cn("text-[12px]", genError ? "text-signal-red-text" : "text-ink-muted")}>
                {genError || "No transcript yet for this call."}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); void generate(); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 transition-opacity shrink-0"
              >
                <Sparkles size={11} /> {genError ? "Retry" : "Generate transcript"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Generic activity card (notes are editable / deletable) ──────────── */
function ActivityCard({
  a,
  actor,
  onEdit,
  onDelete,
  showContact,
}: {
  a: FunnelLeadActivity;
  actor: Actor | null;
  onEdit?: (id: string, text: string) => void;
  onDelete?: (id: string) => void;
  /** Show which contact this row belongs to (company-wide, unfiltered feed). */
  showContact?: boolean;
}) {
  const editable = a.type === "note" && (!!onEdit || !!onDelete);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(a.summary);

  if (editing) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface p-3.5">
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="w-full bg-section border border-border-subtle rounded-[8px] px-2.5 py-2 text-[12.5px] text-ink focus:outline-none focus:border-border-default resize-none"
        />
        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            onClick={() => {
              setEditing(false);
              setText(a.summary);
            }}
            className="px-2.5 py-1 rounded-full text-[11px] text-ink-muted hover:bg-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (text.trim()) {
                onEdit?.(a.id, text.trim());
                setEditing(false);
              }
            }}
            disabled={!text.trim()}
            className="px-3 py-1 rounded-full bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 disabled:opacity-50 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-xl border border-border-subtle bg-surface p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] text-ink leading-snug whitespace-pre-wrap">{a.summary}</p>
          {a.detail && <p className="text-[11.5px] text-ink-muted mt-1 leading-relaxed">{a.detail}</p>}
          {a.type === "meeting_scheduled" && a.meetingUrl && (
            <a href={a.meetingUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-signal-blue-text hover:underline mt-1">
              Join meeting <ChevronRight size={11} />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {showContact && a.contactName && (
            <span className="text-[10px] text-ink-muted bg-section rounded-full px-2 py-0.5 truncate max-w-[140px]" title={a.contactName}>
              {a.contactName}
            </span>
          )}
          {editable && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => {
                  setText(a.summary);
                  setEditing(true);
                }}
                title="Edit note"
                className="text-ink-faint hover:text-ink transition-colors"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={() => onDelete?.(a.id)}
                title="Delete note"
                className="text-ink-faint hover:text-signal-red-text transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
          <ActorBadge actor={actor} />
          <span className="text-[10.5px] text-ink-faint">{formatRelativeTime(a.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Timeline row (gutter medallion + line) ──────────────────────────── */
function TimelineRow({
  item,
  last,
  onEditNote,
  onDeleteNote,
  onReplyEmail,
  showContact,
}: {
  item: FeedItem;
  last: boolean;
  onEditNote?: (id: string, text: string) => void;
  onDeleteNote?: (id: string) => void;
  onReplyEmail?: (message: LeadEmailMessage, mode: EmailReplyMode) => void;
  showContact?: boolean;
}) {
  const meta =
    item.kind === "email"
      ? { icon: Mail, tint: "bg-signal-blue", fg: "text-signal-blue-text" }
      : TYPE_META[item.kind === "call" ? "call" : item.activity.type] ?? TYPE_META.note;
  const Icon = meta.icon;
  return (
    <div className="flex gap-3.5 items-stretch">
      <div className="flex flex-col items-center w-7 shrink-0">
        <div className={cn("flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5", meta.tint)}>
          <Icon size={13} className={meta.fg} />
        </div>
        {!last && <div className="w-px flex-1 bg-border-subtle mt-1" />}
      </div>
      <div className={cn("flex-1 min-w-0", last ? "pb-0" : "pb-4")}>
        {item.kind === "call" ? (
          <CallCard record={item.record} actor={item.actor} />
        ) : item.kind === "email" ? (
          <EmailActivityCard message={item.message} onReply={onReplyEmail} />
        ) : (
          <ActivityCard a={item.activity} actor={item.actor} onEdit={onEditNote} onDelete={onDeleteNote} showContact={showContact} />
        )}
      </div>
    </div>
  );
}

/* ── Inline note composer ────────────────────────────────────────────── */
function Composer({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="rounded-[14px] border border-border-subtle bg-surface overflow-hidden mb-5">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Write a note about this lead…"
        className="w-full bg-transparent px-4 py-3 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none resize-none"
      />
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border-subtle">
        <button
          onClick={() => {
            if (text.trim()) {
              onAdd(text.trim());
              setText("");
            }
          }}
          disabled={!text.trim()}
          className="px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 disabled:opacity-50 transition-colors"
        >
          Add note
        </button>
        <span className="flex items-center gap-1.5 text-[11px] text-ink-faint">
          <Check size={12} className="text-signal-green-text" />
          Notes save to this lead
        </span>
      </div>
    </div>
  );
}

interface LeadTimelineProps {
  activities: FunnelLeadActivity[];
  callRecords: CallRecord[];
  emailMessages?: LeadEmailMessage[];
  onAddNote: (text: string) => void;
  onEditNote?: (id: string, text: string) => void;
  onDeleteNote?: (id: string) => void;
  onReplyEmail?: (message: LeadEmailMessage, mode: EmailReplyMode) => void;
  /** When the feed is narrowed to one contact, their name (drives the banner). */
  filterContactName?: string | null;
  /** Clear the per-contact quick filter. */
  onClearFilter?: () => void;
}

const FILTERS = ["All", "Important", "Conversations", "Notes"] as const;
type Filter = (typeof FILTERS)[number];

export function LeadTimeline({ activities, callRecords, emailMessages, onAddNote, onEditNote, onDeleteNote, onReplyEmail, filterContactName, onClearFilter }: LeadTimelineProps) {
  const [filter, setFilter] = useState<Filter>("All");
  const { resolveMember } = useTeamMembers();

  const feed = useMemo<FeedItem[]>(() => {
    // Resolve an actor from a user id + optional stored name. The team list
    // provides the display name; we fall back to the stored name (e.g. on a
    // call record) so it works even before the team list loads.
    const toActor = (id?: string | null, name?: string | null): Actor | null => {
      const resolved = id ? resolveMember(id)?.name : undefined;
      const display = resolved || name || "";
      if (!id && !display) return null;
      return { id: id || display, name: display || "Unknown" };
    };

    const calls: FeedItem[] = callRecords.map((r) => ({
      id: r.id,
      kind: "call",
      timestamp: new Date(r.timestamp),
      record: r,
      actor: toActor(r.userId, r.userName),
    }));
    // Email events are rendered as rich cards from the real message thread, and
    // calls as the authoritative CallCard (from callRecords) — so drop the
    // flattened "Email sent/opened" and "Call" activities to avoid duplicates.
    const acts: FeedItem[] = activities
      .filter((a) => a.type !== "email_sent" && a.type !== "email_opened" && a.type !== "call")
      .map((a) => ({
        id: a.id,
        kind: "activity" as const,
        timestamp: a.timestamp,
        activity: a,
        actor: toActor(a.userId, a.userName),
      }));
    const emails: FeedItem[] = (emailMessages || []).map((m) => ({
      id: `em_${m.id}`,
      kind: "email" as const,
      timestamp: new Date(m.createdAt),
      message: m,
      actor: toActor(m.userId, null),
    }));
    return [...calls, ...acts, ...emails].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [activities, callRecords, emailMessages, resolveMember]);

  const items = useMemo(() => {
    const conv = new Set(["call", "email", "linkedin", "sms_sent", "sms_received"]);
    return feed.filter((item) => {
      const type = item.kind === "call" ? "call" : item.kind === "email" ? "email" : item.activity.type;
      if (filter === "All") return true;
      if (filter === "Important") return type === "call" || type === "status_change" || type === "opportunity";
      if (filter === "Conversations") return conv.has(type);
      if (filter === "Notes") return type === "note" || type === "call";
      return true;
    });
  }, [feed, filter]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[920px] mx-auto w-full px-7 pt-5 pb-16">
        <Composer onAdd={onAddNote} />

        {/* Filters */}
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "text-[12.5px] font-medium px-3 py-1.5 rounded-full transition-colors",
                  filter === f ? "bg-section text-ink" : "text-ink-muted hover:text-ink-secondary",
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-surface border border-border-default rounded-full px-3 py-1.5 w-[260px] max-w-full">
            <Search size={13} className="text-ink-muted" />
            <span className="text-[12px] text-ink-faint truncate">Search activity</span>
          </div>
        </div>

        {/* Active contact filter banner */}
        {filterContactName && (
          <div className="flex items-center justify-between gap-3 mb-5 rounded-[12px] border border-accent/25 bg-accent/[0.06] px-3.5 py-2.5">
            <span className="flex items-center gap-2 text-[12.5px] text-ink-secondary min-w-0">
              <Filter size={13} className="text-accent shrink-0" />
              Showing only <strong className="text-ink font-semibold truncate">{filterContactName}</strong>’s activity
            </span>
            <button
              onClick={onClearFilter}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-border-subtle px-2.5 py-1 text-[11px] font-medium text-ink-secondary hover:border-border-default transition-colors shrink-0"
            >
              <X size={12} /> Show all contacts
            </button>
          </div>
        )}

        {/* Feed */}
        {items.length ? (
          <div>
            {items.map((item, i) => (
              <TimelineRow
                key={item.id}
                item={item}
                last={i === items.length - 1}
                onEditNote={onEditNote}
                onDeleteNote={onDeleteNote}
                onReplyEmail={onReplyEmail}
                showContact={!filterContactName}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[14px] border border-border-subtle bg-surface p-8 text-center text-[13px] text-ink-muted">
            No activity in this view.
          </div>
        )}
      </div>
    </div>
  );
}
