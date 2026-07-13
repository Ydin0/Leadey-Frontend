"use client";

import { Mail, Phone, Linkedin, MessageCircle, CheckSquare, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isTerminalStatus, getStatusLabel } from "@/lib/utils/lead-status";
import type { FunnelStep, FunnelChannel, FunnelLeadEvent } from "@/lib/types/funnel";

const CHANNEL_ICON: Record<FunnelChannel, typeof Mail> = {
  email: Mail,
  call: Phone,
  linkedin: Linkedin,
  whatsapp: MessageCircle,
  sms: MessageCircle,
  task: CheckSquare,
};

const CHANNEL_CTA: Record<FunnelChannel, string> = {
  email: "Send email",
  call: "Log call",
  linkedin: "Send message",
  whatsapp: "Send message",
  sms: "Send text",
  task: "Complete task",
};

interface LeadStepTrackerProps {
  steps: FunnelStep[];
  currentStep: number;
  totalSteps: number;
  status: string;
  events?: FunnelLeadEvent[];
  /** Fired when the rep completes the current step's matching action. */
  onCompleteStep: (step: FunnelStep, index: number) => void;
  busy?: boolean;
}

export function LeadStepTracker({
  steps,
  currentStep,
  status,
  events = [],
  onCompleteStep,
  busy = false,
}: LeadStepTrackerProps) {
  if (!steps.length) return null;

  const currentIndex = Math.min(Math.max(currentStep - 1, 0), steps.length - 1);
  const terminal = isTerminalStatus(status);
  const completedCount = terminal ? steps.length : currentIndex;

  function outcomeForStep(i: number): string | null {
    const ev = [...events].reverse().find((e) => e.stepIndex === i && e.outcome);
    return ev?.outcome ?? null;
  }

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] uppercase tracking-wider text-ink-secondary font-medium">
          Campaign Progress
        </h3>
        <span className="text-[10px] text-ink-muted">
          {completedCount}/{steps.length} steps
        </span>
      </div>

      <div className="relative">
        {steps.map((step, i) => {
          const Icon = CHANNEL_ICON[step.channel] ?? Mail;
          const isDone = i < currentIndex || terminal;
          const isCurrent = i === currentIndex && !terminal;
          const isLast = i === steps.length - 1;
          const outcome = outcomeForStep(i);

          return (
            <div key={step.id} className="flex gap-3 relative">
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute left-[13px] top-7 w-px h-[calc(100%-1rem)]",
                    isDone ? "bg-signal-green-text/40" : "bg-border-subtle",
                  )}
                />
              )}

              {/* Node */}
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center w-[27px] h-[27px] rounded-full shrink-0 border",
                  isDone
                    ? "bg-signal-green-text/15 border-signal-green-text/40 text-signal-green-text"
                    : isCurrent
                      ? "bg-signal-blue/15 border-signal-blue-text/50 text-signal-blue-text"
                      : "bg-section border-border-subtle text-ink-faint",
                )}
              >
                {isDone ? <Check size={13} strokeWidth={2.5} /> : <Icon size={12} strokeWidth={1.75} />}
              </div>

              {/* Body */}
              <div className={cn("flex-1 min-w-0 pb-4", isLast && "pb-0")}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-[12px] truncate",
                        isCurrent ? "font-semibold text-ink" : "font-medium text-ink-secondary",
                      )}
                    >
                      {step.label || `${step.channel} step`}
                    </p>
                    <p className="text-[10px] text-ink-faint capitalize">
                      {step.channel} · Day {step.dayOffset}
                      {outcome && <span className="ml-1 text-ink-muted">· {outcome}</span>}
                    </p>
                  </div>

                  {isCurrent && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onCompleteStep(step, i)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-ink text-on-ink text-[10px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50 shrink-0"
                    >
                      {busy ? <Loader2 size={10} className="animate-spin" /> : <Icon size={10} />}
                      {CHANNEL_CTA[step.channel] ?? "Complete"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {terminal && (
        <div className="mt-1 pt-3 border-t border-border-subtle">
          <span className="text-[11px] text-ink-muted">
            Sequence ended — lead marked{" "}
            <span className="font-medium text-ink">{getStatusLabel(status)}</span>.
          </span>
        </div>
      )}
    </div>
  );
}
