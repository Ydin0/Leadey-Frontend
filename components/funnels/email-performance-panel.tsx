"use client";

import { useEffect, useState } from "react";
import { Mail, MailOpen, MessageSquare, AlertTriangle, Loader2 } from "lucide-react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getCampaignEmailAnalytics } from "@/lib/api/email";
import type { CampaignEmailAnalytics } from "@/lib/types/email";

export function EmailPerformancePanel({ funnelId }: { funnelId: string }) {
  const isAuthReady = useAuthReady();
  const [data, setData] = useState<CampaignEmailAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    setLoading(true);
    getCampaignEmailAnalytics(funnelId)
      .then((d) => !cancelled && setData(d))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [isAuthReady, funnelId]);

  if (loading || !data) {
    return (
      <div className="bg-surface rounded-[14px] border border-border-subtle p-8 flex items-center justify-center">
        <Loader2 size={18} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  const kpis = [
    { label: "Sent", value: data.sent.toLocaleString(), sub: null, icon: Mail, tone: "text-signal-blue-text" },
    { label: "Opened", value: data.opened.toLocaleString(), sub: `${data.openRate}%`, icon: MailOpen, tone: "text-signal-blue-text" },
    { label: "Replied", value: data.replied.toLocaleString(), sub: `${data.replyRate}%`, icon: MessageSquare, tone: "text-signal-green-text" },
    { label: "Bounced", value: data.bounced.toLocaleString(), sub: `${data.bounceRate}%`, icon: AlertTriangle, tone: "text-signal-red-text" },
  ];

  const maxStepSent = Math.max(1, ...data.perStep.map((s) => s.sent));

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-surface rounded-[14px] border border-border-subtle p-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} strokeWidth={1.5} className={k.tone} />
                <span className="text-[10px] text-ink-muted">{k.label}</span>
              </div>
              <p className="text-[16px] font-semibold text-ink">
                {k.value}
                {k.sub && <span className="text-[11px] font-normal text-ink-muted ml-1">{k.sub}</span>}
              </p>
            </div>
          );
        })}
      </div>

      {/* Per-step breakdown */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <h3 className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-3">
          Performance by step
        </h3>
        <div className="space-y-2.5">
          {data.perStep.map((s) => (
            <div key={s.stepIndex} className="flex items-center gap-3">
              <span className="text-[11px] text-ink-secondary w-28 truncate shrink-0">{s.label}</span>
              <div className="flex-1 h-5 rounded-full bg-section overflow-hidden relative">
                <div
                  className="h-full bg-signal-blue/30"
                  style={{ width: `${(s.sent / maxStepSent) * 100}%` }}
                />
                <div
                  className="absolute top-0 left-0 h-full bg-signal-green-text/40"
                  style={{ width: `${(s.replied / maxStepSent) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-ink-faint w-32 shrink-0 text-right tabular-nums">
                {s.sent} sent · {s.opened} opened · {s.replied} replied
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
