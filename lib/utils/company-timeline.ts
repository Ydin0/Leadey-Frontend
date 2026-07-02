import type { CompanyTimelineItem } from "@/lib/api/company-profile";
import type { FunnelLeadActivity } from "@/lib/types/funnel-focus";
import type { CallRecord } from "@/lib/types/calling";
import type { LeadEmailMessage } from "@/lib/api/email";
import { mapEventsToActivities } from "./lead-activity";

/** Campaign + contact attribution for one timeline item, keyed by the
 *  underlying record id (event/activity id, CallRecord.id, LeadEmailMessage.id)
 *  so LeadTimeline can badge and deep-link every row. */
export interface TimelineItemMeta {
  funnelId: string | null;
  funnelName: string | null;
  leadId: string | null;
  contactId: string | null;
  contactName: string | null;
}

export interface MappedCompanyTimeline {
  activities: FunnelLeadActivity[];
  callRecords: CallRecord[];
  emailMessages: LeadEmailMessage[];
  itemMeta: Record<string, TimelineItemMeta>;
}

/** Shape one page of the server-merged company timeline into the exact arrays
 *  LeadTimeline already consumes. Events reuse mapEventsToActivities so the
 *  type/summary logic stays single-source; SMS messages become sms_sent /
 *  sms_received activities (the campaign view renders SMS the same way). */
export function mapCompanyTimeline(items: CompanyTimelineItem[]): MappedCompanyTimeline {
  const activities: FunnelLeadActivity[] = [];
  const callRecords: CallRecord[] = [];
  const emailMessages: LeadEmailMessage[] = [];
  const itemMeta: Record<string, TimelineItemMeta> = {};

  for (const item of items) {
    const meta: TimelineItemMeta = {
      funnelId: item.funnelId,
      funnelName: item.funnelName,
      leadId: item.leadId,
      contactId: item.contact?.personKey ?? null,
      contactName: item.contact?.name ?? null,
    };

    if (item.kind === "call" && item.call) {
      callRecords.push(item.call);
      itemMeta[item.call.id] = meta;
    } else if (item.kind === "email" && item.email) {
      emailMessages.push(item.email);
      itemMeta[item.email.id] = meta;
    } else if (item.kind === "sms" && item.sms) {
      const inbound = item.sms.direction === "inbound";
      activities.push({
        id: item.sms.id,
        type: inbound ? "sms_received" : "sms_sent",
        summary: inbound ? "SMS received" : "SMS sent",
        detail: item.sms.body || undefined,
        timestamp: new Date(item.timestamp),
        userInitials: "",
        userId: item.sms.userId,
        userName: null,
        ...meta,
      });
      itemMeta[item.sms.id] = meta;
    } else if (item.kind === "event" && item.event) {
      const [activity] = mapEventsToActivities([
        {
          id: item.id,
          type: item.event.type,
          outcome: item.event.outcome,
          stepIndex: item.event.stepIndex,
          meta: item.event.meta,
          timestamp: new Date(item.timestamp),
        },
      ]);
      if (activity) {
        activities.push({ ...activity, ...meta });
        itemMeta[activity.id] = meta;
      }
    }
  }

  return { activities, callRecords, emailMessages, itemMeta };
}

/** Merge subsequent pages: concat arrays, union metas, drop any id already
 *  present (a hasMore heuristic can re-serve a boundary row). */
export function appendCompanyTimeline(
  acc: MappedCompanyTimeline,
  next: MappedCompanyTimeline,
): MappedCompanyTimeline {
  const seen = new Set([
    ...acc.activities.map((a) => a.id),
    ...acc.callRecords.map((c) => c.id),
    ...acc.emailMessages.map((m) => m.id),
  ]);
  return {
    activities: [...acc.activities, ...next.activities.filter((a) => !seen.has(a.id))],
    callRecords: [...acc.callRecords, ...next.callRecords.filter((c) => !seen.has(c.id))],
    emailMessages: [...acc.emailMessages, ...next.emailMessages.filter((m) => !seen.has(m.id))],
    itemMeta: { ...acc.itemMeta, ...next.itemMeta },
  };
}

export const EMPTY_COMPANY_TIMELINE: MappedCompanyTimeline = {
  activities: [],
  callRecords: [],
  emailMessages: [],
  itemMeta: {},
};
