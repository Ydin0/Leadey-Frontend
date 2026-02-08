import { OverallPerformance } from "./overall-performance";
import { StepFunnelChart } from "./step-funnel-chart";
import { SourcePerformance } from "./source-performance";
import type { FunnelMetrics, FunnelAnalyticsStep, FunnelSource } from "@/lib/types/funnel";

interface AnalyticsViewProps {
  metrics: FunnelMetrics;
  analyticsSteps: FunnelAnalyticsStep[];
  sources: FunnelSource[];
}

export function AnalyticsView({ metrics, analyticsSteps, sources }: AnalyticsViewProps) {
  return (
    <div className="space-y-6">
      <OverallPerformance metrics={metrics} />
      <StepFunnelChart steps={analyticsSteps} />
      <SourcePerformance sources={sources} />
    </div>
  );
}
