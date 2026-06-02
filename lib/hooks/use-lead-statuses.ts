"use client";

import { useCallback, useEffect, useState } from "react";
import { getLeadStatuses } from "@/lib/api/lead-statuses";
import {
  BUILTIN_STATUS_OPTIONS,
  type LeadStatusOption,
} from "@/lib/utils/lead-status";
import { useAuthReady } from "@/components/providers/auth-token-sync";

/** Loads the org's lead statuses (built-in + custom). Falls back to the
 *  built-in list until the request resolves or if it fails. */
export function useLeadStatuses() {
  const isAuthReady = useAuthReady();
  const [statuses, setStatuses] =
    useState<LeadStatusOption[]>(BUILTIN_STATUS_OPTIONS);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const list = await getLeadStatuses();
      if (Array.isArray(list) && list.length) setStatuses(list);
    } catch {
      // keep built-in fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    void reload();
  }, [isAuthReady, reload]);

  return { statuses, loading, reload };
}
