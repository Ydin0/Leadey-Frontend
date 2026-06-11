"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CreateCampaignWizard } from "@/components/funnels/create/create-campaign-wizard";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getFunnelById } from "@/lib/api/funnels";
import type { Funnel } from "@/lib/types/funnel";

export default function EditFunnelPage() {
  const params = useParams();
  const router = useRouter();
  const funnelId = params.id as string;
  const isAuthReady = useAuthReady();

  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch the campaign — all state writes happen *after* the await so we never
  // setState synchronously inside the effect.
  const fetchFunnel = useCallback(async () => {
    if (!funnelId) return;
    try {
      const data = await getFunnelById(funnelId);
      setFunnel(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaign");
    }
  }, [funnelId]);

  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    void (async () => { if (!cancelled) await fetchFunnel(); })();
    return () => { cancelled = true; };
  }, [isAuthReady, fetchFunnel]);

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-page text-center px-6">
        <p className="text-[13px] font-medium text-signal-red-text">Could not load this campaign</p>
        <p className="text-[12px] text-ink-muted max-w-sm">{error}</p>
        <div className="flex items-center gap-2.5">
          <button onClick={() => void fetchFunnel()} className="rounded-full bg-ink text-on-ink px-4 py-2 text-[12px] font-medium hover:opacity-90 transition-opacity">
            Retry
          </button>
          <button onClick={() => router.push(`/dashboard/funnels/${funnelId}`)} className="rounded-full bg-section text-ink-secondary px-4 py-2 text-[12px] hover:bg-hover transition-colors">
            Back to campaign
          </button>
        </div>
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-page">
        <Loader2 size={22} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  return <CreateCampaignWizard mode="edit" funnel={funnel} />;
}
