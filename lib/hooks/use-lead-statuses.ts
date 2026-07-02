"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BUILTIN_STATUS_OPTIONS,
  type LeadStatusOption,
} from "@/lib/utils/lead-status";
import { useLeadStatusesQuery } from "@/lib/queries/use-org-config";
import { qk } from "@/lib/queries/keys";

/** The org's lead statuses (built-in + custom), served from the shared React
 *  Query cache. Falls back to the built-in list until the request resolves
 *  or if it fails. */
export function useLeadStatuses() {
  const qc = useQueryClient();
  const { data, isPending } = useLeadStatusesQuery();

  const statuses: LeadStatusOption[] =
    Array.isArray(data) && data.length ? data : BUILTIN_STATUS_OPTIONS;

  const reload = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: qk.leadStatuses });
  }, [qc]);

  return { statuses, loading: isPending, reload };
}
