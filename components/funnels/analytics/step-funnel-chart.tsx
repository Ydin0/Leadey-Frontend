import { Mail, Linkedin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FunnelAnalyticsStep, FunnelChannel } from "@/lib/types/funnel";

const channelIcon: Record<FunnelChannel, typeof Mail> = {
  email: Mail,
  linkedin: Linkedin,
  call: Phone,
};

const channelColor: Record<FunnelChannel, string> = {
  email: "text-signal-blue-text",
  linkedin: "text-linkedin",
  call: "text-signal-green-text",
};

const barBg: Record<FunnelChannel, string> = {
  email: "bg-signal-blue-text",
  linkedin: "bg-linkedin",
  call: "bg-signal-green-text",
};

export function StepFunnelChart({ steps }: { steps: FunnelAnalyticsStep[] }) {
  const maxSent = Math.max(...steps.map((s) => s.sent), 1);

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-ink mb-3">Step-by-Step Performance</h3>
      <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <div className="space-y-4">
          {steps.map((step, i) => {
            const Icon = channelIcon[step.channel];
            const sentWidth = (step.sent / maxSent) * 100;
            const openedWidth = (step.opened / maxSent) * 100;
            const repliedWidth = (step.replied / maxSent) * 100;

            return (
              <div key={i}>
                {/* Label */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon size={12} strokeWidth={1.5} className={channelColor[step.channel]} />
                    <span className="text-[11px] font-medium text-ink">{step.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-ink-muted">
                    <span>{step.sent} sent</span>
                    <span>{step.openRate}% opened</span>
                    <span className="font-medium text-signal-green-text">{step.replyRate}% replied</span>
                  </div>
                </div>

                {/* Bars */}
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-section overflow-hidden">
                    <div
                      className={cn("h-full rounded-full opacity-30", barBg[step.channel])}
                      style={{ width: `${sentWidth}%` }}
                    />
                  </div>
                  <div className="h-2 rounded-full bg-section overflow-hidden">
                    <div
                      className={cn("h-full rounded-full opacity-60", barBg[step.channel])}
                      style={{ width: `${openedWidth}%` }}
                    />
                  </div>
                  <div className="h-2 rounded-full bg-section overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", barBg[step.channel])}
                      style={{ width: `${repliedWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border-subtle">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm bg-signal-blue-text/30" />
            <span className="text-[10px] text-ink-muted">Sent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm bg-signal-blue-text/60" />
            <span className="text-[10px] text-ink-muted">Opened</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm bg-signal-blue-text" />
            <span className="text-[10px] text-ink-muted">Replied</span>
          </div>
        </div>
      </div>
    </div>
  );
}
