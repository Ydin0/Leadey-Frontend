"use client";

import { Check, X, CircleDashed, HelpCircle } from "lucide-react";
import type { LeadMeeting, MeetingResponseStatus } from "@/lib/types/calendar";

/** Shared meeting UI atoms — used by the lead profile meetings tab, the
 *  Cockpit meetings-today block and the full calendar page. */

export const SOURCE_LABEL: Record<LeadMeeting["source"], string> = {
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
