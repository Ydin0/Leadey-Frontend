"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

import { useAuthReady } from "@/components/providers/auth-token-sync";
import { LeadView } from "@/components/funnels/lead-view/lead-view";
import { getFunnelById } from "@/lib/api/funnels";
import { getOrgLeadFunnel } from "@/lib/api/leads";
import { sortLeads, DEFAULT_LEAD_SORT, type LeadSortKey } from "@/lib/utils/sort-leads";
import type { Funnel, FunnelLead } from "@/lib/types/funnel";

const SORT_STORAGE_KEY = "leadey:campaign-lead-sort";

/**
 * Standalone lead profile, reachable from the org-wide Leads page without first
 * navigating into a campaign. A lead always belongs to a campaign (funnel), so
 * we resolve that funnel — from the `?c=` query the link carries, or via a tiny
 * lookup as a fallback — and render the full LeadView.
 */
export default function StandaloneLeadPage() {
  const params = useParams();
  const search = useSearchParams();
  const leadId = params.leadId as string;
  const isAuthReady = useAuthReady();

  const [funnelId, setFunnelId] = useState<string | null>(search.get("c"));
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<LeadSortKey>(DEFAULT_LEAD_SORT);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(SORT_STORAGE_KEY) : null;
    if (saved) setSortBy(saved as LeadSortKey);
  }, []);

  const sortedLeads = useMemo(
    () => (funnel ? sortLeads(funnel.leads, sortBy) : []),
    [funnel, sortBy],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let fid = funnelId;
      if (!fid) {
        fid = (await getOrgLeadFunnel(leadId)).funnelId;
        setFunnelId(fid);
      }
      const data = await getFunnelById(fid, { lite: true, fullLeadId: leadId });
      setFunnel(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lead");
    } finally {
      setLoading(false);
    }
  }, [funnelId, leadId]);

  useEffect(() => {
    if (!isAuthReady) return;
    void load();
  }, [isAuthReady, load]);

  if (loading) {
    return (
      <div className="rounded-[14px] border border-border-subtle bg-surface p-6">
        <p className="text-[12px] text-ink-muted">Loading lead…</p>
      </div>
    );
  }

  if (error || !funnel) {
    return (
      <div className="rounded-[14px] border border-signal-red-text/25 bg-signal-red/10 p-5">
        <p className="text-[12px] font-medium text-signal-red-text mb-2">Could not load lead</p>
        <p className="text-[11px] text-ink-secondary mb-3">{error || "Taking longer than expected — please try again."}</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void load()}
            className="px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
          >
            Retry
          </button>
          <Link href="/dashboard/leads" className="text-[11px] text-signal-blue-text hover:underline">
            Back to Leads
          </Link>
        </div>
      </div>
    );
  }

  return (
    <LeadView
      funnel={funnel}
      leads={sortedLeads}
      leadId={leadId}
      onLeadPatch={(id, patch) =>
        setFunnel((prev) =>
          prev ? { ...prev, leads: prev.leads.map((l: FunnelLead) => (l.id === id ? { ...l, ...patch } : l)) } : prev,
        )
      }
      onLeadsChanged={() => void load()}
    />
  );
}
