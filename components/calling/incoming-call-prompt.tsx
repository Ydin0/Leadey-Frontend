"use client";

import Link from "next/link";
import { PhoneIncoming, Phone, PhoneOff, Mic, MicOff, Pause, Play, ExternalLink } from "lucide-react";
import { cn, formatPhoneIntl, formatCallDuration } from "@/lib/utils";
import { useCallContext } from "@/components/calling/call-context";

/**
 * Global ringing prompt for inbound calls. Mounted in the dashboard layout so
 * it appears on every page. Shows Accept/Decline while ringing, then a compact
 * in-call bar (mute + hang up) once the rep answers — outbound calls are
 * unaffected (they keep showing in the dialer dropdown / power-dialer bar).
 */
export function IncomingCallPrompt() {
  const {
    incomingCall,
    acceptIncoming,
    rejectIncoming,
    activeCall,
    endCall,
    toggleMute,
    toggleHold,
    phoneLines,
  } = useCallContext();

  const inboundLive =
    activeCall && activeCall.direction === "inbound" && activeCall.state !== "ended";

  // Nothing ringing and no live inbound call → render nothing.
  if (!incomingCall && !inboundLive) return null;

  // ── Ringing: awaiting accept/reject ──────────────────────────────
  if (incomingCall) {
    const digits = incomingCall.lineNumber.replace(/[^\d]/g, "");
    const line =
      phoneLines.find((l) => l.number.replace(/[^\d]/g, "") === digits) || null;
    const lineLabel = line?.friendlyName || line?.number || incomingCall.lineNumber;

    return (
      <Shell>
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-signal-green/15 text-signal-green-text animate-pulse shrink-0">
            <PhoneIncoming size={18} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
              Incoming call
            </p>
            <p className="text-[14px] font-semibold text-ink truncate">
              {formatPhoneIntl(incomingCall.fromNumber) || "Unknown caller"}
            </p>
            {lineLabel && (
              <p className="text-[11px] text-ink-muted truncate">to {lineLabel}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button
            type="button"
            onClick={rejectIncoming}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[20px] bg-signal-red-text text-on-ink text-[12px] font-medium hover:bg-signal-red-text/90 transition-colors"
          >
            <PhoneOff size={14} strokeWidth={2} /> Decline
          </button>
          <button
            type="button"
            onClick={acceptIncoming}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[20px] bg-signal-green text-signal-green-text border border-signal-green-text/20 text-[12px] font-medium hover:bg-signal-green/80 transition-colors"
          >
            <Phone size={14} strokeWidth={2} /> Accept
          </button>
        </div>
      </Shell>
    );
  }

  // ── Connected inbound: live info + controls ──────────────────────
  const call = activeCall!;
  const connected = call.state === "connected";
  const hasName = !!call.contactName;
  const numberLabel = formatPhoneIntl(call.to) || call.to;
  const leadHref =
    call.leadId && call.funnelId
      ? `/dashboard/funnels/${call.funnelId}/leads/${call.leadId}`
      : null;

  return (
    <Shell>
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-signal-green/15 text-signal-green-text shrink-0">
          <PhoneIncoming size={18} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink truncate">
            {hasName ? call.contactName : numberLabel || "Inbound call"}
          </p>
          <p className="text-[11px] text-ink-muted truncate">
            {[call.companyName, hasName ? numberLabel : null].filter(Boolean).join(" · ") || " "}
          </p>
          <p className="text-[11px] text-signal-green-text font-medium tabular-nums mt-0.5">
            {connected ? formatCallDuration(call.duration) : "Connecting…"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            title={call.isMuted ? "Unmute" : "Mute"}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
              call.isMuted ? "bg-signal-red text-signal-red-text" : "bg-section hover:bg-hover text-ink-secondary",
            )}
          >
            {call.isMuted ? <MicOff size={15} strokeWidth={1.5} /> : <Mic size={15} strokeWidth={1.5} />}
          </button>
          <button
            type="button"
            onClick={toggleHold}
            title={call.isOnHold ? "Resume" : "Hold"}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
              call.isOnHold ? "bg-signal-blue text-signal-blue-text" : "bg-section hover:bg-hover text-ink-secondary",
            )}
          >
            {call.isOnHold ? <Play size={15} strokeWidth={1.5} /> : <Pause size={15} strokeWidth={1.5} />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {leadHref && (
            <Link
              href={leadHref}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle"
            >
              <ExternalLink size={11} /> Open lead
            </Link>
          )}
          <button
            type="button"
            onClick={endCall}
            title="Hang up"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-signal-red-text text-on-ink text-[11px] font-medium hover:bg-signal-red-text/90 transition-colors"
          >
            <PhoneOff size={13} strokeWidth={2} /> End
          </button>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] w-[320px] max-w-[calc(100vw-2rem)]">
      <div className="bg-surface rounded-[14px] border border-border-subtle shadow-2xl p-4">
        {children}
      </div>
    </div>
  );
}
