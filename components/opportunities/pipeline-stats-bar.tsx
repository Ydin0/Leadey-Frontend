"use client";

import { DollarSign, Target, TrendingUp, Award } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { OpportunitySummary } from "@/lib/types/opportunity";

interface PipelineStatsBarProps {
  summary: OpportunitySummary | null;
  loading?: boolean;
}

/** Top-of-page stat strip for the kanban. Reads from the backend
 *  summary endpoint instead of computing client-side, so it includes
 *  closed opps that aren't in the current pipeline filter. */
export function PipelineStatsBar({ summary, loading }: PipelineStatsBarProps) {
  const stats = [
    {
      icon: DollarSign,
      label: "Pipeline",
      value: summary ? formatCurrency(summary.totalValue, "USD", { compact: true }) : "—",
      sub: summary ? `${summary.openCount} open` : "",
    },
    {
      icon: TrendingUp,
      label: "Weighted",
      value: summary ? formatCurrency(summary.weightedValue, "USD", { compact: true }) : "—",
      sub: "by probability",
    },
    {
      icon: Award,
      label: "Won this month",
      value: summary ? formatCurrency(summary.wonThisMonth.totalValue, "USD", { compact: true }) : "—",
      sub: summary ? `${summary.wonThisMonth.count} deals` : "",
    },
    {
      icon: Target,
      label: "Win rate (90d)",
      value: summary ? `${Math.round(summary.winRate * 100)}%` : "—",
      sub: summary ? `avg ${formatCurrency(summary.avgDealSize, "USD", { compact: true })}` : "",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="card-brand bg-surface rounded-[12px] px-4 py-3"
          >
            <div className="flex items-center gap-2 text-ink-muted mb-1.5">
              <Icon size={12} strokeWidth={1.5} />
              <span className="text-[10px] uppercase tracking-wider font-medium">
                {s.label}
              </span>
            </div>
            <p className="text-[18px] font-semibold text-ink">
              {loading ? "…" : s.value}
            </p>
            {s.sub && (
              <p className="text-[11px] text-ink-muted mt-0.5">{s.sub}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
