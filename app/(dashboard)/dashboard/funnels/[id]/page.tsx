"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings, UserPlus, Play, Pause, Trash2 } from "lucide-react";

import { FunnelStatusBadge } from "@/components/funnels/funnel-status-badge";
import { FunnelStepPipeline } from "@/components/funnels/dashboard/funnel-step-pipeline";
import { FunnelStatsBar } from "@/components/funnels/dashboard/funnel-stats-bar";
import { FunnelTabNav, type FunnelTab } from "@/components/funnels/dashboard/funnel-tab-nav";

import { FunnelLeadTable } from "@/components/funnels/leads/funnel-lead-table";
import { CockpitView } from "@/components/funnels/cockpit/cockpit-view";
import { AnalyticsView } from "@/components/funnels/analytics/analytics-view";
import { AddLeadsModal } from "@/components/funnels/add-leads/add-leads-modal";
import { LeadFocusView } from "@/components/funnels/focus/lead-focus-view";
import { FunnelMembersPanel } from "@/components/funnels/members/funnel-members-panel";
import { focusDataMap } from "@/lib/mock-data/funnel-focus";
import { getFunnelById, updateFunnelStatus, deleteFunnel } from "@/lib/api/funnels";
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

  const loadFunnel = useCallback(async () => {
    if (!funnelId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getFunnelById(funnelId);
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
    void loadFunnel();
  }, [loadFunnel]);

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
        <p className="text-[12px] text-ink-muted">Funnel not found.</p>
      </div>
    );
  }

  if (focusLeadIndex !== null) {
    return (
      <LeadFocusView
        leads={funnel.leads}
        focusData={focusDataMap}
        initialIndex={focusLeadIndex}
        funnelName={funnel.name}
        onClose={() => setFocusLeadIndex(null)}
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
          Back to Funnels
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddLeads(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
            >
              <UserPlus size={13} strokeWidth={2} />
              Add Leads
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle">
              <Settings size={13} strokeWidth={1.5} />
              Edit Funnel
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-section text-signal-red-text text-[11px] font-medium hover:bg-signal-red/10 transition-colors border border-border-subtle"
            >
              <Trash2 size={13} strokeWidth={1.5} />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Step Pipeline */}
      <div className="mb-4">
        <FunnelStepPipeline steps={funnel.steps} />
      </div>

      {/* Members Panel */}
      {funnel.members.length > 0 && (
        <div className="mb-4">
          <FunnelMembersPanel members={funnel.members} />
        </div>
      )}

      {/* Stats Bar */}
      <div className="mb-4">
        <FunnelStatsBar metrics={funnel.metrics} />
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
        <AnalyticsView
          metrics={funnel.metrics}
          analyticsSteps={funnel.analyticsSteps}
          sources={funnel.sources}
        />
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
            <h3 className="text-[14px] font-semibold text-ink mb-2">Delete funnel?</h3>
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
                {deleting ? "Deleting..." : "Delete Funnel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
