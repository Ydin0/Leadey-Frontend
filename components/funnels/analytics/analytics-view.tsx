"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, CalendarCheck } from "lucide-react";
import { OverallPerformance } from "./overall-performance";
import { ChannelPerformance } from "./channel-performance";
import { WorkflowPerformance } from "./workflow-performance";
import { SourcePerformance } from "./source-performance";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getFunnelAnalytics } from "@/lib/api/funnels";
import { qk } from "@/lib/queries/keys";
import type { FunnelMetrics, FunnelSource } from "@/lib/types/funnel";

interface AnalyticsViewProps {
  funnelId: string;
  metrics: FunnelMetrics;
  sources: FunnelSource[];
}

export function AnalyticsView({ funnelId, metrics, sources }: AnalyticsViewProps) {
  const isAuthReady = useAuthReady();
  const { data, isLoading } = useQuery({
    queryKey: qk.funnelAnalytics(funnelId),
    queryFn: () => getFunnelAnalytics(funnelId),
    enabled: isAuthReady && !!funnelId,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <OverallPerformance metrics={metrics} />

      {/* Meetings booked — a real outcome count from the campaign's activity. */}
      {data && data.meetingsBooked > 0 && (
        <div className="bg-surface rounded-[14px] border border-border-subtle p-4 flex items-center gap-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-signal-green/15 text-signal-green-text shrink-0">
            <CalendarCheck size={16} strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-[18px] font-semibold text-ink leading-none tabular-nums">{data.meetingsBooked}</p>
            <span className="text-[11px] text-ink-muted">meeting{data.meetingsBooked === 1 ? "" : "s"} booked from this campaign</span>
          </div>
        </div>
      )}

      {isLoading && !data ? (
        <div className="bg-surface rounded-[14px] border border-border-subtle p-8 flex items-center justify-center">
          <Loader2 size={18} className="animate-spin text-ink-muted" />
        </div>
      ) : data ? (
        <>
          <ChannelPerformance channels={data.channels} />
          <WorkflowPerformance workflows={data.workflows} />
        </>
      ) : null}

      <SourcePerformance sources={sources} />
    </div>
  );
}
