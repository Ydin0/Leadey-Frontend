import { cn } from "@/lib/utils";
import type { ChannelHealthMetric } from "@/lib/types/channel";

const dotColors: Record<ChannelHealthMetric["status"], string> = {
  good: "bg-signal-green-text",
  warning: "bg-signal-blue-text",
  critical: "bg-signal-red-text",
  neutral: "bg-ink-faint",
};

interface ChannelMetricsRowProps {
  metrics: ChannelHealthMetric[];
}

export function ChannelMetricsRow({ metrics }: ChannelMetricsRowProps) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {metrics.map((metric) => (
        <div key={metric.label} className="flex items-center gap-1.5 text-[11px]">
          <span className={cn("w-1.5 h-1.5 rounded-full", dotColors[metric.status])} />
          <span className="text-ink-secondary">{metric.label}</span>
          <span className="text-ink font-medium">{metric.value}</span>
        </div>
      ))}
    </div>
  );
}
