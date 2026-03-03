"use client";

import { Mic, MicOff, Pause, Play, Hash, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallContext } from "@/components/calling/call-context";
import { CallStatusIndicator } from "./call-status-indicator";
import { DtmfKeypad } from "./dtmf-keypad";

export function InCallControls() {
  const { activeCall, endCall, toggleMute, toggleHold, toggleDtmfPad } = useCallContext();

  if (!activeCall) return null;

  return (
    <div className="relative space-y-4 py-2">
      {/* Contact info */}
      <div className="text-center">
        <p className="text-[14px] font-semibold text-ink">
          {activeCall.contactName || activeCall.to}
        </p>
        {activeCall.contactName && (
          <p className="text-[12px] text-ink-muted">{activeCall.to}</p>
        )}
      </div>

      {/* Status + duration */}
      <div className="flex justify-center">
        <CallStatusIndicator
          state={activeCall.state}
          duration={activeCall.duration}
          isOnHold={activeCall.isOnHold}
        />
      </div>

      {/* Control buttons */}
      {activeCall.state !== "ended" && (
        <div className="flex items-center justify-center gap-3">
          {/* Mute */}
          <button
            type="button"
            onClick={toggleMute}
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center transition-colors",
              activeCall.isMuted ? "bg-signal-red text-signal-red-text" : "bg-section hover:bg-hover text-ink-secondary"
            )}
          >
            {activeCall.isMuted ? <MicOff size={16} strokeWidth={1.5} /> : <Mic size={16} strokeWidth={1.5} />}
          </button>

          {/* Hold */}
          <button
            type="button"
            onClick={toggleHold}
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center transition-colors",
              activeCall.isOnHold ? "bg-signal-blue text-signal-blue-text" : "bg-section hover:bg-hover text-ink-secondary"
            )}
          >
            {activeCall.isOnHold ? <Play size={16} strokeWidth={1.5} /> : <Pause size={16} strokeWidth={1.5} />}
          </button>

          {/* DTMF */}
          <button
            type="button"
            onClick={toggleDtmfPad}
            className="w-11 h-11 rounded-full flex items-center justify-center bg-section hover:bg-hover text-ink-secondary transition-colors"
          >
            <Hash size={16} strokeWidth={1.5} />
          </button>

          {/* End */}
          <button
            type="button"
            onClick={endCall}
            className="w-11 h-11 rounded-full flex items-center justify-center bg-signal-red-text text-on-ink hover:bg-signal-red-text/90 transition-colors"
          >
            <PhoneOff size={16} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* DTMF overlay */}
      {activeCall.isDtmfVisible && <DtmfKeypad />}
    </div>
  );
}
