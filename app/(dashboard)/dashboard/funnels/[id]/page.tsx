"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings, UserPlus } from "lucide-react";

import { FunnelStatusBadge } from "@/components/funnels/funnel-status-badge";
import { FunnelStepPipeline } from "@/components/funnels/dashboard/funnel-step-pipeline";
import { FunnelStatsBar } from "@/components/funnels/dashboard/funnel-stats-bar";
import { FunnelTabNav, type FunnelTab } from "@/components/funnels/dashboard/funnel-tab-nav";

import { FunnelLeadTable } from "@/components/funnels/leads/funnel-lead-table";
import { CockpitView } from "@/components/funnels/cockpit/cockpit-view";
import { AnalyticsView } from "@/components/funnels/analytics/analytics-view";
import { AddLeadsModal } from "@/components/funnels/add-leads/add-leads-modal";
import { getFunnelById } from "@/lib/api/funnels";
import type { Funnel } from "@/lib/types/funnel";

export default function FunnelDetailPage() {
  const params = useParams();
  const funnelId = params.id as string;

  const [activeTab, setActiveTab] = useState<FunnelTab>("leads");
  const [showAddLeads, setShowAddLeads] = useState(false);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          </div>
        </div>
      </div>

      {/* Step Pipeline */}
      <div className="mb-4">
        <FunnelStepPipeline steps={funnel.steps} />
      </div>

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
        <FunnelLeadTable leads={funnel.leads} />
      )}

      {activeTab === "cockpit" && (
        <CockpitView cockpit={funnel.cockpit} />
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
    </div>
  );
}
