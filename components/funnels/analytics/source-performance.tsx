import { FileSpreadsheet, Radio, Webhook, Building2 } from "lucide-react";
import type { FunnelSource } from "@/lib/types/funnel";

const sourceIcon: Record<string, typeof FileSpreadsheet> = {
  csv: FileSpreadsheet,
  signals: Radio,
  webhook: Webhook,
  companies: Building2,
};

export function SourcePerformance({ sources }: { sources: FunnelSource[] }) {
  const totalLeads = sources.reduce((sum, s) => sum + s.count, 0);

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-ink mb-3">Performance by Source</h3>
      <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
        {sources.length === 0 ? (
          <p className="text-[12px] text-ink-muted text-center py-4">No sources configured</p>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => {
              const Icon = sourceIcon[source.type] || Radio;
              const pct = totalLeads > 0 ? ((source.count / totalLeads) * 100).toFixed(0) : 0;

              return (
                <div key={source.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon size={12} strokeWidth={1.5} className="text-ink-muted" />
                      <span className="text-[11px] font-medium text-ink">{source.label}</span>
                    </div>
                    <span className="text-[11px] text-ink-secondary">{source.count} leads ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-section overflow-hidden">
                    <div
                      className="h-full rounded-full bg-signal-blue-text"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
