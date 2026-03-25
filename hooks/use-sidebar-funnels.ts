"use client";

import { useEffect, useState } from "react";
import type { NavSubItem } from "@/lib/types";
import { listFunnels } from "@/lib/api/funnels";
import type { FunnelStatus } from "@/lib/types/funnel";
import { useAuthReady } from "@/components/providers/auth-token-sync";

export function useSidebarFunnels() {
  const [items, setItems] = useState<NavSubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isAuthReady = useAuthReady();

  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;

    async function load() {
      try {
        const funnels = await listFunnels();
        if (cancelled) return;
        setItems(
          funnels.map((f) => ({
            id: f.id,
            label: f.name,
            href: `/dashboard/funnels/${f.id}`,
            status: f.status as FunnelStatus,
          }))
        );
      } catch {
        // Silently fail — sidebar still works without sub-items
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [isAuthReady]);

  return { items, loading };
}
