"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getFunnelById, getFunnelActivityCounts } from "@/lib/api/funnels";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { qk } from "./keys";
import { STALE } from "./config";

/** Warm the cache for a campaign (optionally focused on one lead) BEFORE the
 *  user clicks — wire to onMouseEnter/onFocus of campaign links and lead
 *  rows, and to idle prefetch of prev/next leads. Repeat calls within the
 *  staleTime window are free (no request). */
export function usePrefetchFunnel() {
  const qc = useQueryClient();
  const isAuthReady = useAuthReady();
  return useCallback(
    (id: string, opts?: { fullLeadId?: string }) => {
      if (!isAuthReady || !id) return;
      void qc.prefetchQuery({
        queryKey: qk.funnel(id, { lite: true, fullLeadId: opts?.fullLeadId ?? null }),
        queryFn: () => getFunnelById(id, { lite: true, fullLeadId: opts?.fullLeadId }),
        staleTime: STALE.FUNNEL,
      });
      // Badge counts too, so the table lands complete.
      void qc.prefetchQuery({
        queryKey: qk.activityCounts(id),
        queryFn: () => getFunnelActivityCounts(id),
        staleTime: STALE.COUNTS,
      });
    },
    [qc, isAuthReady],
  );
}
