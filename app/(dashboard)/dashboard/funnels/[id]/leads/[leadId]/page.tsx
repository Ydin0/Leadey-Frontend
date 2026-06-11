"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { useAuthReady } from "@/components/providers/auth-token-sync";
import { LeadView } from "@/components/funnels/lead-view/lead-view";
import { getFunnelById } from "@/lib/api/funnels";
import { sortLeads, DEFAULT_LEAD_SORT, type LeadSortKey } from "@/lib/utils/sort-leads";
import type { Funnel, FunnelLead } from "@/lib/types/funnel";

const SORT_STORAGE_KEY = "leadey:campaign-lead-sort";

export default function LeadViewPage() {
  const params = useParams();
  const funnelId = params.id as string;
  const leadId = params.leadId as string;
  const isAuthReady = useAuthReady();

  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [sortBy, setSortBy] = useState<LeadSortKey>(DEFAULT_LEAD_SORT);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(SORT_STORAGE_KEY) : null;
    if (saved) setSortBy(saved as LeadSortKey);
  }, []);

  // Keep the lead order identical to the campaign table / Leads tab.
  const sortedLeads = useMemo(
    () => (funnel ? sortLeads(funnel.leads, sortBy) : []),
    [funnel, sortBy],
  );

  const loadFunnel = useCallback(async () => {
    if (!funnelId) {
      setError("Missing campaign id.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getFunnelById(funnelId);
      setFunnel(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [funnelId]);

  useEffect(() => {
    if (!isAuthReady) return;
    setAuthTimedOut(false);
    void loadFunnel();
  }, [isAuthReady, loadFunnel]);

  // Safety net: never spin forever waiting on auth. If it hasn't become ready
  // within a few seconds, surface a recoverable state instead of an endless
  // "Loading lead…". The auth provider keeps retrying in the background, so a
  // Retry click typically succeeds without a full browser refresh.
  useEffect(() => {
    if (isAuthReady) return;
    const id = setTimeout(() => setAuthTimedOut(true), 6000);
    return () => clearTimeout(id);
  }, [isAuthReady]);

  const retry = useCallback(() => {
    setAuthTimedOut(false);
    void loadFunnel();
  }, [loadFunnel]);

  if (loading && !authTimedOut) {
    return (
      <div className="rounded-[14px] border border-border-subtle bg-surface p-6">
        <p className="text-[12px] text-ink-muted">Loading lead…</p>
      </div>
    );
  }

  if (error || authTimedOut || !funnel) {
    return (
      <div className="rounded-[14px] border border-signal-red-text/25 bg-signal-red/10 p-5">
        <p className="text-[12px] font-medium text-signal-red-text mb-2">
          Could not load lead
        </p>
        <p className="text-[11px] text-ink-secondary mb-3">
          {error || "Taking longer than expected — please try again."}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={retry}
            className="px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
          >
            Retry
          </button>
          <Link
            href="/dashboard/funnels"
            className="text-[11px] text-signal-blue-text hover:underline"
          >
            Back to Campaigns
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
          prev
            ? { ...prev, leads: prev.leads.map((l: FunnelLead) => (l.id === id ? { ...l, ...patch } : l)) }
            : prev,
        )
      }
      onLeadsChanged={() => void loadFunnel()}
    />
  );
}
