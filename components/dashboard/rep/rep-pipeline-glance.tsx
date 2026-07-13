"use client";

import { useState, useMemo, useRef, useLayoutEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { Opportunity, Pipeline, PipelineStage } from "@/lib/types/opportunity";

const STAGE_PALETTE = [
  "var(--color-signal-slate-text)",
  "var(--color-signal-blue-text)",
  "var(--color-accent)",
  "var(--color-signal-green-text)",
  "var(--color-signal-red-text)",
];

interface RepPipelineGlanceProps {
  pipelines: Pipeline[];
  opps: Opportunity[];
}

/** One pipeline's at-a-glance figures, computed from the rep's opportunities. */
function computeView(pipeline: Pipeline, opps: Opportunity[]) {
  const stageById = new Map<string, PipelineStage>();
  for (const s of pipeline.stages) stageById.set(s.id, s);

  const openStages = pipeline.stages
    .filter((s) => s.type === "open")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const colorByStage = new Map<string, string>();
  openStages.forEach((s, i) => colorByStage.set(s.id, STAGE_PALETTE[i % STAGE_PALETTE.length]));

  const mine = opps.filter((o) => o.pipelineId === pipeline.id);
  const openOpps = mine.filter((o) => stageById.get(o.stageId)?.type === "open");

  let totalValue = 0;
  let weighted = 0;
  const counts = new Map<string, { count: number; totalValue: number }>();
  for (const o of openOpps) {
    const stage = stageById.get(o.stageId);
    const prob = o.probabilityOverride ?? stage?.defaultProbability ?? 0;
    totalValue += o.value;
    weighted += o.value * (prob / 100);
    const b = counts.get(o.stageId) || { count: 0, totalValue: 0 };
    b.count++;
    b.totalValue += o.value;
    counts.set(o.stageId, b);
  }

  const byStage = openStages
    .map((s) => ({
      stageId: s.id,
      label: s.label,
      color: colorByStage.get(s.id) || STAGE_PALETTE[0],
      count: counts.get(s.id)?.count || 0,
      totalValue: counts.get(s.id)?.totalValue || 0,
    }))
    .filter((s) => s.count > 0);

  const topDeals = [...openOpps].sort((a, b) => b.value - a.value).slice(0, 4);

  return { stageById, colorByStage, totalValue, weighted, openCount: openOpps.length, byStage, topDeals };
}

export function RepPipelineGlance({ pipelines, opps }: RepPipelineGlanceProps) {
  // Only surface pipelines the rep actually has deals in (fall back to the
  // first pipeline so the card never renders empty tabs).
  const tabs = useMemo(() => {
    const withOpps = pipelines.filter((p) => opps.some((o) => o.pipelineId === p.id));
    return withOpps.length ? withOpps : pipelines.slice(0, 1);
  }, [pipelines, opps]);

  // Default to the busiest pipeline (most open deals).
  const defaultId = useMemo(() => {
    let best = tabs[0]?.id ?? null;
    let bestOpen = -1;
    for (const p of tabs) {
      const open = opps.filter((o) => o.pipelineId === p.id).length;
      if (open > bestOpen) { bestOpen = open; best = p.id; }
    }
    return best;
  }, [tabs, opps]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = tabs.find((p) => p.id === (activeId ?? defaultId)) || tabs[0] || null;

  // Sliding underline indicator under the active tab.
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const el = active ? tabRefs.current[active.id] : null;
    // Measuring the active tab to slide the underline genuinely needs layout +
    // state; that's the whole point of the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [active?.id, tabs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) {
    return (
      <section className="bg-surface rounded-[14px] border border-border-subtle p-[18px]">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-[15px] font-semibold text-ink">Pipeline</h2>
          <Link href="/dashboard/opportunities" className="flex items-center gap-1 text-[12px] text-link font-medium hover:opacity-80">
            All <ArrowRight size={11} />
          </Link>
        </div>
        <p className="text-[12px] text-ink-muted py-2">No open opportunities yet.</p>
      </section>
    );
  }

  const v = computeView(active, opps);

  return (
    <section className="bg-surface rounded-[14px] border border-border-subtle p-[18px]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-semibold text-ink">Pipeline</h2>
        <Link
          href={`/dashboard/opportunities?pipeline=${encodeURIComponent(active.id)}`}
          className="flex items-center gap-1 text-[12px] text-link font-medium hover:opacity-80"
        >
          All <ArrowRight size={11} />
        </Link>
      </div>

      {/* Pipeline tabs with a sliding underline (hidden when there's only one) */}
      {tabs.length > 1 && (
        <div className="relative flex items-center gap-1 border-b border-border-subtle mb-3.5 -mx-0.5 overflow-x-auto no-scrollbar">
          {tabs.map((p) => {
            const isActive = p.id === active.id;
            return (
              <button
                key={p.id}
                ref={(el) => { tabRefs.current[p.id] = el; }}
                onClick={() => setActiveId(p.id)}
                className={cn(
                  "relative px-2.5 py-1.5 text-[12px] font-medium whitespace-nowrap transition-colors",
                  isActive ? "text-ink" : "text-ink-muted hover:text-ink-secondary",
                )}
              >
                {p.name}
              </button>
            );
          })}
          <span
            className="absolute -bottom-px h-[2px] rounded-full bg-accent transition-all duration-300 ease-out"
            style={{ left: indicator.left, width: indicator.width }}
          />
        </div>
      )}

      {/* Swappable pipeline body — re-animates on every pipeline switch. */}
      <div key={active.id} className="animate-pipeline-swap">
        {/* totals */}
        <div className="flex items-stretch gap-5 mb-4">
          <div>
            <div className="text-[22px] font-semibold tracking-[-0.02em] text-ink">
              {formatCurrency(v.totalValue, "USD", { compact: true })}
            </div>
            <div className="text-[11px] text-ink-muted">Open · {v.openCount} deals</div>
          </div>
          <div className="w-px self-stretch bg-border-subtle" />
          <div>
            <div className="text-[22px] font-semibold tracking-[-0.02em] text-accent">
              {formatCurrency(Math.round(v.weighted), "USD", { compact: true })}
            </div>
            <div className="text-[11px] text-ink-muted">Weighted</div>
          </div>
        </div>

        {/* stacked stage bar */}
        {v.byStage.length > 0 && (
          <>
            <div className="flex h-2 rounded-[4px] overflow-hidden gap-0.5 mb-2">
              {v.byStage.map((s) => (
                <div
                  key={s.stageId}
                  title={`${s.label} · ${formatCurrency(s.totalValue, "USD", { compact: true })}`}
                  style={{ flexGrow: s.totalValue || 0.001, backgroundColor: s.color, opacity: 0.9 }}
                />
              ))}
            </div>
            <div className="flex items-center gap-3.5 flex-wrap mb-4">
              {v.byStage.map((s) => (
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
          {v.topDeals.length ? (
            v.topDeals.map((o) => {
              const stage = v.stageById.get(o.stageId);
              const prob = o.probabilityOverride ?? stage?.defaultProbability ?? 0;
              return (
                <Link
                  key={o.id}
                  href={
                    o.sourceLeadId && o.funnelId
                      ? `/dashboard/funnels/${o.funnelId}/leads/${o.sourceLeadId}`
                      : `/dashboard/opportunities?pipeline=${encodeURIComponent(active.id)}`
                  }
                  className="flex items-center gap-2.5 px-2 py-2 rounded-[9px] hover:bg-section transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium text-ink truncate">{o.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="w-[7px] h-[7px] rounded-[2px] shrink-0"
                        style={{ backgroundColor: v.colorByStage.get(o.stageId) || STAGE_PALETTE[0] }}
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
            <p className="text-[12px] text-ink-muted py-2">No open opportunities in this pipeline.</p>
          )}
        </div>
      </div>
    </section>
  );
}
