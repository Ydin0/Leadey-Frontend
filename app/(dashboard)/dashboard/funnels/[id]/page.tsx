"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Play, Pause, Trash2 } from "lucide-react";

import { FunnelStatusBadge } from "@/components/funnels/funnel-status-badge";
import { FunnelStepPipeline } from "@/components/funnels/dashboard/funnel-step-pipeline";
import { FunnelStatsBar } from "@/components/funnels/dashboard/funnel-stats-bar";
import { FunnelTabNav, type FunnelTab } from "@/components/funnels/dashboard/funnel-tab-nav";

import dynamic from "next/dynamic";
import { FunnelLeadTable } from "@/components/funnels/leads/funnel-lead-table";
import type { FilterGroup } from "@/lib/types/lead-filter";
import { LeadSortMenu } from "@/components/funnels/leads/lead-sort-menu";
import { EmailPerformancePanel } from "@/components/funnels/email-performance-panel";
import { AddLeadsButton, type AddLeadsSource } from "@/components/funnels/add-leads/add-leads-button";
import { NewLeadModal } from "@/components/funnels/add-leads/new-lead-modal";

// Secondary tab views + the import modal load on demand — the default Leads
// tab chunk stays lean (the analytics charts and workflow builder are heavy).
const CockpitView = dynamic(
  () => import("@/components/funnels/cockpit/cockpit-view").then((m) => m.CockpitView),
  { ssr: false },
);
const AnalyticsView = dynamic(
  () => import("@/components/funnels/analytics/analytics-view").then((m) => m.AnalyticsView),
  { ssr: false },
);
const WorkflowsView = dynamic(
  () => import("@/components/funnels/workflows/workflows-view").then((m) => m.WorkflowsView),
  { ssr: false },
);
const AddLeadsModal = dynamic(
  () => import("@/components/funnels/add-leads/add-leads-modal").then((m) => m.AddLeadsModal),
  { ssr: false },
);
import { FunnelMembersPanel } from "@/components/funnels/members/funnel-members-panel";
import { DialerLauncherButton } from "@/components/dialer/launcher/dialer-launcher-button";
import { updateFunnelStatus, deleteFunnel, backfillCompanyData, bulkDeleteLeads } from "@/lib/api/funnels";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useFunnel } from "@/lib/queries/use-funnel";
import { patchFunnel, invalidateFunnel } from "@/lib/queries/funnel-cache";
import { sortLeads, DEFAULT_LEAD_SORT, type LeadSortKey } from "@/lib/utils/sort-leads";
import type { FunnelStatus } from "@/lib/types/funnel";

const SORT_STORAGE_KEY = "leadey:campaign-lead-sort";

/** Org-wide company backfill is expensive — only ever attempt it once per
 *  page session, and never on the critical render path. */
let backfillAttempted = false;

