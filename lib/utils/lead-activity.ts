import type { FunnelLeadEvent } from "@/lib/types/funnel";

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
