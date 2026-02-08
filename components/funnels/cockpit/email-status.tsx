import { Mail } from "lucide-react";
import type { CockpitEmailSummary } from "@/lib/types/funnel";

export function EmailStatus({ summary }: { summary: CockpitEmailSummary }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Mail size={14} strokeWidth={1.5} className="text-signal-blue-text" />
        <h3 className="text-[13px] font-semibold text-ink">Auto-Email Status</h3>
      </div>
      <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Sent Today</span>
            <p className="text-[18px] font-semibold text-ink mt-0.5">{summary.sentToday}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Scheduled</span>
            <p className="text-[18px] font-semibold text-ink mt-0.5">{summary.scheduled}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Opened</span>
            <p className="text-[18px] font-semibold text-ink mt-0.5">{summary.opened}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-3 border-t border-border-subtle">
          <div>
            <span className="text-[10px] text-ink-muted">Open Rate</span>
            <p className="text-[13px] font-medium text-ink">{summary.openRate}%</p>
          </div>
          <div>
            <span className="text-[10px] text-ink-muted">Replied</span>
            <p className="text-[13px] font-medium text-signal-green-text">{summary.replied}</p>
          </div>
          <div>
            <span className="text-[10px] text-ink-muted">Reply Rate</span>
            <p className="text-[13px] font-medium text-ink">{summary.replyRate}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
