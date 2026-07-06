"use client";

import { useState } from "react";
import { PhoneCall, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDialerContext } from "@/components/dialer/context/dialer-context";
import { DialerConfigModal } from "./dialer-config-modal";

interface DialerLauncherButtonProps {
  /** The campaign to dial. The dialer queues every phone-having lead in it —
   *  it is intentionally NOT tied to sequence steps. */
  funnelId: string;
  className?: string;
}

/** Prominent CTA for launching the power dialer on a campaign. Always dials
 *  the whole campaign (every lead with a phone), independent of the sequence. */
export function DialerLauncherButton({ funnelId, className }: DialerLauncherButtonProps) {
  const dialer = useDialerContext();
  const [open, setOpen] = useState(false);

  const buttonBaseClass = cn(
    "flex items-center gap-2 px-4 py-2 rounded-[20px] text-[12px] font-medium",
    "bg-signal-green text-signal-green-text border border-signal-green-text/20",
    "hover:bg-signal-green/80 hover:border-signal-green-text/40 transition-all",
    "shadow-sm hover:shadow-md",
    className,
  );

  // A session is already running — the persistent dialer bar handles all
  // controls, so just show a non-interactive "running" indicator here.
  if (dialer.session && dialer.session.status !== "completed") {
    return (
      <span
        className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] text-[12px] font-medium bg-signal-green/15 text-signal-green-text border border-signal-green-text/20"
        title="A power dialer session is in progress — use the bar at the top"
      >
        <Radio size={14} strokeWidth={2} />
        Dialer running
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonBaseClass}
        title="Dial every lead in this campaign that has a phone number"
      >
        <PhoneCall size={14} strokeWidth={2} />
        Start Power Dialer
      </button>
      {open && <DialerConfigModal funnelId={funnelId} onClose={() => setOpen(false)} />}
    </>
  );
}
