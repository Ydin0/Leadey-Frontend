"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import { useAuthReady } from "@/components/providers/auth-token-sync";
import { LeadView } from "@/components/funnels/lead-view/lead-view";
import { useFunnel } from "@/lib/queries/use-funnel";
import { patchLead, invalidateFunnel } from "@/lib/queries/funnel-cache";
import { sortLeads, DEFAULT_LEAD_SORT, type LeadSortKey } from "@/lib/utils/sort-leads";
import type { FunnelLead } from "@/lib/types/funnel";

const SORT_STORAGE_KEY = "leadey:campaign-lead-sort";

export default function LeadViewPage() {
  const params = useParams();
  const funnelId = params.id as string;
  const leadId = params.leadId as string;
  const isAuthReady = useAuthReady();
  const qc = useQueryClient();

  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [sortBy, setSortBy] = useState<LeadSortKey>(DEFAULT_LEAD_SORT);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(SORT_STORAGE_KEY) : null;
    if (saved) setSortBy(saved as LeadSortKey);
  }, []);

  // The funnel, focused on this lead. Served from the shared React Query
  // cache: prev/next navigation changes only `fullLeadId` in the key, and the
  // placeholder falls back to the previous variant (or the campaign page's
  // lite load), so the switch paints instantly while the focused lead's full
  // events load in the background.
  const {
    data: funnel,
    isPending,
    error: funnelError,
    refetch,
  } = useFunnel(funnelId, { lite: true, fullLeadId: leadId });

  // Frozen navigation order for the focus session. The order is fixed when the
  // funnel first loads (and rebuilt only when the sort key changes); editing a
  // lead's status updates its DATA but must NOT yank it to a new position under
  // the rep — otherwise changing a status on lead 1/62 instantly drops it to
  // 62/62 and breaks prev/next. New leads are appended, removed ones dropped.
  // Leaving the focus view and returning remounts this page, which re-sorts.
  const orderRef = useRef<{ sort: LeadSortKey | null; ids: string[] }>({ sort: null, ids: [] });
  const sortedLeads = useMemo(() => {
    if (!funnel) return [] as FunnelLead[];
    const byId = new Map(funnel.leads.map((l) => [l.id, l]));
    const o = orderRef.current;
    if (o.sort !== sortBy || o.ids.length === 0) {
      // Cold load or the rep changed the sort → take a fresh ordering.
      o.sort = sortBy;
      o.ids = sortLeads(funnel.leads, sortBy).map((l) => l.id);
    } else {
      // Preserve the existing positions; append any new leads (freshly sorted)
      // and drop any that no longer exist.
      const known = new Set(o.ids);
      const appended = sortLeads(funnel.leads, sortBy)
        .filter((l) => !known.has(l.id))
        .map((l) => l.id);
      o.ids = [...o.ids.filter((id) => byId.has(id)), ...appended];
    }
    return o.ids.map((id) => byId.get(id)).filter(Boolean) as FunnelLead[];
  }, [funnel, sortBy]);

  // Safety net: never spin forever waiting on auth. If it hasn't become ready
  // within a few seconds, surface a recoverable state instead of an endless
  // "Loading lead…". The auth provider keeps retrying in the background, so a
  // Retry click typically succeeds without a full browser refresh.
  useEffect(() => {
    if (isAuthReady) {
      setAuthTimedOut(false);
      return;
    }
    const id = setTimeout(() => setAuthTimedOut(true), 6000);
    return () => clearTimeout(id);
  }, [isAuthReady]);

  const retry = useCallback(() => {
    setAuthTimedOut(false);
    void refetch();
  }, [refetch]);

  if (isPending && !funnel && !authTimedOut && !funnelError) {
    return (
      <div className="rounded-[14px] border border-border-subtle bg-surface p-6">
        <p className="text-[12px] text-ink-muted">Loading lead…</p>
      </div>
    );
  }

  if ((funnelError && !funnel) || authTimedOut || !funnel) {
    return (
      <div className="rounded-[14px] border border-signal-red-text/25 bg-signal-red/10 p-5">
        <p className="text-[12px] font-medium text-signal-red-text mb-2">
          Could not load lead
        </p>
        <p className="text-[11px] text-ink-secondary mb-3">
          {(funnelError instanceof Error ? funnelError.message : null) ||
            "Taking longer than expected — please try again."}
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
      onLeadPatch={(id, patch) => patchLead(qc, funnelId, id, patch)}
      onLeadsChanged={() => invalidateFunnel(qc, funnelId)}
    />
  );
}
