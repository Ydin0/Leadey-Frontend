import Link from "next/link";
import { Linkedin, Mail, Phone } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { ChannelConfig, ChannelId } from "@/lib/types/channel";
import { ChannelStatusBadge } from "./channel-status-badge";
import { ChannelMetricsRow } from "./channel-metrics-row";

const channelIcons: Record<ChannelId, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  linkedin: Linkedin,
  email: Mail,
  calling: Phone,
};

const channelIconColors: Record<ChannelId, string> = {
  linkedin: "text-linkedin",
  email: "text-signal-blue-text",
  calling: "text-signal-green-text",
};

interface ChannelCardProps {
  channel: ChannelConfig;
}

export function ChannelCard({ channel }: ChannelCardProps) {
  const Icon = channelIcons[channel.id];
  const iconColor = channelIconColors[channel.id];
  const hasIncompleteSetup = channel.completedSteps < channel.setupSteps.length;
  const progressPercent = channel.setupSteps.length > 0
    ? (channel.completedSteps / channel.setupSteps.length) * 100
    : 0;

  return (
    <Link
      href={`/dashboard/channels/${channel.id}`}
      className="bg-surface rounded-[14px] border border-border-subtle p-5 hover:border-border-default transition-colors block"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <Icon size={18} strokeWidth={1.5} className={iconColor} />
          <span className="text-[14px] font-semibold text-ink">{channel.name}</span>
        </div>
        <ChannelStatusBadge status={channel.connectionStatus} />
      </div>

      {/* Provider + account */}
      <div className="mb-3">
        <p className="text-[11px] text-ink-muted">
          via {channel.providerName}
        </p>
        <p className="text-[12px] text-ink-secondary mt-0.5">
          {channel.connectedAccountLabel || "Not configured"}
        </p>
      </div>

      {/* Metrics */}
      <div className="mb-3">
        <ChannelMetricsRow metrics={channel.healthMetrics} />
      </div>

      {/* Setup progress bar */}
      {hasIncompleteSetup && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-ink-muted">
              Setup {channel.completedSteps}/{channel.setupSteps.length}
            </span>
          </div>
          <div className="h-1 rounded-full bg-section overflow-hidden">
            <div
              className="h-full rounded-full bg-signal-blue-text transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Last activity */}
      {channel.lastActivity && (
        <p className="text-[10px] text-ink-faint">
          Last activity {formatRelativeTime(channel.lastActivity)}
        </p>
      )}
    </Link>
  );
}
