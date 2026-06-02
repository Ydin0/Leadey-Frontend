"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings, UserPlus, Play, Pause, Trash2 } from "lucide-react";

import { useAuthReady } from "@/components/providers/auth-token-sync";
import { FunnelStatusBadge } from "@/components/funnels/funnel-status-badge";
import { FunnelStepPipeline } from "@/components/funnels/dashboard/funnel-step-pipeline";
import { FunnelStatsBar } from "@/components/funnels/dashboard/funnel-stats-bar";
import { FunnelTabNav, type FunnelTab } from "@/components/funnels/dashboard/funnel-tab-nav";

import { FunnelLeadTable } from "@/components/funnels/leads/funnel-lead-table";
import { CockpitView } from "@/components/funnels/cockpit/cockpit-view";
import { AnalyticsView } from "@/components/funnels/analytics/analytics-view";
import { EmailPerformancePanel } from "@/components/funnels/email-performance-panel";
import { AddLeadsModal } from "@/components/funnels/add-leads/add-leads-modal";
import { LeadFocusView } from "@/components/funnels/focus/lead-focus-view";
import { FunnelMembersPanel } from "@/components/funnels/members/funnel-members-panel";
import { DialerLauncherButton } from "@/components/dialer/launcher/dialer-launcher-button";
import { focusDataMap } from "@/lib/mock-data/funnel-focus";
import { getFunnelById, updateFunnelStatus, deleteFunnel, backfillCompanyData } from "@/lib/api/funnels";
import type { Funnel, FunnelStatus } from "@/lib/types/funnel";

export default function FunnelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const funnelId = params.id as string;

  const [activeTab, setActiveTab] = useState<FunnelTab>("leads");
  const [showAddLeads, setShowAddLeads] = useState(false);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [focusLeadIndex, setFocusLeadIndex] = useState<number | null>(null);
  const isAuthReady = useAuthReady();

  const loadFunnel = useCallback(async () => {
    if (!funnelId) return;

    setLoading(true);
    setError(null);
    try {
      let data = await getFunnelById(funnelId);

      // Auto-backfill company data if any leads are missing it
      const hasMissingData = data.leads.some((l) => l.company && !l.companyDomain && !l.companyIndustry);
      if (hasMissingData) {
        try {
          const result = await backfillCompanyData();
          if (result.updated > 0) {
            data = await getFunnelById(funnelId);
          }
        } catch {}
      }

      setFunnel(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load funnel";
      setError(message);
      setFunnel(null);
    } finally {
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

  if (focusLeadIndex !== null) {
    return (
      <LeadFocusView
        leads={funnel.leads}
        focusData={focusDataMap}
        initialIndex={focusLeadIndex}
        funnelId={funnel.id}
        funnelName={funnel.name}
        steps={funnel.steps}
        onClose={() => setFocusLeadIndex(null)}
        onLeadPatch={(leadId, patch) =>
          setFunnel((prev) =>
            prev
              ? { ...prev, leads: prev.leads.map((l) => (l.id === leadId ? { ...l, ...patch } : l)) }
              : prev,
          )
        }
      />
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
            <DialerLauncherButton steps={funnel.steps} />
            <button
              onClick={() => setShowAddLeads(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
            >
              <UserPlus size={12} strokeWidth={2} />
              Add Leads
            </button>
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
          leads={funnel.leads}
          funnelId={funnel.id}
          onLeadAdvanced={() => void loadFunnel()}
          onLeadClick={(index) => setFocusLeadIndex(index)}
        />
      )}

      {activeTab === "cockpit" && (
        <CockpitView
          cockpit={funnel.cockpit}
          funnelId={funnel.id}
          onActionExecuted={() => void loadFunnel()}
        />
      )}

      {activeTab === "analytics" && (
        <div className="space-y-6">
          <AnalyticsView
            metrics={funnel.metrics}
            analyticsSteps={funnel.analyticsSteps}
            sources={funnel.sources}
          />
          <div>
            <h3 className="text-[13px] font-semibold text-ink mb-3">Email performance</h3>
            <EmailPerformancePanel funnelId={funnel.id} />
          </div>
        </div>
      )}

      {/* Add Leads Modal */}
      {showAddLeads && (
        <AddLeadsModal
          funnelId={funnel.id}
          onClose={() => setShowAddLeads(false)}
          onLeadsImported={() => void loadFunnel()}
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
