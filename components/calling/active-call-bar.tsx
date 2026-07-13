"use client";

import { useRouter, usePathname } from "next/navigation";
import { Phone, PhoneOff, Mic, MicOff, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallContext } from "@/components/calling/call-context";

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Persistent, always-visible call bar. Whenever there's an active/ringing call,
 * this floats at the bottom of the screen on EVERY page — so navigating away
 * from the lead never loses the call (you can still see who it is, jump back to
 * their profile, mute, or hang up). Hidden while you're already viewing that
 * lead, where the inline call controls cover it.
 */
export function ActiveCallBar() {
  const { activeCall, endCall, toggleMute } = useCallContext();
  const router = useRouter();
  const pathname = usePathname();

  if (!activeCall || activeCall.state === "ended") return null;

  const leadHref = activeCall.leadId
    ? activeCall.funnelId
      ? `/dashboard/funnels/${activeCall.funnelId}/leads/${activeCall.leadId}`
      : `/dashboard/leads/${activeCall.leadId}`
    : null;

  // On the lead's own page the inline controls already show the call.
  if (activeCall.leadId && pathname.includes(activeCall.leadId)) return null;

  const ringing = activeCall.state === "ringing";
  const connected = activeCall.state === "connected";
  const label = activeCall.contactName || activeCall.to || "Unknown number";
  const status = ringing ? "Ringing…" : connected ? `On call · ${fmtDuration(activeCall.duration)}` : "Connecting…";

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-3 pl-3.5 pr-2 py-2 rounded-full bg-surface border border-border-default shadow-2xl">
      <span
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full bg-signal-green/15 text-signal-green-text shrink-0",
          ringing && "animate-pulse",
        )}
      >
        <Phone size={15} />
      </span>

      <button
        type="button"
        onClick={() => leadHref && router.push(leadHref)}
        disabled={!leadHref}
        title={leadHref ? "Go to lead" : undefined}
        className={cn("flex flex-col items-start min-w-0 text-left", leadHref ? "hover:opacity-80 cursor-pointer" : "cursor-default")}
      >
        <span className="flex items-center gap-1 text-[12.5px] font-semibold text-ink truncate max-w-[220px]">
          <span className="truncate">{label}</span>
          {leadHref && <ChevronRight size={13} className="text-ink-muted shrink-0" />}
        </span>
        <span className="text-[10.5px] text-ink-muted">{status}</span>
      </button>

      <div className="flex items-center gap-1.5 shrink-0">
        {connected && (
          <button
            type="button"
            onClick={toggleMute}
            title={activeCall.isMuted ? "Unmute" : "Mute"}
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-full transition-colors",
              activeCall.isMuted ? "bg-signal-red/15 text-signal-red-text" : "bg-section text-ink-secondary hover:bg-hover",
            )}
          >
            {activeCall.isMuted ? <MicOff size={15} /> : <Mic size={15} />}
          </button>
        )}
        <button
          type="button"
          onClick={endCall}
          title="Hang up"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-signal-red-text text-white hover:opacity-90 transition-opacity"
        >
          <PhoneOff size={15} />
        </button>
      </div>
    </div>
  );
}
