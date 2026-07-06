"use client";

import { useState } from "react";
import { AlarmClock, Check, ChevronLeft, ChevronRight, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDueTasks } from "@/components/providers/due-tasks-provider";
import type { InboxTask } from "@/lib/api/tasks";

/** Relative "due 5m ago" / "due just now" label. */
function dueLabel(iso: string | null): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "due just now";
  if (mins < 60) return `overdue by ${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `overdue by ${hrs}h`;
  const days = Math.round(hrs / 24);
  return `overdue by ${days}d`;
}

/** Persistent, full-width bar under the header showing the current outstanding
 *  (past-due) task with quick actions. Stays until every due task is completed
 *  or deleted; steps through multiple due tasks with prev/next. */
export function DueTasksBanner() {
  const { dueTasks, current, index, next, prev, complete, remove, open } = useDueTasks();
  const [busy, setBusy] = useState<"complete" | "delete" | null>(null);

  if (!current) return null;

  const run = async (kind: "complete" | "delete", fn: () => Promise<void>) => {
    setBusy(kind);
    try { await fn(); } finally { setBusy(null); }
  };

  const contextBits = [current.leadName, current.company, current.campaignName].filter(Boolean) as string[];

  return (
    <div className="sticky top-14 z-20 shrink-0">
      <div className="flex items-center gap-3 px-4 py-2 bg-signal-red/10 border-b border-signal-red-text/25">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-signal-red/20 text-signal-red-text shrink-0">
          <AlarmClock size={14} strokeWidth={2} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-signal-red-text">
              Task due
            </span>
            <span className="text-[10.5px] text-ink-muted">{dueLabel(current.dueAt)}</span>
          </div>
          <p className="text-[12.5px] text-ink font-medium truncate">
            {current.label}
            {contextBits.length > 0 && (
              <span className="text-ink-muted font-normal"> · {contextBits.join(" · ")}</span>
            )}
          </p>
        </div>

        {/* Prev/next across multiple outstanding tasks */}
        {dueTasks.length > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={prev} title="Previous task" className="p-1 rounded-md text-ink-muted hover:bg-hover hover:text-ink transition-colors">
              <ChevronLeft size={15} />
            </button>
            <span className="text-[10.5px] text-ink-muted tabular-nums w-[46px] text-center">
              {index + 1} of {dueTasks.length}
            </span>
            <button onClick={next} title="Next task" className="p-1 rounded-md text-ink-muted hover:bg-hover hover:text-ink transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {current.leadId && current.funnelId && (
            <button
              onClick={() => open(current)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[16px] bg-surface border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors"
            >
              <ExternalLink size={11} /> Open
            </button>
          )}
          <button
            onClick={() => run("complete", () => complete(current))}
            disabled={!!busy}
            title="Mark complete"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[16px] bg-signal-green text-signal-green-text text-[11px] font-medium hover:bg-signal-green/80 transition-colors disabled:opacity-50"
          >
            {busy === "complete" ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} strokeWidth={2.5} />}
            Done
          </button>
          <button
            onClick={() => run("delete", () => remove(current))}
            disabled={!!busy}
            title="Delete task"
            className={cn("p-1.5 rounded-md text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10 transition-colors disabled:opacity-50")}
          >
            {busy === "delete" ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Transient top-right card that flashes (with sound, played by the provider)
 *  when a task first becomes due. Auto-dismisses; the banner keeps persisting. */
export function DueTaskAlert() {
  const { alert, dismissAlert, open } = useDueTasks();
  if (!alert) return null;
  const task: InboxTask = alert;
  const contextBits = [task.leadName, task.company].filter(Boolean) as string[];
  return (
    <div className="fixed top-16 right-4 z-50 w-[320px]">
      <div className="rounded-[12px] bg-surface border border-signal-red-text/30 shadow-xl overflow-hidden">
        <div className="flex items-start gap-2.5 p-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-signal-red/15 text-signal-red-text shrink-0">
            <AlarmClock size={15} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-signal-red-text mb-0.5">Task due now</p>
            <p className="text-[12.5px] text-ink font-medium leading-snug">{task.label}</p>
            {contextBits.length > 0 && <p className="text-[11px] text-ink-muted truncate mt-0.5">{contextBits.join(" · ")}</p>}
            {task.leadId && task.funnelId && (
              <button
                onClick={() => { open(task); dismissAlert(); }}
                className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-signal-blue-text hover:underline"
              >
                <ExternalLink size={11} /> Open
              </button>
            )}
          </div>
          <button onClick={dismissAlert} className="text-ink-faint hover:text-ink transition-colors shrink-0">
            <span className="text-[16px] leading-none">&times;</span>
          </button>
        </div>
      </div>
    </div>
  );
}
