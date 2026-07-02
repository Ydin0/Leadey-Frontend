"use client";

import { useQuery } from "@tanstack/react-query";
import { listFunnels } from "@/lib/api/funnels";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { qk } from "./keys";
import { STALE } from "./config";

/** The org's campaigns — ONE shared cache entry for the sidebar, the
 *  campaigns list page, pickers and menus (previously 6+ independent
 *  fetchers). Also the placeholder source for instant campaign-page paint. */
export function useFunnels(opts?: { enabled?: boolean }) {
  const isAuthReady = useAuthReady();
  return useQuery({
    queryKey: qk.funnels,
    queryFn: listFunnels,
    staleTime: STALE.LIST,
    enabled: isAuthReady && (opts?.enabled ?? true),
  });
}
