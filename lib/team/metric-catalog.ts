import type { MetricKey } from "./team-data";

export type MetricKind = "count" | "duration" | "percent";

/** One selectable stat card on the Team analytics page. `count` cards show a
 *  raw number, `duration` cards format seconds via fmtTalkTime, `percent` cards
 *  (only Connect rate) derive from connected/calls. */
export interface MetricCardDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  group: MetricGroup;
  kind: MetricKind;
  /** Totals key for count/duration cards (absent for the percent card). */
  metricKey?: MetricKey;
}

export type MetricGroup = "Calls" | "Talk time" | "Email" | "SMS" | "LinkedIn" | "Outcomes";
export const CATALOG_GROUPS: MetricGroup[] = ["Calls", "Talk time", "Email", "SMS", "LinkedIn", "Outcomes"];

const CALL_COLOR = "#86EFAC";
const TALK_COLOR = "#E0A878";
const EMAIL_COLOR = "#C8CFE6";
const SMS_COLOR = "#97A4D6";
const LINKEDIN_COLOR = "#7583DE";
const OPP_COLOR = "#6FBEA8";
const CONNECT_COLOR = "#5FB6C9";
const VM_COLOR = "#9AA3C4";

export const METRIC_CATALOG: MetricCardDef[] = [
  // Calls
  { id: "calls", label: "Total calls", icon: "phone", color: CALL_COLOR, group: "Calls", kind: "count", metricKey: "calls" },
  { id: "callsOutbound", label: "Outbound calls", icon: "phone", color: CALL_COLOR, group: "Calls", kind: "count", metricKey: "callsOutbound" },
  { id: "callsInbound", label: "Inbound calls", icon: "phone-call", color: CALL_COLOR, group: "Calls", kind: "count", metricKey: "callsInbound" },
  { id: "connectRate", label: "Connect rate", icon: "phone-call", color: CONNECT_COLOR, group: "Calls", kind: "percent" },
  { id: "voicemailCalls", label: "Voicemails", icon: "message-square", color: VM_COLOR, group: "Calls", kind: "count", metricKey: "voicemailCalls" },
  // Talk time (seconds → duration)
  { id: "talkTime", label: "Total talk time", icon: "clock", color: TALK_COLOR, group: "Talk time", kind: "duration", metricKey: "talkTime" },
  { id: "talkTimeOutbound", label: "Outbound talk time", icon: "clock", color: TALK_COLOR, group: "Talk time", kind: "duration", metricKey: "talkTimeOutbound" },
  { id: "talkTimeInbound", label: "Inbound talk time", icon: "clock", color: TALK_COLOR, group: "Talk time", kind: "duration", metricKey: "talkTimeInbound" },
  // Email
  { id: "emails", label: "Total emails", icon: "mail", color: EMAIL_COLOR, group: "Email", kind: "count", metricKey: "emails" },
  { id: "emailsOutbound", label: "Emails sent", icon: "mail", color: EMAIL_COLOR, group: "Email", kind: "count", metricKey: "emailsOutbound" },
  { id: "emailsInbound", label: "Emails received", icon: "mail", color: EMAIL_COLOR, group: "Email", kind: "count", metricKey: "emailsInbound" },
  // SMS
  { id: "sms", label: "Total SMS", icon: "message-square", color: SMS_COLOR, group: "SMS", kind: "count", metricKey: "sms" },
  { id: "smsOutbound", label: "SMS sent", icon: "message-square", color: SMS_COLOR, group: "SMS", kind: "count", metricKey: "smsOutbound" },
  { id: "smsInbound", label: "SMS received", icon: "message-square", color: SMS_COLOR, group: "SMS", kind: "count", metricKey: "smsInbound" },
  // LinkedIn
  { id: "linkedin", label: "LinkedIn actions", icon: "linkedin", color: LINKEDIN_COLOR, group: "LinkedIn", kind: "count", metricKey: "linkedin" },
  // Outcomes
  { id: "meetings", label: "Opportunities", icon: "briefcase", color: OPP_COLOR, group: "Outcomes", kind: "count", metricKey: "meetings" },
  { id: "replies", label: "Replies", icon: "message-square", color: VM_COLOR, group: "Outcomes", kind: "count", metricKey: "replies" },
];

export const CATALOG_BY_ID: Record<string, MetricCardDef> =
  Object.fromEntries(METRIC_CATALOG.map((c) => [c.id, c]));

/** Default card layout when the org hasn't customized — mirrors the previous
 *  fixed card row so nothing regresses. */
export const DEFAULT_CARD_IDS = [
  "calls", "emails", "sms", "linkedin", "talkTime", "meetings", "connectRate", "voicemailCalls",
];

/** Keep only known ids, de-duplicated, preserving the given order. */
export function sanitizeCardIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (CATALOG_BY_ID[id] && !seen.has(id)) { seen.add(id); out.push(id); }
  }
  return out;
}
