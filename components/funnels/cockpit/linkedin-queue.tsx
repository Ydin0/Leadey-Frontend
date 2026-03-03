"use client";

import { useState } from "react";
import {
  Linkedin,
  Copy,
  ExternalLink,
  SkipForward,
  Check,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CockpitLinkedInItem, LinkedInActionProgress } from "@/lib/types/funnel";
import { advanceLead } from "@/lib/api/funnels";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const ACTION_LABELS: Record<string, string> = {
  send_connection: "Connection requests",
  send_message: "Messages",
  view_profile: "Profile views",
};

type CardStatus = "idle" | "executing" | "done" | "skipped";

function LinkedInCard({
  item,
  funnelId,
  onDone,
  onSkip,
}: {
  item: CockpitLinkedInItem;
  funnelId: string;
  onDone: (leadId: string) => void;
  onSkip: (leadId: string) => void;
}) {
  const [status, setStatus] = useState<CardStatus>("idle");
  const [copied, setCopied] = useState(false);

  async function handleDone() {
    if (!funnelId || !item.leadId) return;
    setStatus("executing");
    try {
      await advanceLead(funnelId, item.leadId, "sent");
      setStatus("done");
      setTimeout(() => onDone(item.leadId), 600);
    } catch {
      setStatus("idle");
    }
  }

  async function handleSkip() {
    if (!funnelId || !item.leadId) return;
    setStatus("executing");
    try {
      await advanceLead(funnelId, item.leadId, "sent");
      setStatus("skipped");
      setTimeout(() => onSkip(item.leadId), 400);
    } catch {
      setStatus("idle");
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(item.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpenProfile() {
    window.open(item.profileUrl, "_blank", "noopener,noreferrer");
  }

  if (status === "done" || status === "skipped") return null;

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-section flex items-center justify-center shrink-0">
          <span className="text-[11px] font-medium text-ink-muted">
            {getInitials(item.name)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + type badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] font-medium text-ink">{item.name}</span>
            <span
              className={cn(
                "text-[10px] font-medium rounded-full px-2 py-0.5",
                item.type === "view"
                  ? "bg-signal-slate text-signal-slate-text"
                  : item.type === "connect"
                    ? "bg-signal-blue text-signal-blue-text"
                    : "bg-signal-green text-signal-green-text",
              )}
            >
              {item.type === "view"
                ? "View Profile"
                : item.type === "connect"
                  ? "Connect"
                  : "Message"}
            </span>
          </div>
          <p className="text-[11px] text-ink-muted mb-0.5">
            {item.title} at {item.company}
          </p>

          {/* Message preview (hidden for view_profile) */}
          {item.type !== "view" && item.message && (
            <p className="text-[11px] text-ink-secondary mt-2 leading-relaxed line-clamp-2">
              {item.message}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleOpenProfile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-ink text-on-ink text-[10px] font-medium hover:bg-ink/90 transition-colors"
            >
              <ExternalLink size={11} />
              Open LinkedIn
            </button>

            {item.type !== "view" && item.message && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[10px] font-medium hover:bg-hover transition-colors"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? "Copied" : "Copy Note"}
              </button>
            )}

            <button
              onClick={handleDone}
              disabled={status === "executing"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-signal-green/15 text-signal-green-text text-[10px] font-medium hover:bg-signal-green/25 transition-colors disabled:opacity-50"
            >
              {status === "executing" ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Check size={11} />
              )}
              Done
            </button>

            <button
              onClick={handleSkip}
              disabled={status === "executing"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section text-ink-muted text-[10px] font-medium hover:bg-hover transition-colors disabled:opacity-50"
            >
              <SkipForward size={11} />
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface LinkedInQueueProps {
  items: CockpitLinkedInItem[];
  linkedinProgress: Record<string, LinkedInActionProgress>;
  funnelId?: string;
  onActionExecuted?: () => void;
}

export function LinkedInQueue({
  items,
  linkedinProgress,
  funnelId,
  onActionExecuted,
}: LinkedInQueueProps) {
  const [localCompleted, setLocalCompleted] = useState<Record<string, number>>({});
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  // Determine the primary action type (the one with the most pending leads)
  const progressEntries = Object.entries(linkedinProgress);
  const primaryAction = progressEntries.length > 0
    ? progressEntries.reduce((a, b) => (b[1].totalPending > a[1].totalPending ? b : a))[0]
    : "send_connection";

  const primaryProgress = linkedinProgress[primaryAction] || { completed: 0, limit: 25, totalPending: 0 };
  const effectiveCompleted = primaryProgress.completed + (localCompleted[primaryAction] || 0);
  const dailyLimitReached = effectiveCompleted >= primaryProgress.limit;

  const visibleItems = items.filter((item) => !removedIds.has(item.leadId));

  function handleDone(leadId: string) {
    const item = items.find((i) => i.leadId === leadId);
    const action = item?.action || "send_connection";
    setLocalCompleted((prev) => ({
      ...prev,
      [action]: (prev[action] || 0) + 1,
    }));
    setRemovedIds((prev) => new Set(prev).add(leadId));
    onActionExecuted?.();
  }

  function handleSkip(leadId: string) {
    // Skip does NOT count toward daily progress
    setRemovedIds((prev) => new Set(prev).add(leadId));
    onActionExecuted?.();
  }

  if (items.length === 0 && progressEntries.length === 0) {
    return (
      <div className="bg-surface rounded-[14px] border border-border-subtle p-6 text-center">
        <Linkedin
          size={20}
          strokeWidth={1.5}
          className="text-ink-faint mx-auto mb-2"
        />
        <p className="text-[12px] text-ink-muted">No LinkedIn actions queued</p>
      </div>
    );
  }

  const totalPendingAfterToday = Math.max(
    0,
    primaryProgress.totalPending - (primaryProgress.limit - primaryProgress.completed),
  );

  return (
    <div>
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Linkedin size={14} strokeWidth={1.5} className="text-linkedin" />
          <h3 className="text-[13px] font-semibold text-ink">LinkedIn Queue</h3>
        </div>
        <span className="text-[11px] font-medium text-ink-muted">
          {effectiveCompleted}/{primaryProgress.limit} today
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="h-1.5 rounded-full bg-section overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              dailyLimitReached ? "bg-signal-green-text" : "bg-signal-blue-text",
            )}
            style={{
              width: `${Math.min(100, (effectiveCompleted / primaryProgress.limit) * 100)}%`,
            }}
          />
        </div>
      </div>

      <p className="text-[10px] text-ink-muted mb-4">
        {ACTION_LABELS[primaryAction] || primaryAction}
        {totalPendingAfterToday > 0 && (
          <> &middot; {totalPendingAfterToday} remaining after today</>
        )}
      </p>

      {/* Batch complete state */}
      {dailyLimitReached ? (
        <div className="bg-surface rounded-[14px] border border-signal-green-text/20 p-6 text-center">
          <CheckCircle2
            size={28}
            strokeWidth={1.5}
            className="text-signal-green-text mx-auto mb-3"
          />
          <p className="text-[13px] font-medium text-ink mb-1">
            Daily batch complete!
          </p>
          <p className="text-[11px] text-ink-muted">
            You have sent {effectiveCompleted} {ACTION_LABELS[primaryAction]?.toLowerCase() || "actions"} today.
            {totalPendingAfterToday > 0 && (
              <> {totalPendingAfterToday} more leads queued for the coming days.</>
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {funnelId &&
            visibleItems.map((item) => (
              <LinkedInCard
                key={item.id}
                item={item}
                funnelId={funnelId}
                onDone={handleDone}
                onSkip={handleSkip}
              />
            ))}
        </div>
      )}
    </div>
  );
}
