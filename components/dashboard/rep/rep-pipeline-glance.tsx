"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Opportunity, OpportunitySummary, Pipeline, PipelineStage } from "@/lib/types/opportunity";

const STAGE_PALETTE = [
  "var(--color-signal-slate-text)",
  "var(--color-signal-blue-text)",
  "var(--color-accent)",
  "var(--color-signal-green-text)",
  "var(--color-signal-red-text)",
];

interface RepPipelineGlanceProps {
  summary: OpportunitySummary | null;
  pipelines: Pipeline[];
  opps: Opportunity[];
}

export function RepPipelineGlance({ summary, pipelines, opps }: RepPipelineGlanceProps) {
  const stageById = new Map<string, PipelineStage>();
  for (const p of pipelines) for (const s of p.stages) stageById.set(s.id, s);

  // Open stages, in pipeline order, each assigned a palette colour.
  const openStages = pipelines
    .flatMap((p) => p.stages)
    .filter((s) => s.type === "open")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const colorByStage = new Map<string, string>();
  openStages.forEach((s, i) => colorByStage.set(s.id, STAGE_PALETTE[i % STAGE_PALETTE.length]));

  const byStage = (summary?.byStage || [])
    .filter((b) => stageById.get(b.stageId)?.type === "open")
    .map((b) => ({
      ...b,
      label: stageById.get(b.stageId)?.label || "Stage",
      color: colorByStage.get(b.stageId) || STAGE_PALETTE[0],
    }));

  // Top open deals by value.
  const topDeals = opps
    .filter((o) => stageById.get(o.stageId)?.type === "open")
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  const totalValue = summary?.totalValue ?? 0;
  const weighted = summary?.weightedValue ?? 0;
  const openCount = summary?.openCount ?? 0;

  return (
    <section className="bg-surface rounded-[14px] border border-border-subtle p-[18px]">
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="text-[15px] font-semibold text-ink">Pipeline</h2>
        <Link href="/dashboard/opportunities" className="flex items-center gap-1 text-[12px] text-accent font-medium hover:opacity-80">
          All
          <ArrowRight size={11} />
        </Link>
      </div>

      {/* totals */}
      <div className="flex items-stretch gap-5 mb-4">
        <div>
          <div className="text-[22px] font-semibold tracking-[-0.02em] text-ink">
            {formatCurrency(totalValue, "USD", { compact: true })}
          </div>
          <div className="text-[11px] text-ink-muted">Open · {openCount} deals</div>
        </div>
        <div className="w-px self-stretch bg-border-subtle" />
        <div>
          <div className="text-[22px] font-semibold tracking-[-0.02em] text-accent">
            {formatCurrency(Math.round(weighted), "USD", { compact: true })}
          </div>
          <div className="text-[11px] text-ink-muted">Weighted</div>
        </div>
      </div>

      {/* stacked stage bar */}
      {byStage.length > 0 && (
        <>
          <div className="flex h-2 rounded-[4px] overflow-hidden gap-0.5 mb-2">
            {byStage.map((s) => (
              <div
                key={s.stageId}
                title={`${s.label} · ${formatCurrency(s.totalValue, "USD", { compact: true })}`}
                style={{ flexGrow: s.totalValue || 0.001, backgroundColor: s.color, opacity: 0.9 }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3.5 flex-wrap mb-4">
            {byStage.map((s) => (
              <span key={s.stageId} className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: s.color }} />
                <span className="text-ink-muted">{s.label}</span>
                <span className="font-medium text-ink">{s.count}</span>
              </span>
            ))}
          </div>
        </>
      )}

      {/* top deals */}
      <div className="flex flex-col gap-0.5">
        {topDeals.length ? (
          topDeals.map((o) => {
            const stage = stageById.get(o.stageId);
            const prob = o.probabilityOverride ?? stage?.defaultProbability ?? 0;
            return (
              <Link
                key={o.id}
                href={
                  o.sourceLeadId && o.funnelId
                    ? `/dashboard/funnels/${o.funnelId}/leads/${o.sourceLeadId}`
                    : `/dashboard/opportunities`
                }
                className="flex items-center gap-2.5 px-2 py-2 rounded-[9px] hover:bg-section transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium text-ink truncate">{o.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="w-[7px] h-[7px] rounded-[2px] shrink-0"
                      style={{ backgroundColor: colorByStage.get(o.stageId) || STAGE_PALETTE[0] }}
                    />
                    <span className="text-[10.5px] text-ink-muted">
                      {prob}%
                      {o.expectedCloseDate ? ` · closes ${new Date(o.expectedCloseDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}
                    </span>
                  </div>
                </div>
                <span className="text-[13px] font-semibold text-ink shrink-0">
                  {formatCurrency(o.value, o.currency, { compact: true })}
                </span>
              </Link>
            );
          })
        ) : (
          <p className="text-[12px] text-ink-muted py-2">No open opportunities yet.</p>
        )}
      </div>
    </section>
  );
}
