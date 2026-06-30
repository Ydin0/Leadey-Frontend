"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Play, Pause, Trash2 } from "lucide-react";

import { useAuthReady } from "@/components/providers/auth-token-sync";
import { FunnelStatusBadge } from "@/components/funnels/funnel-status-badge";
import { FunnelStepPipeline } from "@/components/funnels/dashboard/funnel-step-pipeline";
import { FunnelStatsBar } from "@/components/funnels/dashboard/funnel-stats-bar";
import { FunnelTabNav, type FunnelTab } from "@/components/funnels/dashboard/funnel-tab-nav";

import { FunnelLeadTable } from "@/components/funnels/leads/funnel-lead-table";
import type { FilterGroup } from "@/lib/types/lead-filter";
import { LeadSortMenu } from "@/components/funnels/leads/lead-sort-menu";
import { CockpitView } from "@/components/funnels/cockpit/cockpit-view";
import { AnalyticsView } from "@/components/funnels/analytics/analytics-view";
import { EmailPerformancePanel } from "@/components/funnels/email-performance-panel";
import { AddLeadsModal } from "@/components/funnels/add-leads/add-leads-modal";
import { AddLeadsButton, type AddLeadsSource } from "@/components/funnels/add-leads/add-leads-button";
import { NewLeadModal } from "@/components/funnels/add-leads/new-lead-modal";
import { FunnelMembersPanel } from "@/components/funnels/members/funnel-members-panel";
import { DialerLauncherButton } from "@/components/dialer/launcher/dialer-launcher-button";
import { getFunnelById, updateFunnelStatus, deleteFunnel, backfillCompanyData } from "@/lib/api/funnels";
import { sortLeads, DEFAULT_LEAD_SORT, type LeadSortKey } from "@/lib/utils/sort-leads";
import type { Funnel, FunnelStatus } from "@/lib/types/funnel";

const SORT_STORAGE_KEY = "leadey:campaign-lead-sort";

/** Stale-while-revalidate cache so re-opening a campaign renders instantly
 *  from memory while a fresh copy loads in the background. Lives for the
 *  browser session. */
const funnelCache = new Map<string, Funnel>();
/** Org-wide company backfill is expensive — only ever attempt it once per
 *  page session, and never on the critical render path. */
let backfillAttempted = false;

