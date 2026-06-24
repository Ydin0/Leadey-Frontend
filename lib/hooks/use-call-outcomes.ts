"use client";

import { useEffect, useState } from "react";
import { getCallOutcomes, type CallOutcome } from "@/lib/api/call-outcomes";
import { useAuthReady } from "@/components/providers/auth-token-sync";

// Close-style defaults — shown instantly before the org's list loads, and as a
// fallback if the request fails. Mirrors the backend defaults.
export const DEFAULT_CALL_OUTCOMES: CallOutcome[] = [
  { key: "qualified_next_step", label: "Qualified – Needs Next Step", color: "blue" },
  { key: "booked_meeting", label: "Booked Meeting", color: "green" },
  { key: "disqualified", label: "Disqualified", color: "red" },
  { key: "conversation_incomplete", label: "Conversation Incomplete", color: "amber" },
  { key: "no_clear_outcome", label: "No Clear Outcome", color: "slate" },
];

let cache: CallOutcome[] | null = null;
let inflight: Promise<CallOutcome[]> | null = null;

/** Loads the org's call-outcome label set (cached across mounts). */
export function useCallOutcomes() {
  const isAuthReady = useAuthReady();
  const [outcomes, setOutcomes] = useState<CallOutcome[]>(cache ?? DEFAULT_CALL_OUTCOMES);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (!isAuthReady || cache) return;
    inflight ??= getCallOutcomes().then((list) => {
      cache = Array.isArray(list) && list.length ? list : DEFAULT_CALL_OUTCOMES;
      return cache;
    });
    let alive = true;
    inflight
      .then((list) => { if (alive) { setOutcomes(list); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [isAuthReady]);

  return { outcomes, loading, reload: () => { cache = null; inflight = null; } };
}
