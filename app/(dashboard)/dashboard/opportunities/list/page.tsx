"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LayoutGrid, List, Loader2, Pencil } from "lucide-react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditOpportunityModal } from "@/components/opportunities/edit-opportunity-modal";
import { listPipelines, listOpportunities } from "@/lib/api/opportunities";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import type { Opportunity, Pipeline, PipelineStage } from "@/lib/types/opportunity";

export default function OpportunitiesListPage() {
  const isAuthReady = useAuthReady();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingOppId, setEditingOppId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [pl, oppsRes] = await Promise.all([
        listPipelines(),
        listOpportunities({}),
      ]);
      setPipelines(pl);
      setOpps(oppsRes.data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    void reload();
  }, [isAuthReady, reload]);

  const stageById = useMemo(() => {
    const map = new Map<string, PipelineStage>();
    for (const p of pipelines) for (const s of p.stages) map.set(s.id, s);
    return map;
  }, [pipelines]);

  const pipelineById = useMemo(() => {
    const map = new Map<string, Pipeline>();
    for (const p of pipelines) map.set(p.id, p);
    return map;
  }, [pipelines]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-semibold text-ink">Opportunities</h1>
          <p className="text-[12px] text-ink-muted mt-0.5">All deals across pipelines.</p>
        </div>
        <div className="flex items-center bg-section rounded-full p-0.5 border border-border-subtle">
          <Link
            href="/dashboard/opportunities"
            className="px-3 py-1 rounded-full text-[11px] font-medium text-ink-muted hover:text-ink flex items-center gap-1.5"
          >
            <LayoutGrid size={11} /> Board
          </Link>
          <button
            type="button"
            className="px-3 py-1 rounded-full text-[11px] font-medium bg-surface text-ink shadow-sm flex items-center gap-1.5"
          >
            <List size={11} /> List
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[12px] text-signal-red-text mb-3">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={18} className="animate-spin text-ink-muted" />
        </div>
      ) : opps.length === 0 ? (
        <div className="card-brand bg-surface rounded-[14px] p-12 text-center">
          <p className="text-[14px] font-medium text-ink mb-1">No opportunities yet</p>
          <p className="text-[12px] text-ink-muted">
            Convert a campaign lead to start tracking deals.
          </p>
        </div>
      ) : (
        <div className="card-brand bg-surface rounded-[14px] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Name</TableHead>
                <TableHead className="w-[120px]">Pipeline</TableHead>
                <TableHead className="w-[140px]">Stage</TableHead>
                <TableHead className="w-[120px] text-right">Value</TableHead>
                <TableHead className="w-[100px] text-right">Prob.</TableHead>
                <TableHead className="w-[120px]">Close date</TableHead>
                <TableHead className="w-[100px]">Updated</TableHead>
                <TableHead className="w-[44px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {opps.map((opp) => {
                const stage = stageById.get(opp.stageId);
                const pipeline = pipelineById.get(opp.pipelineId);
                const probability = opp.probabilityOverride ?? stage?.defaultProbability ?? 50;
                return (
                  <TableRow key={opp.id} className="group">
                    <TableCell className="overflow-hidden">
                      <Link
                        href={
                          opp.sourceLeadId && opp.funnelId
                            ? `/dashboard/funnels/${opp.funnelId}/leads/${opp.sourceLeadId}?from=opportunities&pipeline=${encodeURIComponent(opp.pipelineId)}`
                            : `/dashboard/opportunities`
                        }
                        className="text-[12px] font-medium text-ink hover:text-signal-blue-text truncate block"
                      >
                        {opp.name}
                      </Link>
                    </TableCell>
                    <TableCell className="overflow-hidden">
                      <span className="text-[11px] text-ink-secondary truncate block">
                        {pipeline?.name || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="overflow-hidden">
                      <StageBadge stage={stage} />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-[12px] font-medium text-ink">
                        {formatCurrency(opp.value, opp.currency, { compact: true })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-[11px] text-ink-secondary">{probability}%</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[11px] text-ink-secondary">
                        {opp.expectedCloseDate
                          ? new Date(opp.expectedCloseDate + "T00:00:00").toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[11px] text-ink-muted">
                        {formatRelativeTime(opp.updatedAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setEditingOppId(opp.id)}
                        title="Edit opportunity"
                        className="flex items-center justify-center w-7 h-7 rounded-md text-ink-faint opacity-0 group-hover:opacity-100 hover:text-ink hover:bg-hover transition-opacity"
                      >
                        <Pencil size={12} />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {editingOppId && (
        <EditOpportunityModal
          opportunityId={editingOppId}
          onClose={() => setEditingOppId(null)}
          onSaved={() => { setEditingOppId(null); void reload(); }}
          onDeleted={() => { setEditingOppId(null); void reload(); }}
        />
      )}
    </div>
  );
}

function StageBadge({ stage }: { stage: PipelineStage | undefined }) {
  if (!stage) return <span className="text-[10px] text-ink-faint">—</span>;
  const color =
    stage.type === "won"
      ? "bg-signal-green/15 text-signal-green-text"
      : stage.type === "lost"
        ? "bg-signal-red/15 text-signal-red-text"
        : "bg-signal-blue/15 text-signal-blue-text";
  return (
    <span className={`text-[10px] font-medium uppercase tracking-[0.06em] rounded-full px-2 py-0.5 ${color}`}>
      {stage.label}
    </span>
  );
}
