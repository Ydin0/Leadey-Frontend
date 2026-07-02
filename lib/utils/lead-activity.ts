import type { FunnelLeadEvent } from "@/lib/types/funnel";
import type { FunnelLeadActivity } from "@/lib/types/funnel-focus";

function labelize(s: string): string {
  return (s || "")
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Maps a lead's real backend events into the timeline's activity shape, so
 *  the Activity panel reflects actual history instead of mock focus data. */
export function mapEventsToActivities(events: FunnelLeadEvent[]): FunnelLeadActivity[] {
  return [...events]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .map((e): FunnelLeadActivity => {
      const channel = (e.meta?.channel as string) || "";
      const outcome = e.outcome || "";
      let type: FunnelLeadActivity["type"] = "note";
      let summary = "Activity";
      let detail = "";
      let transition: FunnelLeadActivity["transition"];

      if (e.type === "imported") {
        type = "import";
        const source = (e.meta?.source as string) || "";
        summary = source === "contact_discovery"
          ? "Imported from Contact Discovery"
          : "Imported into campaign";
      } else if (e.type === "status_change") {
        type = "status_change";
        const from = (e.meta?.from as string) || "";
        if (from && outcome) {
          // Rendered as "Status changed from [pill] → [pill]".
          transition = { kind: "lead", from, to: outcome };
          summary = "Status changed";
        } else {
          summary = outcome ? `Status changed to ${labelize(outcome)}` : "Status changed";
        }
      } else if (e.type === "opportunity_stage_change") {
        type = "opportunity";
        const fromStage = (e.meta?.fromStage as string) || "";
        const toStage = (e.meta?.toStage as string) || outcome || "";
        if (fromStage || toStage) {
          transition = {
            kind: "opportunity",
            from: fromStage,
            to: toStage,
            fromPipeline: (e.meta?.fromPipeline as string) || null,
            toPipeline: (e.meta?.toPipeline as string) || null,
          };
        }
        summary = "Opportunity status changed";
        detail = (e.meta?.oppName as string) || "";
      } else if (e.type === "smartlead_webhook") {
        if (outcome === "opened") { type = "email_opened"; summary = "Email opened"; }
        else if (outcome === "clicked") { type = "email_opened"; summary = "Email link clicked"; }
        else if (outcome === "replied") { type = "email_sent"; summary = "Lead replied to email"; }
        else if (outcome === "bounced") { type = "email_sent"; summary = "Email bounced"; }
        else { type = "email_sent"; summary = "Email sent"; }
      } else if (e.type === "step_outcome") {
        if (channel === "call") { type = "call"; summary = outcome === "sent" ? "Call logged" : `Call — ${labelize(outcome)}`; }
        else if (channel === "linkedin") { type = "linkedin"; summary = outcome === "sent" ? "LinkedIn message sent" : `LinkedIn — ${labelize(outcome)}`; }
        else if (channel === "email") {
          const inbound = (e.meta?.direction as string) === "inbound";
          type = outcome === "opened" ? "email_opened" : "email_sent";
          summary = outcome === "opened"
            ? "Email opened"
            : inbound
              ? "Lead replied to email"
              : outcome === "sent"
                ? "Email sent"
                : `Email — ${labelize(outcome)}`;
          const subject = (e.meta?.subject as string) || "";
          const body = (e.meta?.body as string) || "";
          detail = inbound
            ? (body.replace(/<[^>]+>/g, " ").trim().slice(0, 160) || subject)
            : subject;
        }
        else if (channel === "sms") {
          const inbound = (e.meta?.direction as string) === "inbound";
          type = inbound ? "sms_received" : "sms_sent";
          summary = inbound ? "SMS received" : "SMS sent";
          detail = (e.meta?.body as string) || "";
        }
        else { type = "status_change"; summary = labelize(outcome) || "Step completed"; }
      } else if (e.type === "call" || e.outcome === "call_completed") {
        type = "call";
        summary = "Call logged";
      } else if (e.type === "linkedin_action") {
        type = "linkedin";
        summary = labelize(outcome) || "LinkedIn action";
      } else if (e.type === "reply_handled") {
        type = "status_change";
        summary = "Reply handled";
      } else if (e.type === "note") {
        type = "note";
        summary = (e.meta?.text as string) || "Note";
      } else if (e.type === "meeting_scheduled" || e.type === "meeting_canceled") {
        type = e.type;
        const title = (e.meta?.title as string) || "Meeting";
        const start = e.meta?.startTime ? new Date(e.meta.startTime as string) : null;
        summary = e.type === "meeting_canceled" ? `Meeting canceled — ${title}` : `Meeting booked — ${title}`;
        detail = start
          ? start.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
          : "";
      } else if (e.type === "converted") {
        type = "opportunity";
        summary = "Converted to an opportunity";
        const oppName = (e.meta?.oppName as string) || "";
        const who = (e.meta?.userName as string) || "";
        detail = [oppName, who ? `by ${who}` : ""].filter(Boolean).join(" · ");
      } else {
        type = "note";
        summary = labelize(e.type);
      }

      const userId = (e.meta?.userId as string) || null;
      const userName = (e.meta?.userName as string) || null;
      const meetingUrl = (e.meta?.joinUrl as string) || null;

      return {
        id: e.id,
        type,
        summary,
        transition,
        meetingUrl,
        detail: detail || undefined,
        timestamp: e.timestamp,
        userInitials: "",
        userId,
        userName,
      };
    });
}

export function computeActivityCounts(events: FunnelLeadEvent[]) {
  let calls = 0;
  let emails = 0;

  for (const e of events) {
    const channel = (e.meta?.channel as string) || "";
    if (
      e.type === "call" ||
      (e.type === "step_outcome" && channel === "call") ||
      e.outcome === "call_completed"
    ) {
      calls++;
    }
    if (
      e.type === "smartlead_webhook" ||
      e.type === "email_sent" ||
      (e.type === "step_outcome" && channel === "email") ||
      e.type === "reply_handled"
    ) {
      emails++;
    }
  }

  return { calls, emails };
}
