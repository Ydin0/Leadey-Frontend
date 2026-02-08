import type { FunnelMetrics } from "@/lib/types/funnel";

export function OverallPerformance({ metrics }: { metrics: FunnelMetrics }) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold text-ink mb-3">Overall Performance</h3>
      <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Total Leads</span>
            <p className="text-[22px] font-semibold text-ink mt-1">{metrics.total}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Active</span>
            <p className="text-[22px] font-semibold text-ink mt-1">{metrics.active}</p>
            <p className="text-[10px] text-ink-muted">{metrics.total > 0 ? ((metrics.active / metrics.total) * 100).toFixed(1) : 0}% of total</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Reply Rate</span>
            <p className="text-[22px] font-semibold text-signal-green-text mt-1">{metrics.replyRate}%</p>
            <p className="text-[10px] text-ink-muted">{metrics.replied} replies</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6 mt-4 pt-3 border-t border-border-subtle">
          <div>
            <span className="text-[10px] text-ink-muted">Completed</span>
            <p className="text-[13px] font-medium text-ink">{metrics.completed}</p>
          </div>
          <div>
            <span className="text-[10px] text-ink-muted">Bounced</span>
            <p className="text-[13px] font-medium text-signal-red-text">{metrics.bounced}</p>
          </div>
          <div>
            <span className="text-[10px] text-ink-muted">Bounce Rate</span>
            <p className="text-[13px] font-medium text-ink">
              {metrics.total > 0 ? ((metrics.bounced / metrics.total) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
