"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Workflow as WorkflowIcon, GitFork, CalendarClock, Briefcase, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { listAllWorkflows, createOrgWorkflow } from "@/lib/api/workflows";
import type { Workflow } from "@/lib/types/workflow";

/** Human label + icon for a workflow's trigger type (for the list badge). */
function triggerMeta(t?: string): { label: string; icon: typeof Zap } {
  switch (t) {
    case "meeting_upcoming": return { label: "Meeting upcoming", icon: CalendarClock };
    case "meeting_booked": return { label: "Meeting booked", icon: CalendarClock };
    case "opportunity_created": return { label: "Opportunity created", icon: Briefcase };
    case "opportunity_stage_changed": return { label: "Opportunity stage", icon: Briefcase };
    case "opportunity_won": return { label: "Opportunity won", icon: Briefcase };
    case "opportunity_lost": return { label: "Opportunity lost", icon: Briefcase };
    case "status_changed": return { label: "Status change", icon: Zap };
    case "tag_added": return { label: "Tag added", icon: Zap };
    case "reply_received": return { label: "Reply received", icon: Zap };
    case "manual": return { label: "Manual", icon: Zap };
    default: return { label: "Lead enters campaign", icon: Zap };
  }
}

const STATUS_PILL: Record<string, string> = {
  active: "bg-signal-green text-signal-green-text",
  paused: "bg-signal-slate text-signal-slate-text",
  draft: "bg-section text-ink-muted",
};

export default function WorkflowsPage() {
  const router = useRouter();
  const isAuthReady = useAuthReady();
  const [rows, setRows] = useState<Workflow[] | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    listAllWorkflows().then((r) => { if (!cancelled) setRows(r); }).catch(() => { if (!cancelled) setRows([]); });
    return () => { cancelled = true; };
  }, [isAuthReady]);

  async function newOrgWorkflow() {
    setCreating(true);
    try {
      const w = await createOrgWorkflow(`Workflow ${(rows?.length ?? 0) + 1}`, "Meeting upcoming");
      router.push(`/dashboard/workflows/${w.id}`);
    } finally {
      setCreating(false);
    }
  }

  const openWorkflow = (w: Workflow) => {
    if (w.funnelId) router.push(`/dashboard/funnels/${w.funnelId}?tab=workflows`);
    else router.push(`/dashboard/workflows/${w.id}`);
  };

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[18px] font-semibold text-ink">Workflows</h1>
          <p className="text-[12px] text-ink-muted">Every automation across your campaigns, plus org-level flows for meetings & opportunities.</p>
        </div>
        <button onClick={newOrgWorkflow} disabled={creating}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[12px] font-medium hover:bg-ink/90 disabled:opacity-50 shrink-0">
          {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} New workflow
        </button>
      </div>

      {rows === null ? (
        <div className="flex items-center justify-center py-24"><Loader2 size={20} className="animate-spin text-ink-muted" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-[16px] border border-border-subtle bg-surface p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-section flex items-center justify-center mx-auto mb-4"><WorkflowIcon size={20} className="text-ink-muted" /></div>
          <h3 className="text-[16px] font-semibold text-ink mb-1">No workflows yet</h3>
          <p className="text-[12px] text-ink-muted mb-5 max-w-md mx-auto">Create an org-level workflow (e.g. “15 min before a meeting, text + email the participant”), or add one inside a campaign from its Workflows tab.</p>
          <button onClick={newOrgWorkflow} disabled={creating} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[12px] font-medium hover:bg-ink/90 disabled:opacity-50">
            {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Create a workflow
          </button>
        </div>
      ) : (
        <div className="rounded-[14px] border border-border-subtle bg-surface overflow-hidden">
          {rows.map((w, i) => {
            const tm = triggerMeta(w.triggerType);
            const TIcon = tm.icon;
            return (
              <div
                key={w.id}
                role="button"
                tabIndex={0}
                onClick={() => openWorkflow(w)}
                onKeyDown={(e) => { if (e.key === "Enter") openWorkflow(w); }}
                className={cn("group w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-hover/40 transition-colors", i > 0 && "border-t border-border-subtle")}
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-[9px] bg-section text-ink-secondary shrink-0"><WorkflowIcon size={15} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-ink truncate">{w.name}</span>
                    <span className={cn("text-[9px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 shrink-0", STATUS_PILL[w.status] || STATUS_PILL.draft)}>{w.status}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 text-[10.5px] text-ink-muted"><TIcon size={11} /> {tm.label}</span>
                    <span className="text-ink-faint">·</span>
                    <span className="text-[10.5px] text-ink-faint">{w.stats.enrolled} enrolled · {w.stats.active} in progress</span>
                  </div>
                </div>
                {/* Which campaign it belongs to — or an Org-level badge. */}
                {w.funnelId ? (
                  <Link
                    href={`/dashboard/funnels/${w.funnelId}?tab=workflows`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full bg-accent/15 text-link text-[11px] font-medium hover:bg-accent/25 max-w-[220px]"
                    title={w.funnelName || "Campaign"}
                  >
                    <GitFork size={11} /> <span className="truncate">{w.funnelName || "Campaign"}</span>
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full bg-section border border-border-subtle text-ink-secondary text-[11px] font-medium">
                    <Zap size={11} /> Org-level
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
