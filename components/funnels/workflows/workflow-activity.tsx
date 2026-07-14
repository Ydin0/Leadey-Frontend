"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, ChevronRight, AlertCircle, Clock, CheckCircle2, LogOut, Circle, X, RotateCcw } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { listEnrollments, listEnrollmentRuns, retryEnrollment } from "@/lib/api/workflows";
import type { Workflow, WorkflowEnrollment, WorkflowStepRun } from "@/lib/types/workflow";
import { NODE_TYPES, nodeSummary } from "./node-types";

/** Resolve a node id → a human label using the workflow graph. */
function useNodeLabels(workflow: Workflow) {
  return useMemo(() => {
    const m = new Map<string, string>();
    for (const n of workflow.graph.nodes) {
      const def = NODE_TYPES[n.type];
      const summary = nodeSummary(n.type, n.data);
      m.set(n.id, def ? `${def.label}${summary ? ` · ${summary}` : ""}` : n.type);
    }
    return m;
  }, [workflow.graph.nodes]);
}

function nextRunLabel(e: WorkflowEnrollment): string {
  if (e.status !== "active") return "";
  if (e.waitingFor) return `Waiting for ${e.waitingFor.replace(/_/g, " ")}`;
  if (!e.nextRunAt) return "Idle";
  const t = new Date(e.nextRunAt).getTime();
  if (t <= Date.now()) return "Processing now…";
  return `Next run ${formatRelativeTime(new Date(e.nextRunAt))}`;
}

const STATUS_META: Record<string, { label: string; cls: string; icon: typeof Circle }> = {
  active: { label: "In progress", cls: "bg-signal-blue/15 text-signal-blue-text", icon: Clock },
  completed: { label: "Completed", cls: "bg-signal-green/15 text-signal-green-text", icon: CheckCircle2 },
  exited: { label: "Exited", cls: "bg-signal-slate text-signal-slate-text", icon: LogOut },
  failed: { label: "Failed", cls: "bg-signal-red/15 text-signal-red-text", icon: AlertCircle },
};

export function WorkflowActivity({ funnelId, workflow, onClose }: { funnelId: string | null; workflow: Workflow; onClose: () => void }) {
  const [rows, setRows] = useState<WorkflowEnrollment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const labels = useNodeLabels(workflow);

  async function retry(id: string) {
    if (retrying) return;
    setRetrying(id);
    try {
      await retryEnrollment(funnelId, workflow.id, id);
      load();
    } finally {
      setRetrying(null);
    }
  }

  const load = () => {
    setLoading(true);
    listEnrollments(funnelId, workflow.id)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [funnelId, workflow.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = workflow.stats;
  const counts: [string, number][] = [
    ["In progress", s.active], ["Completed", s.completed], ["Exited", s.exited ?? 0], ["Failed", s.failed ?? 0],
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle shrink-0">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Activity</h2>
          <p className="text-[11px] text-ink-muted">{workflow.name} · runs every ~30s</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={load} title="Refresh" className="w-8 h-8 rounded-md flex items-center justify-center text-ink-muted hover:bg-hover"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /></button>
          <button onClick={onClose} className="w-8 h-8 rounded-md flex items-center justify-center text-ink-muted hover:bg-hover"><X size={16} /></button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 px-5 py-3 border-b border-border-subtle shrink-0">
        {counts.map(([l, n]) => (
          <div key={l} className="bg-section/50 border border-border-subtle rounded-[9px] px-2.5 py-2">
            <div className={cn("text-[16px] font-bold", l === "Failed" && n > 0 ? "text-signal-red-text" : "text-ink")}>{n}</div>
            <div className="text-[10px] text-ink-muted">{l}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && !rows ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={18} className="animate-spin text-ink-muted" /></div>
        ) : !rows || rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Circle size={18} className="text-ink-faint mb-2" />
            <p className="text-[12px] text-ink-muted">No leads have entered this workflow yet.</p>
            <p className="text-[11px] text-ink-faint mt-1">When a lead matches the trigger, it appears here.</p>
          </div>
        ) : (
          rows.map((e) => {
            const meta = STATUS_META[e.status] ?? STATUS_META.active;
            const StatusIcon = meta.icon;
            const open = expanded === e.id;
            return (
              <div key={e.id} className="border-b border-border-subtle">
                <div onClick={() => setExpanded(open ? null : e.id)} className="flex items-center gap-3 w-full px-5 py-3 hover:bg-hover/40 text-left cursor-pointer">
                  <ChevronRight size={14} className={cn("text-ink-faint shrink-0 transition-transform", open && "rotate-90")} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium text-ink truncate">{e.lead.name}{e.lead.company ? <span className="text-ink-muted font-normal"> · {e.lead.company}</span> : null}</div>
                    <div className="text-[11px] text-ink-muted truncate">
                      {e.status === "active" && e.currentNodeId ? `At: ${labels.get(e.currentNodeId) || "step"}` : meta.label}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full", meta.cls)}><StatusIcon size={10} /> {meta.label}</span>
                    {e.status === "active" && <div className="text-[10px] text-ink-faint mt-1">{nextRunLabel(e)}</div>}
                  </div>
                  {e.status !== "active" && (
                    <button
                      onClick={(ev) => { ev.stopPropagation(); void retry(e.id); }}
                      disabled={!!retrying}
                      title="Re-run this lead through the workflow"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover hover:text-ink transition-colors shrink-0 disabled:opacity-50"
                    >
                      {retrying === e.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                      Retry
                    </button>
                  )}
                </div>
                {e.status === "failed" && e.lastError && (
                  <div className="mx-5 mb-2 -mt-1 flex items-start gap-1.5 rounded-[8px] bg-signal-red/10 border border-signal-red-text/20 px-2.5 py-1.5">
                    <AlertCircle size={12} className="text-signal-red-text shrink-0 mt-0.5" />
                    <span className="text-[11px] text-signal-red-text">{e.lastError}</span>
                  </div>
                )}
                {open && <RunTimeline funnelId={funnelId} workflowId={workflow.id} enrollmentId={e.id} labels={labels} />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function RunTimeline({ funnelId, workflowId, enrollmentId, labels }: { funnelId: string | null; workflowId: string; enrollmentId: string; labels: Map<string, string> }) {
  const [runs, setRuns] = useState<WorkflowStepRun[] | null>(null);
  useEffect(() => {
    listEnrollmentRuns(funnelId, workflowId, enrollmentId).then(setRuns).catch(() => setRuns([]));
  }, [funnelId, workflowId, enrollmentId]);
  if (!runs) return <div className="px-5 pb-3 pl-12"><Loader2 size={13} className="animate-spin text-ink-muted" /></div>;
  if (runs.length === 0) return <div className="px-5 pb-3 pl-12 text-[11px] text-ink-faint">No steps run yet.</div>;
  return (
    <div className="px-5 pb-3 pl-12 flex flex-col gap-1.5">
      {runs.map((r) => {
        const dot = r.status === "failed" ? "bg-signal-red-text" : r.status === "skipped" ? "bg-ink-faint" : "bg-signal-green-text";
        const err = (r.detail?.error || r.detail?.reason) as string | undefined;
        return (
          <div key={r.id} className="flex items-start gap-2.5">
            <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", dot)} />
            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] text-ink-secondary truncate">{labels.get(r.nodeId) || r.type}</div>
              <div className="text-[10px] text-ink-faint">
                {r.status}{err ? ` · ${err}` : ""} · {formatRelativeTime(new Date(r.ranAt))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
