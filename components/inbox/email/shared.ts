import type { EmailThreadSummary } from "@/lib/api/email-threads";
import type { LeadStatusColor } from "@/lib/utils/lead-status";

export type EmailFolder = "inbox" | "starred" | "snoozed" | "sent" | "archive";

export const FOLDER_DEFS: { id: EmailFolder; label: string; icon: string }[] = [
  { id: "inbox", label: "Inbox", icon: "inbox" },
  { id: "starred", label: "Starred", icon: "star" },
  { id: "snoozed", label: "Snoozed", icon: "clock" },
  { id: "sent", label: "Sent", icon: "send" },
  { id: "archive", label: "Archive", icon: "archive" },
];

/** Which folder(s) a thread belongs to right now. Like a normal email
 *  client: Inbox = conversations that have RECEIVED mail; outbound-only
 *  outreach that hasn't been answered yet lives in Sent. */
export function inFolder(t: EmailThreadSummary, folder: EmailFolder): boolean {
  const snoozed = !!t.snoozedUntil && new Date(t.snoozedUntil) > new Date();
  switch (folder) {
    case "inbox":
      return t.hasInbound && !t.archived && !snoozed;
    case "starred":
      return t.starred && !t.archived;
    case "snoozed":
      return snoozed && !t.archived;
    case "sent":
      return t.hasOutbound && !t.archived && !snoozed;
    case "archive":
      return t.archived;
  }
}

/** Gmail-style compact timestamp for list rows. */
export function threadTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  const diffDays = (now.getTime() - d.getTime()) / 86_400_000;
  if (diffDays < 6) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

/** Full timestamp for the reading pane. */
export function messageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay) return time;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString([], { day: "numeric", month: "short" })}, ${time}`;
}

/** Status badge classes keyed by the org status option's semantic colour. */
export const STATUS_BADGE: Record<LeadStatusColor, string> = {
  slate: "bg-signal-slate text-signal-slate-text",
  blue: "bg-signal-blue text-signal-blue-text",
  green: "bg-signal-green text-signal-green-text",
  red: "bg-signal-red text-signal-red-text",
  amber: "bg-signal-amber text-signal-amber-text",
  violet: "bg-signal-violet text-signal-violet-text",
};

/** Snooze presets shown in the snooze menus. */
export function snoozePresets(): { label: string; until: Date }[] {
  const now = new Date();
  const later = new Date(now);
  later.setHours(now.getHours() < 16 ? 18 : now.getHours() + 3, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7));
  nextWeek.setHours(9, 0, 0, 0);
  return [
    { label: "Later today", until: later },
    { label: "Tomorrow", until: tomorrow },
    { label: "Next week", until: nextWeek },
  ];
}
