"use client";

import { useMemo, useState } from "react";
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
  type LucideIcon,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { AudioPlayer } from "@/components/recordings/audio-player";
import { summarizeCall } from "@/lib/api/phone-lines";
import type { FunnelLeadActivity } from "@/lib/types/funnel-focus";
import type { CallRecord } from "@/lib/types/calling";

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
};

type FeedItem =
  | { id: string; kind: "call"; timestamp: Date; record: CallRecord }
  | { id: string; kind: "activity"; timestamp: Date; activity: FunnelLeadActivity };

function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

/* ── Call card — real recording + AI summary ─────────────────────────── */
function CallCard({ record }: { record: CallRecord }) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"summary" | "notes">("summary");
  const [summary, setSummary] = useState<string | null>(record.summary ?? null);
  const [transcript, setTranscript] = useState<string | null>(record.transcript ?? null);
  const [generating, setGenerating] = useState(false);

  async function ensureSummary() {
    if (generating || summary || !record.recordingUrl) return;
    setGenerating(true);
    try {
      const res = await summarizeCall(record.id);
      setSummary(res.summary);
      setTranscript(res.transcript);
    } catch (err) {
      console.error("Failed to summarize call:", err);
    } finally {
      setGenerating(false);
    }
  }

  function toggle() {
    const opening = !expanded;
    setExpanded(opening);
    if (opening) void ensureSummary();
  }

  const who = record.contactName || record.to;

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3.5">
      <div className="flex items-center justify-between cursor-pointer" onClick={toggle}>
        <div className="flex items-center gap-2 min-w-0">
          {record.recordingUrl ? (
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
            {fmtDuration(record.duration)}
          </span>
        </div>
        <span className="text-[10.5px] text-ink-faint shrink-0">{formatRelativeTime(record.timestamp)}</span>
      </div>

      {record.recordingUrl && expanded && (
        <>
          <div className="flex items-center gap-1.5 mt-3">
            {(["summary", "notes"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-medium border transition-colors capitalize",
                  tab === t
                    ? "bg-section text-ink border-border-subtle"
                    : "border-transparent text-ink-muted hover:text-ink-secondary",
                )}
              >
                {t === "summary" ? <Sparkles size={12} className={tab === t ? "text-accent" : ""} /> : <FileText size={12} />}
                {t === "summary" ? "Summary" : "Notes"}
              </button>
            ))}
          </div>

          <div className="mt-3 p-3.5 rounded-[10px] bg-section">
            {generating ? (
              <p className="text-[12px] text-ink-muted">Generating AI summary…</p>
            ) : tab === "summary" ? (
              summary ? (
                <p className="text-[12px] text-ink-secondary leading-relaxed whitespace-pre-line">{summary}</p>
              ) : (
                <p className="text-[12px] text-ink-faint">No summary available for this call.</p>
              )
            ) : transcript ? (
              <p className="text-[12px] text-ink-secondary leading-relaxed whitespace-pre-line">{transcript}</p>
            ) : (
              <p className="text-[12px] text-ink-faint">No transcript available.</p>
            )}
          </div>

          <div className="mt-3">
            <AudioPlayer recordId={record.id} />
          </div>
        </>
      )}
    </div>
  );
}

/* ── Generic activity card (notes are editable / deletable) ──────────── */
function ActivityCard({
  a,
  onEdit,
  onDelete,
}: {
  a: FunnelLeadActivity;
  onEdit?: (id: string, text: string) => void;
  onDelete?: (id: string) => void;
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
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
}: {
  item: FeedItem;
  last: boolean;
  onEditNote?: (id: string, text: string) => void;
  onDeleteNote?: (id: string) => void;
}) {
  const type = item.kind === "call" ? "call" : item.activity.type;
  const meta = TYPE_META[type] ?? TYPE_META.note;
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
          <CallCard record={item.record} />
        ) : (
          <ActivityCard a={item.activity} onEdit={onEditNote} onDelete={onDeleteNote} />
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
  onAddNote: (text: string) => void;
  onEditNote?: (id: string, text: string) => void;
  onDeleteNote?: (id: string) => void;
}

const FILTERS = ["All", "Important", "Conversations", "Notes"] as const;
type Filter = (typeof FILTERS)[number];

export function LeadTimeline({ activities, callRecords, onAddNote, onEditNote, onDeleteNote }: LeadTimelineProps) {
  const [filter, setFilter] = useState<Filter>("All");

  const feed = useMemo<FeedItem[]>(() => {
    const calls: FeedItem[] = callRecords.map((r) => ({
      id: r.id,
      kind: "call",
      timestamp: new Date(r.timestamp),
      record: r,
    }));
    const acts: FeedItem[] = activities.map((a) => ({
      id: a.id,
      kind: "activity",
      timestamp: a.timestamp,
      activity: a,
    }));
    return [...calls, ...acts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [activities, callRecords]);

  const items = useMemo(() => {
    const conv = new Set(["call", "email_sent", "email_opened", "linkedin"]);
    return feed.filter((item) => {
      const type = item.kind === "call" ? "call" : item.activity.type;
      if (filter === "All") return true;
      if (filter === "Important") return type === "call" || type === "status_change";
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
