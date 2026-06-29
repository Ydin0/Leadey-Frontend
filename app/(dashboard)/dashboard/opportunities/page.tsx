"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, LayoutGrid, List, AlertCircle } from "lucide-react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { PipelineBoard } from "@/components/opportunities/pipeline-board";
import { PipelineTabs } from "@/components/opportunities/pipeline-tabs";
import { PipelineStatsBar } from "@/components/opportunities/pipeline-stats-bar";
import { OpportunityFilters } from "@/components/opportunities/opportunity-filters";
import { useTeamMembers } from "@/hooks/use-team-members";
import { listPipelines, listOpportunities, updateOpportunity } from "@/lib/api/opportunities";
import type {
  Pipeline,
  Opportunity,
  OpportunitySummary,
} from "@/lib/types/opportunity";

export default function OpportunitiesPage() {
  const isAuthReady = useAuthReady();

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [summary, setSummary] = useState<OpportunitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected owner ids to filter by; empty = all owners.
  const [ownerFilter, setOwnerFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Resolve each deal's owner to their initials so the card shows a colour-coded
  // rep avatar (gradient keyed by ownerId).
  const { resolveMember } = useTeamMembers();
  const resolveOwnerInitials = useCallback(
    (opp: Opportunity): string | null => {
      if (!opp.ownerId) return null;
      const name = resolveMember(opp.ownerId)?.name;
      if (!name) return null;
      return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || null;
    },
    [resolveMember],
  );

  // ── Load pipelines once auth is ready ──
  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listPipelines();
        if (cancelled) return;
        setPipelines(list);
        const def = list.find((p) => p.isDefault) || list[0] || null;
        setActivePipelineId(def?.id ?? null);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load pipelines");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthReady]);

  // ── Load opportunities whenever the filter set changes ──
  const reload = useCallback(async () => {
    if (!activePipelineId) {
      setOpportunities([]);
      setSummary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await listOpportunities({
        pipelineId: activePipelineId,
        ownerId: ownerFilter.length > 0 ? ownerFilter.join(",") : undefined,
        q: searchQuery.trim() || undefined,
        summary: true,
      });
      setOpportunities(result.data);
      setSummary(result.summary);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  }, [activePipelineId, ownerFilter, searchQuery]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const activePipeline = useMemo(
    () => pipelines.find((p) => p.id === activePipelineId) || null,
    [pipelines, activePipelineId],
  );

  // ── Drag handler — optimistic update + rollback on error ──
  async function handleMove(oppId: string, toStageId: string) {
    const prev = opportunities;
    setOpportunities((cur) =>
      cur.map((o) => (o.id === oppId ? { ...o, stageId: toStageId } : o)),
    );
    try {
      await updateOpportunity(oppId, { stageId: toStageId });
      // Refresh summary in the background so won/lost counters stay accurate
      void reload();
    } catch (err: any) {
      console.error("[opportunities] move failed:", err);
      setOpportunities(prev);
      setError(err?.message || "Move failed — try again");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-semibold text-ink">Opportunities</h1>
          <p className="text-[12px] text-ink-muted mt-0.5">
            Track deals through your pipeline stages and forecast revenue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-section rounded-full p-0.5 border border-border-subtle">
            <button
              type="button"
              className="px-3 py-1 rounded-full text-[11px] font-medium bg-surface text-ink shadow-sm flex items-center gap-1.5"
            >
              <LayoutGrid size={11} /> Board
            </button>
            <Link
              href="/dashboard/opportunities/list"
              className="px-3 py-1 rounded-full text-[11px] font-medium text-ink-muted hover:text-ink flex items-center gap-1.5"
            >
              <List size={11} /> List
            </Link>
          </div>
        </div>
      </div>

      <PipelineTabs
        pipelines={pipelines}
        activePipelineId={activePipelineId}
        onSelect={setActivePipelineId}
      />

      <PipelineStatsBar summary={summary} loading={loading} />

      <OpportunityFilters
        ownerFilter={ownerFilter}
        searchQuery={searchQuery}
        onOwnerChange={setOwnerFilter}
        onSearchChange={setSearchQuery}
      />

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-[10px] bg-signal-red/10 border border-signal-red-text/20 px-3 py-2">
          <AlertCircle size={13} className="text-signal-red-text shrink-0" />
          <p className="text-[12px] text-signal-red-text">{error}</p>
        </div>
      )}

      {loading && opportunities.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 size={18} className="animate-spin text-ink-muted" />
        </div>
      ) : !activePipeline ? (
        <div className="card-brand bg-surface rounded-[14px] p-12 text-center">
          <p className="text-[14px] font-medium text-ink mb-1">No pipeline configured</p>
          <p className="text-[12px] text-ink-muted">
            Visit Settings → Pipelines to create one.
          </p>
        </div>
      ) : opportunities.length === 0 ? (
        <EmptyBoard />
      ) : (
        <PipelineBoard
          pipeline={activePipeline}
          opportunities={opportunities}
          onMove={handleMove}
          resolveOwnerInitials={resolveOwnerInitials}
        />
      )}
    </div>
  );
}

function EmptyBoard() {
  return (
    <div className="card-brand bg-surface rounded-[14px] p-12 text-center max-w-2xl mx-auto">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 border border-border-subtle bg-[rgba(151,164,214,0.10)]">
        <LayoutGrid size={22} strokeWidth={1.5} className="text-[#97A4D6]" />
      </div>
      <h3 className="text-[16px] font-semibold text-ink mb-1">
        No opportunities yet
      </h3>
      <p className="text-[12px] text-ink-muted leading-[1.6] max-w-md mx-auto">
        Open a campaign, pick a qualified lead, and click{" "}
        <span className="font-medium text-ink">Convert to Opportunity</span>.
        The deal will appear in this pipeline so you can move it through
        stages, forecast value, and capture won/lost outcomes.
      </p>
      <Link
        href="/dashboard/funnels"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors mt-5"
      >
        Go to Campaigns
      </Link>
    </div>
  );
}
