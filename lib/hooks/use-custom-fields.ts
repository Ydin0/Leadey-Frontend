"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCustomFieldsQuery } from "@/lib/queries/use-org-config";
import { qk } from "@/lib/queries/keys";

/** The org's custom lead field definitions, served from the shared React
 *  Query cache. Empty until resolved. */
export function useCustomFields() {
  const qc = useQueryClient();
  const { data, isPending } = useCustomFieldsQuery();

  const reload = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: qk.customFields });
  }, [qc]);

  return { fields: data ?? [], loading: isPending, reload };
}
