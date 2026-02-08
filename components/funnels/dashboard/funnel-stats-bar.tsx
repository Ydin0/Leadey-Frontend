import { Users, Zap, MessageSquare, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import type { FunnelMetrics } from "@/lib/types/funnel";

function StatChip({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full border border-border-subtle shrink-0">
      <Icon size={14} strokeWidth={1.5} className="text-ink-muted shrink-0" />
      <span className="text-[13px] font-medium text-ink">{value}</span>
      <span className="text-[11px] text-ink-muted whitespace-nowrap">{label}</span>
    </div>
  );
}

export function FunnelStatsBar({ metrics }: { metrics: FunnelMetrics }) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
      <StatChip icon={Users} label="Total" value={String(metrics.total)} />
      <StatChip icon={Zap} label="Active" value={String(metrics.active)} />
      <StatChip icon={MessageSquare} label="Replied" value={String(metrics.replied)} />
      <StatChip icon={TrendingUp} label="Reply Rate" value={`${metrics.replyRate}%`} />
      <StatChip icon={AlertTriangle} label="Bounced" value={String(metrics.bounced)} />
      <StatChip icon={CheckCircle} label="Completed" value={String(metrics.completed)} />
    </div>
  );
}
