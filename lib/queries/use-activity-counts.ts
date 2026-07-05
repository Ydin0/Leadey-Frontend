"use client";

import { useQuery } from "@tanstack/react-query";
import { getFunnelActivityCounts } from "@/lib/api/funnels";
import { getOrgActivityCounts } from "@/lib/api/leads";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { qk } from "./keys";
import { STALE } from "./config";

/** Deferred per-lead call/email badge counts for a campaign — fetched after
 *  the table paints, cached to match the backend's 60s server-side cache.
 *  Consumers fall back to the payload's (zero) counts while pending, so this
 *  is deploy-order-safe in both directions. */
export function useActivityCounts(funnelId: string, opts?: { enabled?: boolean }) {
  const isAuthReady = useAuthReady();
  return useQuery({
    queryKey: qk.activityCounts(funnelId),
    queryFn: () => getFunnelActivityCounts(funnelId),
    staleTime: STALE.COUNTS,
    enabled: isAuthReady && !!funnelId && (opts?.enabled ?? true),
  });
}

/** Org-wide variant for the /dashboard/leads table (leads span campaigns). */
export function useOrgActivityCounts(opts?: { enabled?: boolean }) {
  const isAuthReady = useAuthReady();
  return useQuery({
    queryKey: qk.orgActivityCounts,
    queryFn: getOrgActivityCounts,
    staleTime: STALE.COUNTS,
    enabled: isAuthReady && (opts?.enabled ?? true),
  });
}
