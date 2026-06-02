"use client";

import { useEffect, useState } from "react";
import { Mail, Eye, MessageSquare, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getEmailStats } from "@/lib/api/email";
import type { EmailSummary } from "@/lib/types";
import type { EmailStats } from "@/lib/types/email";

const typeColors = {
  bounce: "bg-signal-red text-signal-red-text",
  delivery_issue: "bg-signal-slate text-signal-slate-text",
  unsubscribe: "bg-signal-slate text-signal-slate-text",
};

const typeLabels = {
  bounce: "Bounce",
  delivery_issue: "Delivery Issue",
  unsubscribe: "Unsubscribe",
};

interface EmailSectionProps {
  /** Fallback shown until honest email stats load. The dashboard endpoint's
   *  `sentToday` counts lead updates (not real sends), so we override it with
   *  getEmailStats() — which is sourced from real send events. */
  email: EmailSummary;
}

export function EmailSection({ email: fallback }: EmailSectionProps) {
  const isAuthReady = useAuthReady();
  const [stats, setStats] = useState<EmailStats | EmailSummary>(fallback);

  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    getEmailStats()
      .then((s) => !cancelled && setStats(s))
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isAuthReady]);

  const data = stats;
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[15px] font-semibold text-ink">Email Monitoring</h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-surface rounded-[14px] border border-border-subtle p-3">
          <div className="flex items-center gap-2 mb-1">
            <Mail size={14} strokeWidth={1.5} className="text-signal-blue-text" />
            <span className="text-[10px] text-ink-muted">Sent Today</span>
          </div>
          <p className="text-[16px] font-semibold text-ink">{data.sentToday}</p>
        </div>
        <div className="bg-surface rounded-[14px] border border-border-subtle p-3">
          <div className="flex items-center gap-2 mb-1">
            <Eye size={14} strokeWidth={1.5} className="text-signal-blue-text" />
            <span className="text-[10px] text-ink-muted">Opens</span>
          </div>
          <p className="text-[16px] font-semibold text-ink">
            {data.opens}
            <span className="text-[11px] font-normal text-ink-muted ml-1">{data.openRate}%</span>
          </p>
        </div>
        <div className="bg-surface rounded-[14px] border border-border-subtle p-3">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare size={14} strokeWidth={1.5} className="text-signal-green-text" />
            <span className="text-[10px] text-ink-muted">Replies</span>
          </div>
          <p className="text-[16px] font-semibold text-ink">
            {data.replies}
            <span className="text-[11px] font-normal text-ink-muted ml-1">{data.replyRate}%</span>
          </p>
        </div>
        <div className="bg-surface rounded-[14px] border border-border-subtle p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} strokeWidth={1.5} className="text-signal-red-text" />
            <span className="text-[10px] text-ink-muted">Bounces</span>
          </div>
          <p className="text-[16px] font-semibold text-ink">
            {data.bounces}
            <span className="text-[11px] font-normal text-ink-muted ml-1">{data.bounceRate}%</span>
          </p>
        </div>
      </div>

      {/* Needs Attention */}
      {data.needsAttention.length > 0 && (
        <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
          <h3 className="text-[12px] font-medium text-ink-secondary mb-3">Needs Attention</h3>
          <div className="space-y-2">
            {data.needsAttention.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border-subtle last:border-0">
                <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0", typeColors[item.type])}>
                  {typeLabels[item.type]}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[12px] text-ink truncate block">{item.contact}</span>
                  <span className="text-[11px] text-ink-muted">{item.company}</span>
                </div>
                <p className="text-[11px] text-ink-muted truncate max-w-[200px]">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
