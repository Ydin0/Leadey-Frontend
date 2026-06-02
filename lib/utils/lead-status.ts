import type { LeadStatus } from "@/lib/types/funnel-focus";

export type LeadStatusColor =
  | "slate"
  | "blue"
  | "green"
  | "red"
  | "amber"
  | "violet";

export interface LeadStatusOption {
  key: string;
  label: string;
  color: LeadStatusColor;
  isTerminal: boolean;
  isBuiltIn: boolean;
}

/** Maps a semantic colour to a dot background class. */
export const STATUS_COLOR_DOT: Record<LeadStatusColor, string> = {
  slate: "bg-signal-slate-text",
  blue: "bg-signal-blue-text",
  green: "bg-signal-green-text",
  red: "bg-signal-red-text",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
};

/** Built-in statuses — mirrors the backend list. Used as a fallback before
 *  the org's status list loads, and to render statuses outside the funnel
 *  views that don't fetch the list. */
export const BUILTIN_STATUS_OPTIONS: LeadStatusOption[] = [
  { key: "new", label: "New", color: "slate", isTerminal: false, isBuiltIn: true },
  { key: "contacted", label: "Contacted", color: "blue", isTerminal: false, isBuiltIn: true },
  { key: "no_answer", label: "No Answer", color: "slate", isTerminal: false, isBuiltIn: true },
  { key: "interested", label: "Interested", color: "green", isTerminal: true, isBuiltIn: true },
  { key: "not_interested", label: "Not Interested", color: "red", isTerminal: true, isBuiltIn: true },
  { key: "callback", label: "Callback", color: "blue", isTerminal: false, isBuiltIn: true },
  { key: "competitor", label: "Competitor", color: "red", isTerminal: true, isBuiltIn: true },
  { key: "dnc", label: "DNC", color: "red", isTerminal: true, isBuiltIn: true },
  { key: "other_contact", label: "Other Contact", color: "slate", isTerminal: false, isBuiltIn: true },
  { key: "qualified", label: "Qualified", color: "green", isTerminal: true, isBuiltIn: true },
  { key: "bounced", label: "Bounced", color: "red", isTerminal: true, isBuiltIn: true },
  { key: "completed", label: "Completed", color: "green", isTerminal: true, isBuiltIn: true },
];

const BUILTIN_BY_KEY = new Map(BUILTIN_STATUS_OPTIONS.map((o) => [o.key, o]));

function resolve(
  status: string,
  options?: LeadStatusOption[],
): LeadStatusOption | undefined {
  return options?.find((o) => o.key === status) ?? BUILTIN_BY_KEY.get(status);
}

/** Human label for a status — falls back to a title-cased key for custom
 *  statuses not present in `options`. */
export function getStatusLabel(
  status: string,
  options?: LeadStatusOption[],
): string {
  const found = resolve(status, options);
  if (found) return found.label;
  return status
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Dot colour class for a status — neutral grey for unknown statuses. */
export function getStatusDotClass(
  status: string,
  options?: LeadStatusOption[],
): string {
  const found = resolve(status, options);
  return found ? STATUS_COLOR_DOT[found.color] : "bg-ink-faint";
}

export function isTerminalStatus(
  status: string,
  options?: LeadStatusOption[],
): boolean {
  return resolve(status, options)?.isTerminal ?? false;
}

// ── Legacy exports (built-in only) — kept for views that don't fetch the
//    org status list (ICP leads, scraper feed, sidebar). ────────────────
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
