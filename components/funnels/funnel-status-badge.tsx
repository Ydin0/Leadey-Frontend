import { cn } from "@/lib/utils";
import type { FunnelStatus } from "@/lib/types/funnel";

const statusConfig: Record<FunnelStatus, { label: string; bg: string; text: string }> = {
  active: { label: "Active", bg: "bg-signal-green", text: "text-signal-green-text" },
  paused: { label: "Paused", bg: "bg-signal-slate", text: "text-signal-slate-text" },
  draft: { label: "Draft", bg: "bg-section", text: "text-ink-muted" },
};

export function FunnelStatusBadge({ status }: { status: FunnelStatus }) {
  const config = statusConfig[status];
  return (
    <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", config.bg, config.text)}>
      {config.label}
    </span>
  );
}
