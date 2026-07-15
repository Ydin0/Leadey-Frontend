"use client";

import { Check, X, CircleDashed, HelpCircle, UserCheck, UserX, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { LeadMeeting, MeetingDisposition, MeetingResponseStatus } from "@/lib/types/calendar";

/** Shared meeting UI atoms — used by the lead profile meetings tab, the
 *  Cockpit meetings-today block and the full calendar page. */

export const SOURCE_LABEL: Record<LeadMeeting["source"], string> = {
  google: "Google Calendar",
  outlook: "Outlook",
  calendly: "Calendly",
  leadey: "Leadey",
};

const RSVP: Record<MeetingResponseStatus, { label: string; icon: typeof Check; className: string }> = {
  accepted: { label: "Accepted", icon: Check, className: "bg-signal-green/15 text-signal-green-text" },
  declined: { label: "Declined", icon: X, className: "bg-signal-red/15 text-signal-red-text" },
  tentative: { label: "Tentative", icon: HelpCircle, className: "bg-signal-amber/15 text-signal-amber-text" },
  needsAction: { label: "No response", icon: CircleDashed, className: "bg-signal-slate/15 text-signal-slate-text" },
};

/** Marker for the invitee's RSVP to a meeting. Hidden when unknown. */
export function RsvpBadge({ status }: { status: MeetingResponseStatus | null }) {
  if (!status) return null;
  const cfg = RSVP[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0 ${cfg.className}`}>
      <Icon size={10} strokeWidth={2.5} /> {cfg.label}
    </span>
  );
}

/** At-a-glance attendance colors, used to tint past meetings green/red. */
export const DISPOSITION_COLOR: Record<MeetingDisposition, string> = {
  attended: "#10B981", // green
  no_show: "#EF4444", // red
};

/** Compact attendance pill (green "Attended" / red "No-show"). Hidden when unset. */
export function DispositionBadge({ disposition }: { disposition: MeetingDisposition | null }) {
  if (!disposition) return null;
  const attended = disposition === "attended";
  const Icon = attended ? UserCheck : UserX;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0",
        attended ? "bg-signal-green/15 text-signal-green-text" : "bg-signal-red/15 text-signal-red-text",
      )}
    >
      <Icon size={10} strokeWidth={2.5} /> {attended ? "Attended" : "No-show"}
    </span>
  );
}

/** Two-button toggle to mark a past meeting attended / no-show. Clicking the
 *  active choice again clears it. Persists via `onChange` (async). */
export function DispositionControl({
  disposition,
  onChange,
  size = "sm",
}: {
  disposition: MeetingDisposition | null;
  onChange: (next: MeetingDisposition | null) => Promise<void> | void;
  size?: "sm" | "xs";
}) {
  const [busy, setBusy] = useState(false);
  const pad = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]";

  async function set(next: MeetingDisposition) {
    if (busy) return;
    setBusy(true);
    try {
      await onChange(disposition === next ? null : next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); void set("attended"); }}
        disabled={busy}
        title={disposition === "attended" ? "Attended — click to clear" : "Mark attended"}
        className={cn(
          "inline-flex items-center gap-1 rounded-full font-medium border transition-colors disabled:opacity-50",
          pad,
          disposition === "attended"
            ? "bg-signal-green/20 text-signal-green-text border-signal-green-text/30"
            : "bg-section border-border-subtle text-ink-muted hover:text-signal-green-text hover:border-signal-green-text/30",
        )}
      >
        {busy ? <Loader2 size={11} className="animate-spin" /> : <UserCheck size={11} strokeWidth={2.5} />} Attended
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); void set("no_show"); }}
        disabled={busy}
        title={disposition === "no_show" ? "No-show — click to clear" : "Mark no-show"}
        className={cn(
          "inline-flex items-center gap-1 rounded-full font-medium border transition-colors disabled:opacity-50",
          pad,
          disposition === "no_show"
            ? "bg-signal-red/20 text-signal-red-text border-signal-red-text/30"
            : "bg-section border-border-subtle text-ink-muted hover:text-signal-red-text hover:border-signal-red-text/30",
        )}
      >
        {busy ? <Loader2 size={11} className="animate-spin" /> : <UserX size={11} strokeWidth={2.5} />} No-show
      </button>
    </div>
  );
}

/** Human date+time, e.g. "Tue, Jul 1 · 2:30 PM". Marks today/tomorrow. */
export function meetingWhen(iso: string | null): string {
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

/** Just the local time, e.g. "2:30 PM". */
export function meetingTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
