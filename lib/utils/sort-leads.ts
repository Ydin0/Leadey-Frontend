import type { FunnelLead } from "@/lib/types/funnel";
import { computeActivityCounts } from "@/lib/utils/lead-activity";

export type LeadSortKey =
  | "smart"
  | "company_asc"
  | "name_asc"
  | "added_desc"
  | "added_asc"
  | "score_desc"
  | "due_asc"
  | "activity_desc";

export const LEAD_SORT_OPTIONS: { value: LeadSortKey; label: string }[] = [
  { value: "smart", label: "Smart (status & due)" },
  { value: "company_asc", label: "Company (A–Z)" },
  { value: "name_asc", label: "Lead name (A–Z)" },
  { value: "added_desc", label: "Recently added" },
  { value: "added_asc", label: "Oldest added" },
  { value: "score_desc", label: "Score (high → low)" },
  { value: "due_asc", label: "Next action (soonest)" },
  { value: "activity_desc", label: "Most contacted" },
];

export const DEFAULT_LEAD_SORT: LeadSortKey = "smart";

// "Smart" status order — active/early statuses first, terminal last.
const STATUS_PRIORITY: Record<string, number> = {
  new: 0, contacted: 1, no_answer: 2, callback: 3, interested: 4,
  not_interested: 5, other_contact: 6, competitor: 7, dnc: 8,
  qualified: 9, bounced: 10, completed: 11,
};
const priorityOf = (s: string) => STATUS_PRIORITY[s] ?? 99;

const time = (d?: Date) => (d ? d.getTime() : 0);
const cmpStr = (a: string, b: string) =>
  (a || "").localeCompare(b || "", undefined, { sensitivity: "base" });

/**
 * Deterministically sort campaign leads by the chosen key. Every comparator
 * ends with a stable tiebreaker on `id` so the order never flip-flops between
 * renders / refetches (the source of the "order keeps changing" bug).
 */
export function sortLeads(leads: FunnelLead[], key: LeadSortKey): FunnelLead[] {
  const activity = (l: FunnelLead) => {
    const c = computeActivityCounts(l.events || []);
    return c.calls + c.emails;
  };

  const comparators: Record<LeadSortKey, (a: FunnelLead, b: FunnelLead) => number> = {
    smart: (a, b) =>
      priorityOf(a.status) - priorityOf(b.status) ||
      time(a.nextDate) - time(b.nextDate),
    company_asc: (a, b) => cmpStr(a.company, b.company) || cmpStr(a.name, b.name),
    name_asc: (a, b) => cmpStr(a.name, b.name),
    added_desc: (a, b) => time(b.createdAt) - time(a.createdAt),
    added_asc: (a, b) => time(a.createdAt) - time(b.createdAt),
    score_desc: (a, b) => (b.score ?? 0) - (a.score ?? 0),
    due_asc: (a, b) => time(a.nextDate) - time(b.nextDate),
    activity_desc: (a, b) => activity(b) - activity(a),
  };

  const cmp = comparators[key] ?? comparators.smart;
  return [...leads].sort((a, b) => cmp(a, b) || cmpStr(a.id, b.id));
}