export default function FunnelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const funnelId = params.id as string;

  const [activeTab, setActiveTab] = useState<FunnelTab>("leads");
  const [showAddLeads, setShowAddLeads] = useState(false);
  const [addLeadsSource, setAddLeadsSource] = useState<AddLeadsSource | undefined>(undefined);
  const [showNewLead, setShowNewLead] = useState(false);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  // Full funnel (with per-lead events) — lazily loaded only when the Cockpit or
  // Analytics tab needs it, so the default Leads view stays fast.
  const [fullFunnel, setFullFunnel] = useState<Funnel | null>(null);
  const fullLoadStartedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sortBy, setSortBy] = useState<LeadSortKey>(DEFAULT_LEAD_SORT);
  const isAuthReady = useAuthReady();

  // Persist the sort preference so the order is stable across navigation.
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(SORT_STORAGE_KEY) : null;
    if (saved) setSortBy(saved as LeadSortKey);
  }, []);
  const changeSort = useCallback((key: LeadSortKey) => {
    setSortBy(key);
    if (typeof window !== "undefined") window.localStorage.setItem(SORT_STORAGE_KEY, key);
  }, []);

  // Deterministically sorted leads — shared by the table AND the focus view so
  // their order always matches and never flip-flops between renders.
  const sortedLeads = useMemo(
    () => (funnel ? sortLeads(funnel.leads, sortBy) : []),
    [funnel, sortBy],
  );

  const loadFunnel = useCallback(async () => {
    if (!funnelId) return;

    // Instant paint from cache (stale-while-revalidate). Only show the
    // "Loading…" state when we have nothing cached for this campaign.
    const cached = funnelCache.get(funnelId);
    if (cached) {
      setFunnel(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Lite load — the leads table doesn't need per-lead events / long company
      // descriptions, so skip them. The Cockpit/Analytics tabs lazily load the
      // full funnel (with events) when opened.
      const data = await getFunnelById(funnelId, { lite: true });
      funnelCache.set(funnelId, data);
      setFunnel(data);
      setLoading(false);

      // Backfill missing company data from scraper signals in the BACKGROUND —
      // never block the render on it (it scans the whole org). Run at most once
      // per session and only refresh if it actually changed anything.
      const hasMissingData = data.leads.some((l) => l.company && !l.companyDomain && !l.companyIndustry);
      if (hasMissingData && !backfillAttempted) {
        backfillAttempted = true;
        void backfillCompanyData()
          .then(async (result) => {
            if (result.updated > 0) {
              const refreshed = await getFunnelById(funnelId, { lite: true });
              funnelCache.set(funnelId, refreshed);
              setFunnel(refreshed);
            }
          })
          .catch(() => {});
      }
    } catch (err) {
      // Keep showing cached data on a refresh error rather than blanking out.
      if (!funnelCache.get(funnelId)) {
        const message = err instanceof Error ? err.message : "Failed to load funnel";
        setError(message);
        setFunnel(null);
      }
      setLoading(false);
    }
  }, [funnelId]);

  const handleDelete = useCallback(async () => {
    if (!funnelId) return;
    setDeleting(true);
    try {
      await deleteFunnel(funnelId);
      router.push("/dashboard/funnels");
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [funnelId, router]);

  const handleStatusChange = useCallback(async (newStatus: FunnelStatus) => {
    if (!funnelId) return;
    setStatusChanging(true);
    try {
      const updated = await updateFunnelStatus(funnelId, newStatus);
      setFunnel(updated);
    } catch {
      // reload to sync state
      void loadFunnel();
    } finally {
      setStatusChanging(false);
    }
  }, [funnelId, loadFunnel]);

  useEffect(() => {
    if (!isAuthReady) return;
    void loadFunnel();
  }, [isAuthReady, loadFunnel]);

  // Cockpit + Analytics need per-lead events, which the lite load omits — fetch
  // the full funnel once, the first time either tab is opened.
  useEffect(() => {
    if (activeTab !== "cockpit" && activeTab !== "analytics") return;
    if (!isAuthReady || !funnelId || fullFunnel || fullLoadStartedRef.current) return;
    fullLoadStartedRef.current = true;
    let cancelled = false;
    void getFunnelById(funnelId)
      .then((data) => { if (!cancelled) setFullFunnel(data); })
      .catch(() => { fullLoadStartedRef.current = false; });
    return () => { cancelled = true; };
  }, [activeTab, isAuthReady, funnelId, fullFunnel]);

  // Keep the session cache in sync with any local mutation (status change,
  // edit, lead patch) so navigating away and back shows the latest state.
  useEffect(() => {
    if (funnel) funnelCache.set(funnelId, funnel);
  }, [funnel, funnelId]);

  if (loading) {
    return (
      <div className="rounded-[14px] border border-border-subtle bg-surface p-6">
        <p className="text-[12px] text-ink-muted">Loading funnel...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[14px] border border-signal-red-text/25 bg-signal-red/10 p-5">
        <p className="text-[12px] font-medium text-signal-red-text mb-2">
          Could not load funnel
        </p>
        <p className="text-[11px] text-ink-secondary mb-3">{error}</p>
        <button
          onClick={() => void loadFunnel()}
          className="px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="rounded-[14px] border border-border-subtle bg-surface p-6">
        <p className="text-[12px] text-ink-muted">Campaign not found.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <Link
          href="/dashboard/funnels"
          className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink transition-colors mb-3"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Back to Campaigns
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[18px] font-semibold text-ink">{funnel.name}</h1>
            <FunnelStatusBadge status={funnel.status} />
            {funnel.status === "draft" && (
              <button
                onClick={() => void handleStatusChange("active")}
                disabled={statusChanging}
                className="flex items-center gap-1 px-3 py-1 rounded-[20px] bg-signal-green text-signal-green-text text-[10px] font-medium hover:bg-signal-green/80 transition-colors disabled:opacity-50"
              >
                <Play size={11} strokeWidth={2} />
                Activate
              </button>
            )}
            {funnel.status === "active" && (
              <button
                onClick={() => void handleStatusChange("paused")}
                disabled={statusChanging}
                className="flex items-center gap-1 px-3 py-1 rounded-[20px] bg-signal-slate text-signal-slate-text text-[10px] font-medium hover:bg-signal-slate/80 transition-colors disabled:opacity-50"
              >
                <Pause size={11} strokeWidth={2} />
                Pause
              </button>
            )}
            {funnel.status === "paused" && (
              <button
                onClick={() => void handleStatusChange("active")}
                disabled={statusChanging}
                className="flex items-center gap-1 px-3 py-1 rounded-[20px] bg-signal-green text-signal-green-text text-[10px] font-medium hover:bg-signal-green/80 transition-colors disabled:opacity-50"
              >
                <Play size={11} strokeWidth={2} />
                Resume
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <FunnelMembersPanel funnelId={funnel.id} />
            <div className="w-px h-5 bg-border-subtle" />
            {/* Prominent power-dialer launcher — only renders if the
                campaign has at least one call step. */}
            <DialerLauncherButton steps={funnel.steps} funnelId={funnel.id} />
            <button
              onClick={() => router.push(`/dashboard/funnels/${funnel.id}/edit`)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle"
            >
              <Pencil size={12} strokeWidth={2} />
              Edit
            </button>
            <AddLeadsButton
              onIndividual={() => setShowNewLead(true)}
              onSource={(source) => { setAddLeadsSource(source); setShowAddLeads(true); }}
            />
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-md text-ink-muted hover:text-signal-red-text hover:bg-signal-red/10 transition-colors"
              title="Delete campaign"
            >
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Compact info bar: pipeline + stats on one line */}
      <div className="flex items-center gap-4 mb-4 overflow-x-auto no-scrollbar">
        <FunnelStepPipeline steps={funnel.steps} compact />
        <div className="w-px h-5 bg-border-subtle shrink-0" />
        <div className="flex items-center gap-3 text-[11px] shrink-0">
          <span><strong className="text-ink">{funnel.metrics.total}</strong> <span className="text-ink-muted">total</span></span>
          <span><strong className="text-ink">{funnel.metrics.active}</strong> <span className="text-ink-muted">active</span></span>
          <span><strong className="text-ink">{funnel.metrics.replied}</strong> <span className="text-ink-muted">replied</span></span>
          <span><strong className="text-ink">{funnel.metrics.replyRate}%</strong> <span className="text-ink-muted">reply</span></span>
          <span><strong className="text-ink">{funnel.metrics.bounced}</strong> <span className="text-ink-muted">bounced</span></span>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="mb-4">
        <FunnelTabNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      {activeTab === "leads" && (
        <FunnelLeadTable
          leads={sortedLeads}
          steps={funnel.steps}
          funnelId={funnel.id}
          initialFilters={funnel.config?.leadFilters as FilterGroup | undefined}
          sortBy={sortBy}
          onSortChange={changeSort}
          onLeadAdvanced={() => void loadFunnel()}
          onLeadClick={(index) => {
            const lead = sortedLeads[index];
            if (lead) router.push(`/dashboard/funnels/${funnel.id}/leads/${lead.id}`);
          }}
        />
      )}

      {activeTab === "cockpit" && (
        fullFunnel ? (
          <CockpitView
            cockpit={fullFunnel.cockpit}
            funnelId={funnel.id}
            onActionExecuted={() => { setFullFunnel(null); fullLoadStartedRef.current = false; void loadFunnel(); }}
          />
        ) : (
          <div className="rounded-[14px] border border-border-subtle bg-surface p-6">
            <p className="text-[12px] text-ink-muted">Loading cockpit…</p>
          </div>
        )
      )}

      {activeTab === "analytics" && (
        <div className="space-y-6">
          <AnalyticsView
            metrics={(fullFunnel ?? funnel).metrics}
            analyticsSteps={(fullFunnel ?? funnel).analyticsSteps}
            sources={(fullFunnel ?? funnel).sources}
          />
          <div>
            <h3 className="text-[13px] font-semibold text-ink mb-3">Email performance</h3>
            <EmailPerformancePanel funnelId={funnel.id} />
          </div>
        </div>
      )}

      {/* Add Leads Modal (bulk import sources) */}
      {showAddLeads && (
        <AddLeadsModal
          funnelId={funnel.id}
          initialSource={addLeadsSource}
          onClose={() => { setShowAddLeads(false); setAddLeadsSource(undefined); }}
          onLeadsImported={() => void loadFunnel()}
        />
      )}

      {/* Individual contact — quick create then open the new profile */}
      {showNewLead && (
        <NewLeadModal
          funnelId={funnel.id}
          onClose={() => setShowNewLead(false)}
          onCreated={(leadId) => {
            setShowNewLead(false);
            router.push(`/dashboard/funnels/${funnel.id}/leads/${leadId}`);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40">
          <div className="bg-surface rounded-[14px] border border-border-subtle p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-[14px] font-semibold text-ink mb-2">Delete campaign?</h3>
            <p className="text-[12px] text-ink-secondary mb-5">
              This will permanently delete <span className="font-medium text-ink">{funnel.name}</span> and all its leads, events, and import history. This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="px-4 py-1.5 rounded-[20px] bg-signal-red-text text-on-ink text-[11px] font-medium hover:bg-signal-red-text/90 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Campaign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
