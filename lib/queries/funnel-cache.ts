"use client";

import type { QueryClient } from "@tanstack/react-query";
import type { Funnel, FunnelLead } from "@/lib/types/funnel";
import { qk } from "./keys";

/** Patch a funnel in EVERY cached variant (lite / full / per-lead focus) and
 *  in its campaign-list row — replaces the old manual funnelCache.set calls
 *  so mutations reflect everywhere (sidebar, list, both funnel views). */
export function patchFunnel(
  qc: QueryClient,
  id: string,
  patch: Partial<Funnel> | ((f: Funnel) => Funnel),
) {
  const apply = (f: Funnel): Funnel =>
    typeof patch === "function" ? patch(f) : { ...f, ...patch };
  qc.setQueriesData<Funnel>({ queryKey: qk.funnelAll(id) }, (f) => (f ? apply(f) : f));
  qc.setQueryData<Funnel[]>(qk.funnels, (list) =>
    list?.map((f) => (f.id === id ? apply(f) : f)),
  );
}

/** Patch one lead across every cached variant of its funnel. */
export function patchLead(
  qc: QueryClient,
  funnelId: string,
  leadId: string,
  patch: Partial<FunnelLead> | ((l: FunnelLead) => FunnelLead),
) {
  const apply = (l: FunnelLead): FunnelLead =>
    typeof patch === "function" ? patch(l) : { ...l, ...patch };
  qc.setQueriesData<Funnel>({ queryKey: qk.funnelAll(funnelId) }, (f) =>
    f ? { ...f, leads: f.leads.map((l) => (l.id === leadId ? apply(l) : l)) } : f,
  );
}

/** Refetch every variant of a funnel (after mutations too coarse to patch). */
export function invalidateFunnel(qc: QueryClient, id: string) {
  void qc.invalidateQueries({ queryKey: qk.funnelAll(id) });
}
