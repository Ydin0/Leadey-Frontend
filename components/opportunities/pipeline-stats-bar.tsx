"use client";

import { DollarSign, Target, TrendingUp, Award } from "lucide-react";
import type { Opportunity } from "@/lib/types/opportunity";

interface PipelineStatsBarProps {
  opportunities: Opportunity[];
}

export function PipelineStatsBar({ opportunities }: PipelineStatsBarProps) {
  const active = opportunities.filter((o) => o.stage !== "won" && o.stage !== "lost");
  const won = opportunities.filter((o) => o.stage === "won");
  const lost = opportunities.filter((o) => o.stage === "lost");
  const closed = won.length + lost.length;

  const totalPipeline = active.reduce((sum, o) => sum + o.annualValue, 0);
  const weightedPipeline = active.reduce((sum, o) => sum + (o.annualValue * o.probability) / 100, 0);
  const winRate = closed > 0 ? Math.round((won.length / closed) * 100) : 0;
  const avgDealSize = won.length > 0 ? Math.round(won.reduce((sum, o) => sum + o.annualValue, 0) / won.length) : 0;

  const stats = [
    { label: "Total Pipeline", value: `$${(totalPipeline / 1000).toFixed(0)}k`, icon: DollarSign, color: "text-signal-blue-text" },
    { label: "Weighted", value: `$${(weightedPipeline / 1000).toFixed(0)}k`, icon: TrendingUp, color: "text-signal-green-text" },
    { label: "Open Opps", value: active.length.toString(), icon: Target, color: "text-ink-secondary" },
    { label: "Win Rate", value: `${winRate}%`, icon: Award, color: "text-signal-green-text" },
    { label: "Avg Deal", value: avgDealSize > 0 ? `$${(avgDealSize / 1000).toFixed(1)}k` : "$0", icon: DollarSign, color: "text-ink-secondary" },
  ];

  return (
    <div className="flex items-center gap-4 bg-surface rounded-[14px] border border-border-subtle px-4 py-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="flex items-center gap-2">
            <Icon size={14} strokeWidth={1.5} className={stat.color} />
            <div>
              <p className="text-[10px] text-ink-muted font-medium uppercase tracking-wider">{stat.label}</p>
              <p className="text-[14px] font-semibold text-ink">{stat.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
