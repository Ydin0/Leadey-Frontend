import type { LeadStatus } from "@/lib/types/funnel-focus";

export const statusDot: Record<LeadStatus, string> = {
  new: "bg-ink-faint",
  contacted: "bg-signal-blue-text",
  no_answer: "bg-signal-slate-text",
  interested: "bg-signal-green-text",
  not_interested: "bg-signal-red-text",
  callback: "bg-signal-blue-text",
  competitor: "bg-signal-red-text",
  dnc: "bg-signal-red-text",
  other_contact: "bg-signal-slate-text",
  qualified: "bg-signal-green-text",
  bounced: "bg-signal-red-text",
  completed: "bg-signal-green-text",
};

export const statusLabel: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  no_answer: "No Answer",
  interested: "Interested",
  not_interested: "Not Interested",
  callback: "Callback",
  competitor: "Competitor",
  dnc: "DNC",
  other_contact: "Other Contact",
  qualified: "Qualified",
  bounced: "Bounced",
  completed: "Completed",
};

export const TERMINAL_STATUSES = new Set<LeadStatus>([
  "interested",
  "not_interested",
  "bounced",
  "completed",
  "dnc",
  "qualified",
]);
