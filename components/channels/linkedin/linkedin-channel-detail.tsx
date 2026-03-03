"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Linkedin } from "lucide-react";
import { mockChannels } from "@/lib/mock-data/channels";
import { ChannelStatusBadge } from "../channel-status-badge";
import { LinkedInSetupFlow } from "./linkedin-setup-flow";
import { LinkedInRateLimitsPanel } from "./linkedin-rate-limits-panel";
import { formatRelativeTime } from "@/lib/utils";

export function LinkedInChannelDetail() {
  const channel = mockChannels.find((c) => c.id === "linkedin")!;
  const [view, setView] = useState<"overview" | "setup">(
    channel.connectionStatus === "connected" ? "overview" : "setup"
  );

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
            <Linkedin size={20} strokeWidth={1.5} className="text-linkedin" />
            <div>
              <h1 className="text-[18px] font-semibold text-ink">LinkedIn</h1>
              <p className="text-[11px] text-ink-muted">via Unipile</p>
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
        <LinkedInSetupFlow onComplete={() => setView("overview")} />
      ) : (
        <div className="space-y-4">
          {/* Connection Status card */}
          <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
            <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-3">
              Connection Status
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-ink">
                  {channel.connectedAccountLabel || "Not connected"}
                </p>
                {channel.lastActivity && (
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    Last activity {formatRelativeTime(channel.lastActivity)}
                  </p>
                )}
              </div>
              <ChannelStatusBadge status={channel.connectionStatus} />
            </div>
          </div>

          {/* Health & Rate Limits card */}
          <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
            <LinkedInRateLimitsPanel />
          </div>

          {/* Activity Summary card */}
          <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
            <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-3">
              Activity Summary
            </p>
            <div className="grid grid-cols-2 gap-4">
              {channel.summaryMetrics.map((metric) => (
                <div key={metric.label}>
                  <p className="text-[10px] text-ink-muted">{metric.label}</p>
                  <p className="text-[16px] font-semibold text-ink mt-0.5">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
