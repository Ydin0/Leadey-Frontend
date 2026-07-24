import { Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CampaignAnalytics } from "@/lib/api/funnels";

const statusStyle: Record<string, string> = {
  active: "bg-signal-green text-signal-green-text",
  paused: "bg-signal-amber text-signal-amber-text",
  draft: "bg-signal-slate text-signal-slate-text",
};

export function WorkflowPerformance({ workflows }: { workflows: CampaignAnalytics["workflows"] }) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold text-ink mb-3">Workflow Performance</h3>
      <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
        {workflows.total === 0 ? (
          <p className="text-[12px] text-ink-muted text-center py-6">
            No workflows on this campaign yet. Build one in the Workflows tab to automate
            follow-ups — its enrollment funnel will show here.
          </p>
        ) : (
          <>
            {/* Totals across all workflows on the campaign */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pb-4 mb-4 border-b border-border-subtle">
              <Stat label="Enrolled" value={workflows.totals.enrolled} />
              <Stat label="Active" value={workflows.totals.active} tone="text-signal-blue-text" />
              <Stat label="Completed" value={workflows.totals.completed} tone="text-signal-green-text" />
              <Stat label="Exited" value={workflows.totals.exited} />
              <Stat label="Failed" value={workflows.totals.failed} tone={workflows.totals.failed > 0 ? "text-signal-red-text" : undefined} />
            </div>

            <div className="space-y-3">
              {workflows.items.map((w) => (
                <div key={w.id} className="flex items-center gap-3">
                  <Workflow size={13} strokeWidth={1.5} className="text-ink-muted shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-ink truncate">{w.name}</span>
                      <span className={cn("text-[9px] uppercase tracking-wide font-semibold rounded-full px-1.5 py-0.5 shrink-0", statusStyle[w.status] ?? statusStyle.draft)}>
                        {w.status}
                      </span>
                    </div>
                    {/* Enrollment funnel bar: active / completed / exited / failed */}
                    <div className="h-1.5 rounded-full bg-section overflow-hidden flex mt-1.5">
                      {w.enrolled > 0 ? (
                        <>
                          <span className="h-full bg-signal-blue-text" style={{ width: `${(w.active / w.enrolled) * 100}%` }} />
                          <span className="h-full bg-signal-green-text" style={{ width: `${(w.completed / w.enrolled) * 100}%` }} />
                          <span className="h-full bg-signal-slate-text/50" style={{ width: `${(w.exited / w.enrolled) * 100}%` }} />
                          <span className="h-full bg-signal-red-text" style={{ width: `${(w.failed / w.enrolled) * 100}%` }} />
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-[10px] text-ink-muted tabular-nums text-right shrink-0 w-[150px]">
                    {w.enrolled} enrolled · {w.active} active · {w.completed} done
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">{label}</span>
      <p className={cn("text-[18px] font-semibold mt-0.5 tabular-nums", tone ?? "text-ink")}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
