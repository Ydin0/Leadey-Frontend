"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { DiscoveryRunRow } from "@/lib/types/contact";

interface DiscoveryRunsListProps {
  runs: DiscoveryRunRow[];
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  succeeded: { icon: CheckCircle2, color: "text-signal-green-text", label: "Succeeded" },
  failed: { icon: XCircle, color: "text-signal-red-text", label: "Failed" },
  running: { icon: Loader2, color: "text-signal-blue-text", label: "Running" },
  pending: { icon: Clock, color: "text-ink-muted", label: "Pending" },
};

export function DiscoveryRunsList({ runs }: DiscoveryRunsListProps) {
  const [expanded, setExpanded] = useState(false);

  if (runs.length === 0) return null;

  return (
    <div className="mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[10px] font-medium text-ink-muted hover:text-ink-secondary transition-colors"
      >
        {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        Discovery Runs ({runs.length})
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          {runs.map((run) => {
            const cfg = statusConfig[run.status] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            const roles = Array.isArray(run.targetRoles) ? run.targetRoles.join(", ") : "";

            return (
              <div
                key={run.id}
                className="flex items-center gap-3 px-3 py-2 rounded-[10px] bg-section text-[11px]"
              >
                <div className={cn("flex items-center gap-1", cfg.color)}>
                  <StatusIcon size={11} className={run.status === "running" ? "animate-spin" : ""} />
                  <span className="font-medium">{cfg.label}</span>
                </div>
                <span className="text-ink-muted">
                  {run.companiesQueried} companies
                </span>
                <span className="text-ink-secondary font-medium">
                  {run.contactsFound} contacts
                </span>
                {roles && (
                  <span className="text-ink-muted truncate max-w-[200px]">
                    {roles}
                  </span>
                )}
                <span className="text-ink-faint ml-auto">
                  {run.startedAt ? formatRelativeTime(run.startedAt) : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
