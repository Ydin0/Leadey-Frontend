import { Mail, Linkedin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FunnelStep, FunnelChannel } from "@/lib/types/funnel";

const channelConfig: Record<FunnelChannel, { icon: typeof Mail; color: string; label: string }> = {
  email: { icon: Mail, color: "text-signal-blue-text", label: "Email" },
  linkedin: { icon: Linkedin, color: "text-linkedin", label: "LinkedIn" },
  call: { icon: Phone, color: "text-signal-green-text", label: "Call" },
};

interface FunnelStepPipelineProps {
  steps: FunnelStep[];
  compact?: boolean;
}

export function FunnelStepPipeline({ steps, compact = false }: FunnelStepPipelineProps) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto no-scrollbar">
      {steps.map((step, i) => {
        const config = channelConfig[step.channel];
        const Icon = config.icon;
        return (
          <div key={step.id} className="flex items-center shrink-0">
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface",
                compact ? "px-2 py-1" : "px-3 py-1.5"
              )}
            >
              <Icon size={compact ? 11 : 13} strokeWidth={1.5} className={config.color} />
              {!compact && (
                <span className="text-[11px] font-medium text-ink whitespace-nowrap">{step.label}</span>
              )}
              <span className={cn("text-ink-faint whitespace-nowrap", compact ? "text-[9px]" : "text-[10px]")}>
                Day {step.dayOffset}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-6 h-px bg-border-default shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
