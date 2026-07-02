"use client";

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { getFunnelById } from "@/lib/api/funnels";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import type { Funnel } from "@/lib/types/funnel";
import { qk } from "./keys";
import { STALE } from "./config";

/** Best already-cached stand-in for a funnel, so navigation paints on the
 *  click frame: (a) any loaded variant of this funnel (lite / full / another
 *  lead's focus), else (b) its campaign-list row — header, steps and stats
 *  are real; `leads` is empty there, so tables should keep showing a
 *  skeleton while `isPlaceholderData` is true and leads are empty. */
export function getFunnelPlaceholder(qc: QueryClient, id: string): Funnel | undefined {
  const variants = qc.getQueriesData<Funnel>({ queryKey: qk.funnelAll(id) });
  let best: Funnel | undefined;
  for (const [, data] of variants) {
    if (!data) continue;
    if (!best || (data.leads?.length ?? 0) > (best.leads?.length ?? 0)) best = data;
  }
  if (best) return best;
  return qc.getQueryData<Funnel[]>(qk.funnels)?.find((f) => f.id === id);
}

/** A campaign (lite or full, optionally with one lead's full detail).
 *  Serves from cache instantly when fresh; keeps the previous lead's data
 *  painted during prev/next navigation (the placeholder falls back to the
 *  previous key's data). */
export function useFunnel(
  id: string,
  opts?: { lite?: boolean; fullLeadId?: string | null },
  cfg?: { enabled?: boolean },
) {
  const isAuthReady = useAuthReady();
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.funnel(id, opts),
    queryFn: () => getFunnelById(id, { lite: opts?.lite, fullLeadId: opts?.fullLeadId ?? undefined }),
    staleTime: STALE.FUNNEL,
    enabled: isAuthReady && !!id && (cfg?.enabled ?? true),
    placeholderData: (prev) => prev ?? getFunnelPlaceholder(qc, id),
  });
}
