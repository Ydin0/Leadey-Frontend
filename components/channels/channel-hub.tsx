"use client";

import { mockChannels } from "@/lib/mock-data/channels";
import { ChannelCard } from "./channel-card";

export function ChannelHub() {
  const channels = mockChannels;
  const activeCount = channels.filter((c) => c.connectionStatus === "connected").length;
  const needsSetup = channels.filter(
    (c) => c.connectionStatus === "not_connected" || c.completedSteps < c.setupSteps.length
  ).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-semibold text-ink">Channels</h1>
          <p className="text-[12px] text-ink-muted mt-0.5">
            Configure and monitor your outreach channels
          </p>
        </div>
        <div className="flex items-center gap-2">
          {needsSetup > 0 ? (
            <span className="text-[11px] text-signal-blue-text font-medium">
              {needsSetup} channel{needsSetup > 1 ? "s" : ""} need{needsSetup === 1 ? "s" : ""} setup
            </span>
          ) : (
            <span className="text-[11px] text-signal-green-text font-medium">
              {activeCount}/{channels.length} channels active
            </span>
          )}
        </div>
      </div>

      {/* Channel grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {channels.map((channel) => (
          <ChannelCard key={channel.id} channel={channel} />
        ))}
      </div>
    </div>
  );
}
