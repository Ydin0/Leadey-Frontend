"use client";

import { useState, useRef, useEffect } from "react";
import {
  PhoneCall,
  PhoneOff,
  Pause,
  Play,
  SkipBack,
  Mic,
  MicOff,
  X,
  Check,
  ExternalLink,
  Timer,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDialerContext } from "@/components/dialer/context/dialer-context";
import { useCallContext } from "@/components/calling/call-context";
import { useDialerKeyboard } from "@/components/dialer/context/use-dialer-keyboard";

export function DialerBar() {
  const dialer = useDialerContext();
  const call = useCallContext();
  useDialerKeyboard();

  const { session, currentItem, mode, countdown, autoAdvanceSeconds } = dialer;

  // Nothing to show until a session exists.
  if (!session) return null;

  const activeCall = call.activeCall;
  const inCall = activeCall?.state === "ringing" || activeCall?.state === "connected";
  const connected = activeCall?.state === "connected";
  const countingDown = mode === "running" && !inCall && countdown !== null && autoAdvanceSeconds > 0;
  const completed = session.status === "completed" || (!currentItem && !inCall);

  // During a LIVE call show who's actually on the line — resolved from the call
  // itself (incl. inbound callers / dial-pad calls), not the outbound queue
  // item. Between calls, show the next queued lead. This is why a connected call
  // used to render blank: the bar was always reading `currentItem`.
  const isInbound = inCall && activeCall?.direction === "inbound";
  const callPhone = activeCall
    ? activeCall.direction === "inbound"
      ? activeCall.from
      : activeCall.to
    : null;
  const displayName = inCall
    ? activeCall?.contactName || callPhone || "Unknown caller"
    : currentItem?.lead?.name || "—";
  const displayCompany = inCall ? activeCall?.companyName || null : currentItem?.lead?.company || null;
  const displayPhone = inCall ? callPhone : currentItem?.leadPhone || null;

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
            {/* Who's on the line (live call) or the next queued lead */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isInbound && (
                <span className="text-[9px] uppercase tracking-wide font-semibold text-signal-blue-text bg-signal-blue/10 px-1.5 py-0.5 rounded-full shrink-0">
                  Incoming
                </span>
              )}
              <span className="text-[12px] font-semibold text-ink truncate">
                {displayName}
              </span>
              {displayCompany && (
                <span className="text-[11px] text-ink-muted truncate">
                  · {displayCompany}
                </span>
              )}
              {displayPhone && (
                <span className="text-[11px] text-ink-muted font-mono tabular-nums truncate">
                  · {displayPhone}
                </span>
              )}
              {!inCall && currentItem?.lead?.doNotCall && (
                <span className="text-[9px] uppercase tracking-wide font-semibold text-signal-red-text bg-signal-red/10 px-1.5 py-0.5 rounded-full shrink-0">
                  DNC
                </span>
              )}
            </div>

            {/* Call-state pill (connected / calling / paused). */}
            <StatusPill
              connected={connected}
              ringing={activeCall?.state === "ringing"}
              duration={activeCall?.duration ?? 0}
              paused={mode === "paused"}
            />

            {/* Animated "Next Call" button — fills as the countdown runs down.
                During a live countdown it means "dial the current lead now"
                (skip the wait → startNext). Otherwise — in a call, or stuck
                between leads with no countdown — it means "move to the NEXT
                lead" (nextNow: hangs up if needed, then dials the next). */}
            <NextCallButton
              counting={countingDown}
              countdown={countdown}
              total={autoAdvanceSeconds}
              inCall={inCall}
              onClick={() => (countingDown ? dialer.startNext() : void dialer.nextNow())}
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

              <WaitDropdown
                seconds={autoAdvanceSeconds}
                onChange={dialer.setAutoAdvanceSeconds}
              />

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
  paused,
}: {
  connected: boolean;
  ringing: boolean;
  duration: number;
  paused: boolean;
}) {
  // Only shown for active call / paused states — the countdown lives in the
  // animated Next Call button now.
  let label: string;
  let tone: "green" | "blue" | "amber" | null = null;
  if (connected) { label = `Connected · ${formatDuration(duration)}`; tone = "green"; }
  else if (ringing) { label = "Calling…"; tone = "blue"; }
  else if (paused) { label = "Paused"; tone = "amber"; }
  else return null;

  const toneClass = {
    green: "bg-signal-green/15 text-signal-green-text",
    blue: "bg-signal-blue/15 text-signal-blue-text",
    amber: "bg-amber-500/15 text-amber-600",
  }[tone];

  return (
    <span className={cn("shrink-0 text-[11px] font-medium rounded-full px-2.5 py-1 tabular-nums", toneClass)}>
      {label}
    </span>
  );
}

/** Pill that visually fills as the auto-dial countdown runs down. Click to dial
 *  now (or, mid-call, to hang up and move to the next lead). */
function NextCallButton({
  counting,
  countdown,
  total,
  inCall,
  onClick,
}: {
  counting: boolean;
  countdown: number | null;
  total: number;
  inCall: boolean;
  onClick: () => void;
}) {
  const progress =
    counting && total > 0 ? Math.max(0, Math.min(100, ((total - (countdown ?? 0)) / total) * 100)) : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      title={counting ? "Dial now — skip the wait" : inCall ? "Hang up & go to the next lead" : "Dial the next lead"}
      className="relative shrink-0 overflow-hidden inline-flex items-center rounded-full bg-signal-blue/15 text-signal-blue-text px-4 py-1.5 text-[12px] font-semibold hover:brightness-95 transition-[filter]"
    >
      {/* Fill — animates smoothly between the 1s countdown ticks. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-signal-blue/35"
        style={{ width: `${progress}%`, transition: counting ? "width 1s linear" : "none" }}
      />
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {inCall ? "Next" : "Next Call"}
        {counting && countdown !== null && <span className="tabular-nums opacity-80">· {countdown}s</span>}
        <ArrowRight size={13} strokeWidth={2.5} />
      </span>
    </button>
  );
}

/** Dropdown to choose the auto-dial wait between calls (default 5s). */
function WaitDropdown({
  seconds,
  onChange,
}: {
  seconds: number;
  onChange: (seconds: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const OPTIONS = [0, 3, 5, 8, 10, 15];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Wait between calls before auto-dialing"
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle tabular-nums"
      >
        <Timer size={12} strokeWidth={2} />
        {seconds === 0 ? "Off" : `${seconds}s`}
        <ChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[140px] bg-surface border border-border-default rounded-[10px] shadow-lg shadow-black/20 p-1.5">
          <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-ink-muted font-medium">Wait between calls</p>
          {OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false); }}
              className={cn(
                "flex items-center justify-between w-full rounded-md px-2.5 py-1.5 text-[12px] transition-colors",
                s === seconds ? "bg-section text-ink" : "text-ink-secondary hover:bg-hover",
              )}
            >
              {s === 0 ? "Manual (off)" : `${s} seconds`}
              {s === seconds && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
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
