import { TrendingUp, TrendingDown } from "lucide-react";
import type { QuickStat } from "@/lib/types";
import { cn } from "@/lib/utils";

export function QuickStatChip({ stat }: { stat: QuickStat }) {
  const Icon = stat.icon;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full border border-border-subtle shrink-0">
      <Icon size={14} strokeWidth={1.5} className={cn("shrink-0", stat.color)} />
      <span className="text-[13px] font-medium text-ink">{stat.value}</span>
      <span className="text-[11px] text-ink-muted whitespace-nowrap">{stat.label}</span>
      {stat.trend && stat.trend !== "neutral" && stat.trendValue && (
        <span className={cn(
          "flex items-center gap-0.5 text-[10px] font-medium",
          stat.trend === "up" ? "text-signal-green-text" : "text-signal-red-text"
        )}>
          {stat.trend === "up" ? (
            <TrendingUp size={10} strokeWidth={2} />
          ) : (
            <TrendingDown size={10} strokeWidth={2} />
          )}
          {stat.trendValue}
        </span>
      )}
    </div>
  );
}
