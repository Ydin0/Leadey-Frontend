import { cn } from "@/lib/utils";
import { CallDurationDisplay } from "@/components/calling/shared/call-duration-display";
import type { CallState } from "@/lib/types/calling";

const stateConfig: Record<CallState, { label: string; className: string }> = {
  idle: { label: "", className: "" },
  ringing: { label: "Ringing...", className: "bg-signal-blue text-signal-blue-text" },
  connected: { label: "Connected", className: "bg-signal-green text-signal-green-text" },
  ended: { label: "Call Ended", className: "bg-signal-slate text-signal-slate-text" },
};

interface CallStatusIndicatorProps {
  state: CallState;
  duration: number;
  isOnHold: boolean;
}

export function CallStatusIndicator({ state, duration, isOnHold }: CallStatusIndicatorProps) {
  if (state === "idle") return null;

  const config = isOnHold && state === "connected"
    ? { label: "On Hold", className: "bg-signal-blue text-signal-blue-text" }
    : stateConfig[state];

  return (
    <div className="flex items-center gap-2">
      <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", config.className)}>
        {config.label}
      </span>
      {state === "connected" && <CallDurationDisplay seconds={duration} className="text-[12px] font-medium text-ink" />}
    </div>
  );
}
