import { cn } from "@/lib/utils";
import type { ChannelConnectionStatus } from "@/lib/types/channel";

const statusConfig: Record<ChannelConnectionStatus, { label: string; className: string }> = {
  not_connected: { label: "Not Connected", className: "bg-signal-slate text-signal-slate-text" },
  connecting: { label: "Connecting...", className: "bg-signal-blue text-signal-blue-text" },
  connected: { label: "Connected", className: "bg-signal-green text-signal-green-text" },
  needs_attention: { label: "Needs Attention", className: "bg-signal-red text-signal-red-text" },
};

interface ChannelStatusBadgeProps {
  status: ChannelConnectionStatus;
}

export function ChannelStatusBadge({ status }: ChannelStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", config.className)}>
      {config.label}
    </span>
  );
}
