"use client";

import { useMemo } from "react";
import type { NavSubItem } from "@/lib/types";
import type { FunnelStatus } from "@/lib/types/funnel";
import { useFunnels } from "@/lib/queries/use-funnels";

/** Sidebar campaign sub-items — now served from the SHARED funnels cache
 *  (same entry the campaigns list page and pickers use), which also seeds
 *  instant campaign-page paint via placeholders. */
export function useSidebarFunnels() {
  const { data, isPending } = useFunnels();

  const items = useMemo<NavSubItem[]>(
    () =>
      (data ?? []).map((f) => ({
        id: f.id,
        label: f.name,
        href: `/dashboard/funnels/${f.id}`,
        status: f.status as FunnelStatus,
      })),
    [data],
  );

  return { items, loading: isPending };
}