export default function FunnelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const funnelId = params.id as string;

  const [activeTab, setActiveTab] = useState<FunnelTab>("leads");
  const [showAddLeads, setShowAddLeads] = useState(false);
  const [addLeadsSource, setAddLeadsSource] = useState<AddLeadsSource | undefined>(undefined);
  const [showNewLead, setShowNewLead] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Type-"delete" safety for campaign deletion (someone nuked a campaign by accident).
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [sortBy, setSortBy] = useState<LeadSortKey>(DEFAULT_LEAD_SORT);
  const { has } = usePermissions();

  // Bulk lead actions from the selection bar. "remove" = out of this campaign
  // only; "delete" = the person's enrollments everywhere (typed confirmation).
  const [bulkAction, setBulkAction] = useState<{ mode: "remove" | "delete"; ids: string[] } | null>(null);
  const [bulkConfirmText, setBulkConfirmText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // The campaign — served instantly from the shared cache (a previous visit,
  // the campaigns list, or a hover prefetch) while a fresh copy revalidates in
  // the background. `isPlaceholderData` means we're painting a stand-in (e.g.
  // the list row, which has no leads yet).
  const {
    data: funnel,
    isPending,
    isPlaceholderData,
    error: funnelError,
    refetch,
  } = useFunnel(funnelId, { lite: true });

  // Full funnel (with per-lead events) — lazily loaded only when the Cockpit or
  // Analytics tab needs it, so the default Leads view stays fast. Until it
  // lands, the lite variant serves as its placeholder.
  const { data: fullFunnel, isPlaceholderData: fullIsPlaceholder } = useFunnel(
    funnelId,
    {},
    { enabled: activeTab === "cockpit" || activeTab === "analytics" },
  );

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

  // Backfill missing company data from scraper signals in the BACKGROUND —
  // never block the render on it (it scans the whole org). Run at most once
  // per session and only refresh if it actually changed anything.
  useEffect(() => {
    if (!funnel || isPlaceholderData || backfillAttempted) return;
    const hasMissingData = funnel.leads.some((l) => l.company && !l.companyDomain && !l.companyIndustry);
    if (!hasMissingData) return;
    backfillAttempted = true;
    void backfillCompanyData()
      .then((result) => {
        if (result.updated > 0) invalidateFunnel(qc, funnelId);
      })
      .catch(() => {});
  }, [funnel, isPlaceholderData, funnelId, qc]);

  const handleDelete = useCallback(async () => {
    if (!funnelId) return;
    setDeleting(true);
    try {
      await deleteFunnel(funnelId);
      qc.removeQueries({ queryKey: ["funnel", funnelId] });
      void qc.invalidateQueries({ queryKey: ["funnels"] });
      router.push("/dashboard/funnels");
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [funnelId, router, qc]);

  const handleStatusChange = useCallback(async (newStatus: FunnelStatus) => {
    if (!funnelId) return;
    setStatusChanging(true);
    try {
      const updated = await updateFunnelStatus(funnelId, newStatus);
      // Update every cached variant + the list row (sidebar badge included).
      patchFunnel(qc, funnelId, updated);
    } catch {
      invalidateFunnel(qc, funnelId);
    } finally {
      setStatusChanging(false);
    }
  }, [funnelId, qc]);

  const refreshFunnel = useCallback(() => invalidateFunnel(qc, funnelId), [qc, funnelId]);

  const runBulkAction = useCallback(async () => {
    if (!bulkAction) return;
    setBulkBusy(true);
    setBulkError(null);
    try {
      await bulkDeleteLeads(funnelId, bulkAction.ids, bulkAction.mode === "delete" ? "everywhere" : "campaign");
      setBulkAction(null);
      setBulkConfirmText("");
      invalidateFunnel(qc, funnelId);
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : "Action failed — try again");
    } finally {
      setBulkBusy(false);
    }
  }, [bulkAction, funnelId, qc]);

  if (isPending && !funnel) {
    return (
      <div className="rounded-[14px] border border-border-subtle bg-surface p-6">
        <p className="text-[12px] text-ink-muted">Loading funnel...</p>
      </div>
    );
  }

  if (funnelError && !funnel) {
    return (
      <div className="rounded-[14px] border border-signal-red-text/25 bg-signal-red/10 p-5">
        <p className="text-[12px] font-medium text-signal-red-text mb-2">
          Could not load funnel
        </p>
        <p className="text-[11px] text-ink-secondary mb-3">
          {funnelError instanceof Error ? funnelError.message : "Failed to load funnel"}
        </p>
        <button
          onClick={() => void refetch()}
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
            {/* Prominent power-dialer launcher — dials the whole campaign,
                independent of the sequence steps. */}
            <DialerLauncherButton funnelId={funnel.id} />
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
            {has("campaigns.delete") && (
              <button
                onClick={() => { setDeleteConfirmText(""); setShowDeleteConfirm(true); }}
                className="p-1.5 rounded-md text-ink-muted hover:text-signal-red-text hover:bg-signal-red/10 transition-colors"
                title="Delete campaign"
              >
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            )}
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
        isPlaceholderData && sortedLeads.length === 0 ? (
          // Painting from a list-row placeholder (no leads yet) — show row
          // skeletons instead of a false "no leads" empty state.
          <div className="rounded-[14px] border border-border-subtle bg-surface p-4 space-y-2.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-9 rounded-[8px] bg-section animate-pulse" />
            ))}
          </div>
        ) : (
          <FunnelLeadTable
            leads={sortedLeads}
            steps={funnel.steps}
            funnelId={funnel.id}
            initialFilters={funnel.config?.leadFilters as FilterGroup | undefined}
            sortBy={sortBy}
            onSortChange={changeSort}
            onLeadAdvanced={refreshFunnel}
            onLeadClick={(index) => {
              const lead = sortedLeads[index];
              if (lead) router.push(`/dashboard/funnels/${funnel.id}/leads/${lead.id}`);
            }}
            onRemoveLeads={has("leads.delete") ? (ids) => { setBulkError(null); setBulkConfirmText(""); setBulkAction({ mode: "remove", ids }); } : undefined}
            onDeleteLeads={has("leads.delete") ? (ids) => { setBulkError(null); setBulkConfirmText(""); setBulkAction({ mode: "delete", ids }); } : undefined}
          />
        )
      )}

      {activeTab === "cockpit" && (
        fullFunnel && !(fullIsPlaceholder && !fullFunnel.cockpit) ? (
          <CockpitView
            cockpit={fullFunnel.cockpit}
            funnelId={funnel.id}
            onActionExecuted={refreshFunnel}
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

      {activeTab === "workflows" && (
        <WorkflowsView funnelId={funnel.id} />
      )}

      {/* Add Leads Modal (bulk import sources) */}
      {showAddLeads && (
        <AddLeadsModal
          funnelId={funnel.id}
          initialSource={addLeadsSource}
          onClose={() => { setShowAddLeads(false); setAddLeadsSource(undefined); }}
          onLeadsImported={refreshFunnel}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[3px]">
          <div className="bg-surface rounded-[14px] border border-border-subtle p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-[14px] font-semibold text-ink mb-2">Delete campaign?</h3>
            <p className="text-[12px] text-ink-secondary mb-4">
              This will permanently delete <span className="font-medium text-ink">{funnel.name}</span> and all its leads, events, and import history. This cannot be undone.
            </p>
            <label className="block text-[11px] text-ink-muted mb-1.5">
              Type <span className="font-semibold text-signal-red-text">delete</span> to confirm
            </label>
            <input
              autoFocus
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="delete"
              className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-signal-red-text/50 mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                disabled={deleting}
                className="px-4 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete()}
                disabled={deleting || deleteConfirmText.trim().toLowerCase() !== "delete"}
                className="px-4 py-1.5 rounded-[20px] bg-signal-red-text text-on-ink text-[11px] font-medium hover:bg-signal-red-text/90 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Campaign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk lead action confirmation — remove (soft) vs delete (typed). */}
      {bulkAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[3px]">
          <div className="bg-surface rounded-[14px] border border-border-subtle p-6 w-full max-w-sm shadow-xl">
            {bulkAction.mode === "remove" ? (
              <>
                <h3 className="text-[14px] font-semibold text-ink mb-2">
                  Remove {bulkAction.ids.length.toLocaleString()} lead{bulkAction.ids.length === 1 ? "" : "s"} from this campaign?
                </h3>
                <p className="text-[12px] text-ink-secondary mb-5">
                  They&apos;ll be taken out of <span className="font-medium text-ink">{funnel.name}</span> only —
                  they stay in any other campaigns and in your Leads list.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-[14px] font-semibold text-ink mb-2">
                  Delete {bulkAction.ids.length.toLocaleString()} lead{bulkAction.ids.length === 1 ? "" : "s"} permanently?
                </h3>
                <p className="text-[12px] text-ink-secondary mb-4">
                  This removes them from <span className="font-medium text-ink">every campaign</span> and your
                  Leads list, including their events, tasks and documents. This cannot be undone.
                </p>
                <label className="block text-[11px] text-ink-muted mb-1.5">
                  Type <span className="font-semibold text-signal-red-text">delete</span> to confirm
                </label>
                <input
                  autoFocus
                  value={bulkConfirmText}
                  onChange={(e) => setBulkConfirmText(e.target.value)}
                  placeholder="delete"
                  className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-signal-red-text/50 mb-4"
                />
              </>
            )}
            {bulkError && <p className="text-[11px] text-signal-red-text mb-3">{bulkError}</p>}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setBulkAction(null); setBulkConfirmText(""); }}
                disabled={bulkBusy}
                className="px-4 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void runBulkAction()}
                disabled={bulkBusy || (bulkAction.mode === "delete" && bulkConfirmText.trim().toLowerCase() !== "delete")}
                className={`px-4 py-1.5 rounded-[20px] text-[11px] font-medium transition-colors disabled:opacity-50 ${
                  bulkAction.mode === "delete"
                    ? "bg-signal-red-text text-on-ink hover:bg-signal-red-text/90"
                    : "bg-ink text-on-ink hover:bg-ink/90"
                }`}
              >
                {bulkBusy ? "Working…" : bulkAction.mode === "delete" ? "Delete leads" : "Remove from campaign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
