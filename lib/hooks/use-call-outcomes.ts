"use client";

import { useQueryClient } from "@tanstack/react-query";
import { type CallOutcome } from "@/lib/api/call-outcomes";
import { useCallOutcomesQuery } from "@/lib/queries/use-org-config";
import { qk } from "@/lib/queries/keys";

// Close-style defaults — shown instantly before the org's list loads, and as a
// fallback if the request fails. Mirrors the backend defaults.
export const DEFAULT_CALL_OUTCOMES: CallOutcome[] = [
  { key: "qualified_next_step", label: "Qualified – Needs Next Step", color: "blue" },
  { key: "booked_meeting", label: "Booked Meeting", color: "green" },
  { key: "disqualified", label: "Disqualified", color: "red" },
  { key: "conversation_incomplete", label: "Conversation Incomplete", color: "amber" },
  { key: "no_clear_outcome", label: "No Clear Outcome", color: "slate" },
];

/** The org's call-outcome label set, served from the shared React Query
 *  cache (this hook pioneered the module-cache pattern the query layer now
 *  generalizes platform-wide). */
export function useCallOutcomes() {
  const qc = useQueryClient();
  const { data, isPending } = useCallOutcomesQuery();

  const outcomes: CallOutcome[] =
    Array.isArray(data) && data.length ? data : DEFAULT_CALL_OUTCOMES;

  return {
    outcomes,
    loading: isPending,
    reload: () => void qc.invalidateQueries({ queryKey: qk.callOutcomes }),
  };
}
