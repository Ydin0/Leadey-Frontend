import { Mail, Linkedin, Phone, MessageSquare } from "lucide-react";
import type { CampaignChannelStats } from "@/lib/api/funnels";
import type { FunnelChannel } from "@/lib/types/funnel";

const channelMeta: Record<string, { icon: typeof Mail; label: string; color: string }> = {
  email: { icon: Mail, label: "Email", color: "text-signal-blue-text" },
  linkedin: { icon: Linkedin, label: "LinkedIn", color: "text-linkedin" },
  call: { icon: Phone, label: "Calls", color: "text-signal-green-text" },
  sms: { icon: MessageSquare, label: "SMS", color: "text-signal-green-text" },
  whatsapp: { icon: MessageSquare, label: "WhatsApp", color: "text-signal-green-text" },
  task: { icon: MessageSquare, label: "Tasks", color: "text-ink-secondary" },
};

export function ChannelPerformance({ channels }: { channels: CampaignChannelStats[] }) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold text-ink mb-3">Channel Performance</h3>
      <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
        {channels.length === 0 ? (
          <p className="text-[12px] text-ink-muted text-center py-6">
            No outreach activity yet. Sent emails, calls, LinkedIn actions and replies will
            appear here as the campaign runs.
          </p>
        ) : (
          <div className="space-y-4">
            {channels.map((ch) => {
              const meta = channelMeta[ch.channel as FunnelChannel] ?? channelMeta.task;
              const Icon = meta.icon;
              return (
                <div key={ch.channel} className="pb-4 border-b border-border-subtle last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Icon size={13} strokeWidth={1.5} className={meta.color} />
                    <span className="text-[12px] font-medium text-ink">{meta.label}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {ch.metrics.map((m) => (
                      <div key={m.label}>
                        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
                          {m.label}
                        </span>
                        <p className="text-[18px] font-semibold text-ink mt-0.5 tabular-nums">
                          {m.value.toLocaleString()}
                          {m.rate != null && (
                            <span className="text-[11px] font-normal text-ink-muted ml-1.5">
                              {m.rate}%
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
