"use client";

import Link from "next/link";
import { ArrowLeft, Phone, Plus, Settings } from "lucide-react";
import { mockChannels } from "@/lib/mock-data/channels";
import { ChannelStatusBadge } from "../channel-status-badge";
import { CallingLinesSummary } from "./calling-lines-summary";

export function CallingChannelDetail() {
  const channel = mockChannels.find((c) => c.id === "calling")!;

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
            <Phone size={20} strokeWidth={1.5} className="text-signal-green-text" />
            <div>
              <h1 className="text-[18px] font-semibold text-ink">Calling</h1>
              <p className="text-[11px] text-ink-muted">via Twilio</p>
            </div>
          </div>
          <ChannelStatusBadge status={channel.connectionStatus} />
        </div>
      </div>

      <div className="space-y-4">
        {/* Phone Lines Overview card */}
        <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-3">
            Phone Lines Overview
          </p>
          <CallingLinesSummary />
        </div>

        {/* Usage This Month card */}
        <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-3">
            Usage This Month
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

        {/* Quick Actions card */}
        <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-3">
            Quick Actions
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
            >
              <Plus size={13} strokeWidth={2} />
              Provision New Number
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle"
            >
              <Settings size={13} strokeWidth={1.5} />
              Manage Lines
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
