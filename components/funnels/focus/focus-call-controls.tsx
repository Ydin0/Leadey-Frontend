"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Phone, ChevronDown, Mic, MicOff, PhoneOff, Settings, Check, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallContext } from "@/components/calling/call-context";
import { DialerLauncherButton } from "@/components/dialer/launcher/dialer-launcher-button";
import type { FunnelStep } from "@/lib/types/funnel";

function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Phone toolbar shown inside the lead focus view (which overlays the header
 *  dialer): live call controls, calling-number switcher, and power-dial. */
export function FocusCallControls({ steps }: { steps: FunnelStep[] }) {
  const { activeCall, phoneLines, selectedLineId, setSelectedLineId, endCall, toggleMute } = useCallContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const activeLines = phoneLines.filter((l) => l.status === "active");
  const selectedLine = phoneLines.find((l) => l.id === selectedLineId);

  return (
    <div className="flex items-center justify-between gap-3 mb-5 px-3 py-2 rounded-[12px] bg-surface border border-border-subtle">
      {/* Left: active call or current number */}
      {activeCall ? (
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex items-center gap-2 text-[12px] font-medium text-signal-green-text">
            <span className="w-2 h-2 rounded-full bg-signal-green-text animate-pulse" />
            {activeCall.state === "ringing" ? (
              <><Loader2 size={12} className="animate-spin" /> Ringing…</>
            ) : (
              <>On call · {fmtDuration(activeCall.duration)}</>
            )}
          </span>
          <span className="text-[11px] text-ink-muted truncate">{activeCall.contactName || activeCall.to}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[11px] text-ink-muted min-w-0">
          <Phone size={13} className="text-ink-faint shrink-0" />
          {selectedLine ? (
            <span className="truncate">Calling from <span className="text-ink-secondary font-medium">{selectedLine.number}</span></span>
          ) : (
            <span className="text-ink-faint">No calling number selected</span>
          )}
        </div>
      )}

      {/* Right: controls */}
      <div className="flex items-center gap-2 shrink-0">
        {activeCall ? (
          <>
            <button
              onClick={toggleMute}
              className={cn("flex items-center justify-center w-8 h-8 rounded-full transition-colors",
                activeCall.isMuted ? "bg-signal-red/15 text-signal-red-text" : "bg-section text-ink-secondary hover:bg-hover")}
              title={activeCall.isMuted ? "Unmute" : "Mute"}
            >
              {activeCall.isMuted ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
            <button
              onClick={endCall}
              className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-signal-red text-signal-red-text text-[11px] font-medium hover:bg-signal-red/80 transition-colors"
              title="End call"
            >
              <PhoneOff size={13} /> End
            </button>
          </>
        ) : (
          <>
            {/* Phone settings / line switcher */}
            <div className="relative" ref={ref}>
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1.5 px-2.5 h-8 rounded-full bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors"
              >
                <Settings size={13} /> Phone
                <ChevronDown size={11} />
              </button>
              {open && (
                <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-surface rounded-[12px] border border-border-default shadow-xl py-1.5">
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-ink-muted font-medium">Calling number</div>
                  {activeLines.length === 0 ? (
                    <div className="px-3 py-2 text-[11px] text-ink-muted">No active numbers.</div>
                  ) : (
                    activeLines.map((line) => (
                      <button
                        key={line.id}
                        onClick={() => { setSelectedLineId(line.id); setOpen(false); }}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-hover transition-colors text-left"
                      >
                        <span className="min-w-0">
                          <span className="block text-[12px] text-ink truncate">{line.number}</span>
                          {line.friendlyName && <span className="block text-[10px] text-ink-muted truncate">{line.friendlyName}</span>}
                        </span>
                        {line.id === selectedLineId && <Check size={14} className="text-signal-green-text shrink-0" />}
                      </button>
                    ))
                  )}
                  <div className="border-t border-border-subtle mt-1 pt-1">
                    <Link
                      href="/dashboard/settings?tab=phone-lines"
                      className="block px-3 py-2 text-[11px] text-signal-blue-text hover:bg-hover transition-colors"
                    >
                      Manage numbers &amp; settings →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Power dial */}
            <DialerLauncherButton steps={steps} className="!px-3 !py-1.5 !text-[11px]" />
          </>
        )}
      </div>
    </div>
  );
}
