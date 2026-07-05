"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getAllOrgLeads } from "@/lib/api/leads";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { qk } from "./keys";
import { STALE } from "./config";

/** Every campaign lead across the org (load-all, server-capped at 20k) —
 *  feeds the /dashboard/leads table, which filters/groups/sorts client-side
 *  exactly like the campaign leads table does. */
export function useOrgLeads() {
  const isAuthReady = useAuthReady();
  return useQuery({
    queryKey: qk.orgLeads,
    queryFn: getAllOrgLeads,
    staleTime: STALE.FUNNEL,
    enabled: isAuthReady,
  });
}

export function useInvalidateOrgLeads() {
  const qc = useQueryClient();
  return useCallback(() => {
    void qc.invalidateQueries({ queryKey: qk.orgLeads });
  }, [qc]);
}
