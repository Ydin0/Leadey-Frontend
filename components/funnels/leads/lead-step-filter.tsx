"use client";

import { useEffect, useRef, useState } from "react";
import { Mail, Linkedin, Phone, MessageSquare, ChevronDown, Check, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FunnelStep, FunnelChannel } from "@/lib/types/funnel";

const channelIcon: Record<string, typeof Mail> = {
  email: Mail,
  linkedin: Linkedin,
  call: Phone,
  whatsapp: MessageSquare,
};

interface LeadStepFilterProps {
  steps: FunnelStep[];
  /** 1-based step number, or null for "all steps". */
  value: number | null;
  onChange: (step: number | null) => void;
}

export function LeadStepFilter({ steps, value, onChange }: LeadStepFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (steps.length === 0) return null;

  const active = value !== null;
  const current = active ? steps[value - 1] : null;
  const CurrentIcon = current ? channelIcon[(current.channel as FunnelChannel) ?? "email"] ?? GitBranch : GitBranch;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 h-8 rounded-full border text-[11px] font-medium transition-colors",
          active
            ? "bg-signal-blue/10 text-signal-blue-text border-signal-blue-text/20"
            : "bg-section text-ink-secondary border-border-subtle hover:bg-hover",
        )}
      >
        <CurrentIcon size={12} strokeWidth={1.5} className={active ? "text-signal-blue-text" : "text-ink-muted"} />
        {current ? `Step ${value}: ${current.label || current.channel}` : "Step"}
        <ChevronDown size={11} className="opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-surface rounded-[12px] border border-border-default shadow-xl py-1.5 max-h-72 overflow-y-auto">
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className={cn(
              "w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[12px] transition-colors hover:bg-hover",
              value === null ? "text-ink font-medium" : "text-ink-secondary",
            )}
          >
            All steps
            {value === null && <Check size={13} className="text-signal-green-text shrink-0" />}
          </button>
          <div className="my-1 border-t border-border-subtle" />
          {steps.map((step, i) => {
            const n = i + 1;
            const Icon = channelIcon[(step.channel as FunnelChannel) ?? "email"] ?? GitBranch;
            return (
              <button
                key={step.id}
                onClick={() => { onChange(n); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-hover",
                  value === n ? "bg-hover/40" : "",
                )}
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-section shrink-0">
                  <Icon size={12} strokeWidth={1.5} className="text-ink-muted" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] text-ink truncate">
                    Step {n}: {step.label || step.channel}
                  </span>
                  <span className="block text-[10px] text-ink-muted capitalize">
                    {step.channel} · Day {step.dayOffset}
                  </span>
                </span>
                {value === n && <Check size={13} className="text-signal-green-text shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
