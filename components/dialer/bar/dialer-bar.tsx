"use client";

import {
  PhoneCall,
  PhoneOff,
  Pause,
  Play,
  SkipForward,
  SkipBack,
  Mic,
  MicOff,
  X,
  Check,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDialerContext } from "@/components/dialer/context/dialer-context";
import { useCallContext } from "@/components/calling/call-context";
import { useDialerKeyboard } from "@/components/dialer/context/use-dialer-keyboard";

export function DialerBar() {
  const dialer = useDialerContext();
  const call = useCallContext();
  useDialerKeyboard();

  const { session, currentItem, mode, countdown } = dialer;

  // Nothing to show until a session exists.
  if (!session) return null;

  const activeCall = call.activeCall;
  const inCall = activeCall?.state === "ringing" || activeCall?.state === "connected";
  const connected = activeCall?.state === "connected";
  const completed = session.status === "completed" || (!currentItem && !inCall);

  return (
    <div className="sticky top-14 z-30 mx-0">
      <div className="flex items-center gap-3 px-4 py-2 bg-surface border-b border-border-default shadow-sm">
        {/* Brand / progress */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-signal-green/15 text-signal-green-text">
            <PhoneCall size={13} strokeWidth={2} />
          </span>
          <span className="text-[11px] font-semibold text-ink">Power Dialer</span>
          <span className="text-[10px] text-ink-muted tabular-nums">
            {session.completedLeads}/{session.totalLeads}
          </span>
        </div>

        <div className="w-px h-5 bg-border-subtle" />

        {completed ? (
          <>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Check size={13} className="text-signal-green-text" />
              <span className="text-[12px] font-medium text-ink">
                Session complete — {session.completedLeads} call
                {session.completedLeads === 1 ? "" : "s"}
              </span>
            </div>
            <button
              onClick={dialer.dismiss}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle"
            >
              Dismiss
            </button>
          </>
        ) : (
          <>
            {/* Current lead */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[12px] font-semibold text-ink truncate">
                {currentItem?.lead?.name || "—"}
              </span>
              {currentItem?.lead?.company && (
                <span className="text-[11px] text-ink-muted truncate">
                  · {currentItem.lead.company}
                </span>
              )}
              {currentItem?.leadPhone && (
                <span className="text-[11px] text-ink-muted font-mono tabular-nums truncate">
                  · {currentItem.leadPhone}
                </span>
              )}
              {currentItem?.lead?.doNotCall && (
                <span className="text-[9px] uppercase tracking-wide font-semibold text-signal-red-text bg-signal-red/10 px-1.5 py-0.5 rounded-full shrink-0">
                  DNC
                </span>
              )}
            </div>

            {/* Status pill */}
            <StatusPill
              connected={connected}
              ringing={activeCall?.state === "ringing"}
              duration={activeCall?.duration ?? 0}
              countdown={countdown}
              paused={mode === "paused"}
            />

            {/* Controls */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={dialer.followMode ? dialer.stopFollow : dialer.openFollow}
                title={
                  dialer.followMode
                    ? "Following — main screen tracks each lead's profile"
                    : "Open the lead's profile and follow as you dial"
                }
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[11px] font-medium transition-colors border mr-1",
                  dialer.followMode
                    ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                    : "bg-section text-ink-secondary border-border-subtle hover:bg-hover",
                )}
              >
                <ExternalLink size={12} strokeWidth={2} />
                {dialer.followMode ? "Following" : "Open"}
              </button>

              <IconButton title="Previous (B)" onClick={() => void dialer.back()}>
                <SkipBack size={14} />
              </IconButton>

              {mode === "paused" ? (
                <IconButton
                  title="Resume (Space)"
                  variant="primary"
                  onClick={() => void dialer.resume()}
                >
                  <Play size={14} />
                </IconButton>
              ) : (
                <IconButton title="Pause (Space)" onClick={() => void dialer.pause()}>
                  <Pause size={14} />
                </IconButton>
              )}

              <IconButton title="Skip (S)" onClick={() => void dialer.skip()}>
                <SkipForward size={14} />
              </IconButton>

              {inCall ? (
                <>
                  {connected && (
                    <IconButton
                      title="Mute (M)"
                      active={activeCall?.isMuted}
                      onClick={() => call.toggleMute()}
                    >
                      {activeCall?.isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                    </IconButton>
                  )}
                  <IconButton
                    title="Hang up (Esc)"
                    variant="danger"
                    onClick={() => call.endCall()}
                  >
                    <PhoneOff size={14} />
                  </IconButton>
                </>
              ) : (
                <IconButton
                  title="Call now"
                  variant="primary"
                  onClick={() => dialer.startNext()}
                >
                  <PhoneCall size={14} />
                </IconButton>
              )}

              <div className="w-px h-5 bg-border-subtle mx-0.5" />

              <button
                onClick={() => void dialer.end()}
                title="End session"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle"
              >
                <X size={12} strokeWidth={2} />
                End
              </button>
            </div>
          </>
        )}
      </div>

      {dialer.error && (
        <div className="px-4 py-1.5 bg-signal-red/10 border-b border-signal-red-text/20">
          <span className="text-[11px] text-signal-red-text">{dialer.error}</span>
        </div>
      )}
    </div>
  );
}

function StatusPill({
  connected,
  ringing,
  duration,
  countdown,
  paused,
}: {
  connected: boolean;
  ringing: boolean;
  duration: number;
  countdown: number | null;
  paused: boolean;
}) {
  let label: string;
  let tone: "green" | "blue" | "slate" | "amber";

  if (connected) {
    label = `Connected · ${formatDuration(duration)}`;
    tone = "green";
  } else if (ringing) {
    label = "Calling…";
    tone = "blue";
  } else if (paused) {
    label = "Paused";
    tone = "amber";
  } else if (countdown !== null) {
    label = `Next in ${countdown}s`;
    tone = "blue";
  } else {
    label = "Ready";
    tone = "slate";
  }

  const toneClass = {
    green: "bg-signal-green/15 text-signal-green-text",
    blue: "bg-signal-blue/15 text-signal-blue-text",
    slate: "bg-section text-ink-muted",
    amber: "bg-amber-500/15 text-amber-600",
  }[tone];

  return (
    <span
      className={cn(
        "shrink-0 text-[11px] font-medium rounded-full px-2.5 py-1 tabular-nums",
        toneClass,
      )}
    >
      {label}
    </span>
  );
}

function IconButton({
  children,
  onClick,
  title,
  variant = "default",
  active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  variant?: "default" | "primary" | "danger";
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full transition-colors border",
        variant === "primary" &&
          "bg-signal-green text-signal-green-text border-signal-green-text/20 hover:bg-signal-green/80",
        variant === "danger" &&
          "bg-signal-red text-signal-red-text border-signal-red-text/20 hover:bg-signal-red/80",
        variant === "default" &&
          !active &&
          "bg-section text-ink-secondary border-border-subtle hover:bg-hover",
        variant === "default" &&
          active &&
          "bg-signal-blue text-signal-blue-text border-signal-blue-text/20",
      )}
    >
      {children}
    </button>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
