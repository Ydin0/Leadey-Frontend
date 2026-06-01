"use client";

import { useState } from "react";
import { PhoneCall } from "lucide-react";
import { cn } from "@/lib/utils";
import { DialerConfigModal } from "./dialer-config-modal";
import type { FunnelStep } from "@/lib/types/funnel";

interface DialerLauncherButtonProps {
  step: FunnelStep;
  /** Visual size. "compact" fits in step-pipeline pills; "regular" is the
   *  standard step-header CTA. */
  variant?: "compact" | "regular";
  className?: string;
}

/** Renders only on call-channel steps. Opens the config modal which then
 *  creates a dialer session and routes to /dashboard/dialer/[id]. */
export function DialerLauncherButton({
  step,
  variant = "regular",
  className,
}: DialerLauncherButtonProps) {
  const [open, setOpen] = useState(false);

  if (step.channel !== "call") return null;

  if (variant === "compact") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Start power dialer for this step"
          className={cn(
            "ml-1 flex items-center justify-center w-5 h-5 rounded-full bg-signal-green/15 text-signal-green-text hover:bg-signal-green/25 transition-colors",
            className,
          )}
        >
          <PhoneCall size={10} strokeWidth={2} />
        </button>
        {open && <DialerConfigModal step={step} onClose={() => setOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-signal-green text-signal-green-text text-[11px] font-medium hover:opacity-90 transition-opacity",
          className,
        )}
      >
        <PhoneCall size={12} strokeWidth={2} />
        Start Dialer
      </button>
      {open && <DialerConfigModal step={step} onClose={() => setOpen(false)} />}
    </>
  );
}
