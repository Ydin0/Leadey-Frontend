"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockChannels, mockEmailAccounts } from "@/lib/mock-data/channels";
import { ChannelStatusBadge } from "../channel-status-badge";
import { EmailSetupFlow } from "./email-setup-flow";
import { EmailSendingConfigPanel } from "./email-sending-config-panel";
import { formatRelativeTime } from "@/lib/utils";
import type { EmailAccount } from "@/lib/types/channel";

const healthDotColors: Record<string, string> = {
  good: "bg-signal-green-text",
  warning: "bg-signal-blue-text",
  critical: "bg-signal-red-text",
  neutral: "bg-ink-faint",
};

export function EmailChannelDetail() {
  const channel = mockChannels.find((c) => c.id === "email")!;
  const [view, setView] = useState<"overview" | "setup">(
    channel.connectionStatus === "connected" ? "overview" : "setup"
  );
  const [accounts, setAccounts] = useState<EmailAccount[]>(mockEmailAccounts);

  function toggleAccount(id: number) {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a))
    );
  }

  return (
    <div>
      {/* Back + title bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/channels"
            className="p-1.5 rounded-[8px] hover:bg-hover transition-colors text-ink-muted"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
          </Link>
          <div className="flex items-center gap-2.5">
            <Mail size={20} strokeWidth={1.5} className="text-signal-blue-text" />
            <div>
              <h1 className="text-[18px] font-semibold text-ink">Email</h1>
              <p className="text-[11px] text-ink-muted">via Smartlead</p>
            </div>
          </div>
          <ChannelStatusBadge status={channel.connectionStatus} />
        </div>
        <div className="flex items-center gap-2">
          {view === "overview" && (
            <button
              type="button"
              onClick={() => setView("setup")}
              className="px-3 py-1.5 rounded-[16px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle"
            >
              Reconfigure
            </button>
          )}
          {view === "setup" && channel.connectionStatus === "connected" && (
            <button
              type="button"
              onClick={() => setView("overview")}
              className="px-3 py-1.5 rounded-[16px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle"
            >
              Back to Overview
            </button>
          )}
        </div>
      </div>

      {view === "setup" ? (
        <EmailSetupFlow onComplete={() => setView("overview")} />
      ) : (
        <div className="space-y-4">
          {/* Connection Status card */}
          <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
            <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-3">
              Connection Status
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-ink">Smartlead</p>
                <p className="text-[11px] text-ink-muted mt-0.5">API key: sl_****...7f3a</p>
              </div>
              <ChannelStatusBadge status={channel.connectionStatus} />
            </div>
          </div>

          {/* Sending Accounts card */}
          <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
                Sending Accounts
              </p>
              <button
                type="button"
                className="px-3 py-1 rounded-[16px] bg-ink text-on-ink text-[10px] font-medium hover:bg-ink/90 transition-colors"
              >
                Save Changes
              </button>
            </div>
            <div className="space-y-1">
              {accounts.map((account) => (
                <label
                  key={account.id}
                  className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 hover:bg-hover cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={account.selected}
                    onChange={() => toggleAccount(account.id)}
                    className="rounded border-border-default accent-signal-blue-text"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-ink truncate">{account.email}</p>
                    {account.fromName && (
                      <p className="text-[10px] text-ink-muted truncate">{account.fromName}</p>
                    )}
                  </div>
                  {account.isActive ? (
                    <span className="text-[9px] text-signal-green-text font-medium flex items-center gap-0.5">
                      <Check size={9} /> Active
                    </span>
                  ) : (
                    <span className="text-[9px] text-signal-red-text font-medium">Inactive</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Sending Configuration card */}
          <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
            <EmailSendingConfigPanel />
          </div>

          {/* Deliverability Health card */}
          <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
            <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-3">
              Deliverability Health
            </p>
            <div className="grid grid-cols-2 gap-4">
              {channel.healthMetrics.map((metric) => (
                <div key={metric.label} className="flex items-start gap-2">
                  <span className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", healthDotColors[metric.status])} />
                  <div>
                    <p className="text-[10px] text-ink-muted">{metric.label}</p>
                    <p className="text-[16px] font-semibold text-ink mt-0.5">{metric.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
