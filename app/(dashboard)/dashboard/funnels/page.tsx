"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { FunnelCard } from "@/components/funnels/funnel-card";
import { FunnelEmptyState } from "@/components/funnels/funnel-empty-state";
import { listFunnels } from "@/lib/api/funnels";
import type { Funnel } from "@/lib/types/funnel";

export default function FunnelsPage() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFunnels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listFunnels();
      setFunnels(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load funnels";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFunnels();
  }, [loadFunnels]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-semibold text-ink">Funnels</h1>
          <p className="text-[12px] text-ink-muted mt-0.5">Multi-channel outreach sequences to engage and convert leads</p>
        </div>
        {funnels.length > 0 && (
          <Link
            href="/dashboard/funnels/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
          >
            <Plus size={14} strokeWidth={2} />
            Create Funnel
          </Link>
        )}
      </div>

      {loading && (
        <div className="rounded-[14px] border border-border-subtle bg-surface p-6">
          <p className="text-[12px] text-ink-muted">Loading funnels...</p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-[14px] border border-signal-red-text/25 bg-signal-red/10 p-5 mb-4">
          <p className="text-[12px] font-medium text-signal-red-text mb-2">
            Could not load funnels
          </p>
          <p className="text-[11px] text-ink-secondary mb-3">{error}</p>
          <button
            onClick={() => void loadFunnels()}
            className="px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && funnels.length === 0 && (
        <FunnelEmptyState />
      )}

      {!loading && !error && funnels.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {funnels.map((funnel) => (
            <FunnelCard key={funnel.id} funnel={funnel} />
          ))}
        </div>
      )}
    </div>
  );
}
