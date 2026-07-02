"use client";

import { useQuery } from "@tanstack/react-query";
import { getTeamMembers } from "@/lib/api/team";
import { listCustomFields } from "@/lib/api/custom-fields";
import { getLeadStatuses } from "@/lib/api/lead-statuses";
import { getCallOutcomes } from "@/lib/api/call-outcomes";
import { listPipelines } from "@/lib/api/opportunities";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { qk } from "./keys";
import { STALE } from "./config";

/** Org-config queries — small, rarely-changing lists that used to be
 *  refetched by every mounting component (team members alone had ~17 call
 *  sites). One cache entry each, fresh for 5 minutes, deduped across mounts.
 *  The legacy hooks (use-team-members, use-lead-statuses, …) delegate here,
 *  so consumers keep their existing signatures. */

export function useTeamMembersQuery(opts?: { enabled?: boolean }) {
  const isAuthReady = useAuthReady();
  return useQuery({
    queryKey: qk.teamMembers,
    queryFn: getTeamMembers,
    staleTime: STALE.ORG_CONFIG,
    enabled: isAuthReady && (opts?.enabled ?? true),
  });
}

export function useCustomFieldsQuery(opts?: { enabled?: boolean }) {
  const isAuthReady = useAuthReady();
  return useQuery({
    queryKey: qk.customFields,
    queryFn: listCustomFields,
    staleTime: STALE.ORG_CONFIG,
    enabled: isAuthReady && (opts?.enabled ?? true),
  });
}

export function useLeadStatusesQuery(opts?: { enabled?: boolean }) {
  const isAuthReady = useAuthReady();
  return useQuery({
    queryKey: qk.leadStatuses,
    queryFn: getLeadStatuses,
    staleTime: STALE.ORG_CONFIG,
    enabled: isAuthReady && (opts?.enabled ?? true),
  });
}

export function useCallOutcomesQuery(opts?: { enabled?: boolean }) {
  const isAuthReady = useAuthReady();
  return useQuery({
    queryKey: qk.callOutcomes,
    queryFn: getCallOutcomes,
    staleTime: STALE.ORG_CONFIG,
    enabled: isAuthReady && (opts?.enabled ?? true),
  });
}

export function usePipelinesQuery(opts?: { enabled?: boolean }) {
  const isAuthReady = useAuthReady();
  return useQuery({
    queryKey: qk.pipelines,
    queryFn: listPipelines,
    staleTime: STALE.ORG_CONFIG,
    enabled: isAuthReady && (opts?.enabled ?? true),
  });
}
