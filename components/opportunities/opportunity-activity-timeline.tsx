"use client";

import {
  Activity,
  ArrowRight,
  Award,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Plus,
  RotateCcw,
  UserCheck,
  XCircle,
} from "lucide-react";
import { formatRelativeTime, formatCurrency } from "@/lib/utils";
import type { OpportunityEvent, OpportunityEventType } from "@/lib/types/opportunity";

const iconFor: Record<OpportunityEventType, typeof Activity> = {
  created: Plus,
  stage_changed: ArrowRight,
  owner_changed: UserCheck,
  value_changed: DollarSign,
  close_date_changed: Calendar,
  note_added: FileText,
  won: Award,
  lost: XCircle,
  reopened: RotateCcw,
  contact_added: Building2,
  contact_removed: Building2,
};

const accentFor: Record<OpportunityEventType, string> = {
  created: "text-signal-blue-text bg-signal-blue/15",
  stage_changed: "text-ink-secondary bg-section",
  owner_changed: "text-ink-secondary bg-section",
  value_changed: "text-ink-secondary bg-section",
  close_date_changed: "text-ink-secondary bg-section",
  note_added: "text-ink-secondary bg-section",
  won: "text-signal-green-text bg-signal-green/15",
  lost: "text-signal-red-text bg-signal-red/15",
  reopened: "text-signal-blue-text bg-signal-blue/15",
  contact_added: "text-ink-secondary bg-section",
  contact_removed: "text-ink-secondary bg-section",
};

interface OpportunityActivityTimelineProps {
  events: OpportunityEvent[];
}

export function OpportunityActivityTimeline({ events }: OpportunityActivityTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-[12px] text-ink-muted text-center py-8">
        No activity yet.
      </div>
    );
  }
  return (
    <ol className="relative">
      <div
        aria-hidden
        className="absolute left-[19px] top-2 bottom-2 w-px bg-border-subtle"
      />
      {events.map((event) => (
        <TimelineItem key={event.id} event={event} />
      ))}
    </ol>
  );
}

function TimelineItem({ event }: { event: OpportunityEvent }) {
  const Icon = iconFor[event.type] || Activity;
  const accent = accentFor[event.type] || "text-ink-secondary bg-section";

  return (
    <li className="relative pl-12 pb-5">
      <span
        className={`absolute left-1 top-0 flex items-center justify-center w-9 h-9 rounded-full border border-border-subtle ${accent}`}
      >
        <Icon size={13} strokeWidth={1.5} />
      </span>
      <div>
        <p className="text-[12px] text-ink leading-snug">{renderHeadline(event)}</p>
        {renderDetail(event) && (
          <p className="text-[11px] text-ink-muted mt-0.5">{renderDetail(event)}</p>
        )}
        <p className="text-[10px] text-ink-faint mt-1">
          {event.userName && (
            <>
              <span className="text-ink-muted">{event.userName}</span>
              <span className="mx-1">·</span>
            </>
          )}
          {formatRelativeTime(event.createdAt)}
        </p>
      </div>
    </li>
  );
}

function renderHeadline(event: OpportunityEvent): string {
  switch (event.type) {
    case "created":
      return event.meta?.fromConversion
        ? "Converted from campaign lead"
        : "Opportunity created";
    case "stage_changed":
      return "Stage changed";
    case "owner_changed":
      return "Owner reassigned";
    case "value_changed":
      return "Deal value updated";
    case "close_date_changed":
      return "Close date updated";
    case "note_added":
      return "Note added";
    case "won":
      return "Marked as Won 🎉";
    case "lost":
      return "Marked as Lost";
    case "reopened":
      return "Opportunity reopened";
    case "contact_added":
      return "Contact added";
    case "contact_removed":
      return "Contact removed";
    default:
      return event.type;
  }
}

function renderDetail(event: OpportunityEvent): string | null {
  const meta = event.meta || {};
  if (event.type === "note_added" && typeof meta.note === "string") {
    return meta.note;
  }
  if (event.type === "value_changed") {
    return `${formatCurrency(Number(meta.from) || 0)} → ${formatCurrency(Number(meta.to) || 0)}`;
  }
  if (event.type === "close_date_changed") {
    return `${meta.from || "—"} → ${meta.to || "—"}`;
  }
  if (event.type === "lost" && meta.reason) {
    return String(meta.reason);
  }
  return null;
}
