"use client";

import { useCallContext } from "@/components/calling/call-context";
import { useDialerContext } from "../context/dialer-context";
import {
  PhoneOff,
  Phone,
  Mic,
  MicOff,
  Pause,
  Voicemail,
  SkipForward,
  Undo2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function CallControlPanel() {
  const call = useCallContext();
  const dialer = useDialerContext();
  const active = call.activeCall;
  const state = active?.state || "idle";

  // ── State labels ────────────────────────────────────────────────
  const statusLabel =
    state === "ringing"
      ? "Ringing…"
      : state === "connected"
        ? "Connected"
        : state === "ended"
          ? "Call ended"
          : "Ready to dial";

  const amdHint = dialer.amdResult ? `AMD: ${dialer.amdResult}` : null;

  return (
    <section className="flex flex-col items-center justify-center h-full px-8 py-6">
      {/* Status / phone */}
      <div className="text-center mb-8">
        <p className="text-[11px] uppercase tracking-wider text-ink-muted">
          {statusLabel}
        </p>
        <p className="text-[34px] font-semibold text-ink mt-1 font-mono">
          {dialer.currentItem?.leadPhone || "—"}
        </p>
        {state === "connected" && (
          <p className="text-[14px] text-ink-secondary mt-1">
            {formatDuration(active?.duration || 0)}
          </p>
        )}
        {amdHint && (
          <p className="text-[10px] uppercase tracking-wider text-signal-blue-text mt-2">
            {amdHint}
          </p>
        )}
      </div>

      {/* Main action */}
      <div className="flex items-center gap-4 mb-8">
        {state === "idle" || state === "ended" ? (
          <button
            type="button"
            onClick={dialer.startNext}
            disabled={!dialer.currentItem || dialer.awaitingDisposition}
            className={cn(
              "flex items-center justify-center w-16 h-16 rounded-full bg-signal-green text-signal-green-text hover:opacity-90 transition-opacity disabled:opacity-40",
            )}
            title="Press SPACE to start next call"
          >
            <Phone size={24} />
          </button>
        ) : (
          <button
            type="button"
            onClick={call.endCall}
            className="flex items-center justify-center w-16 h-16 rounded-full bg-signal-red-text text-white hover:opacity-90 transition-opacity"
            title="Press ESC to hang up"
          >
            <PhoneOff size={24} />
          </button>
        )}
      </div>

      {/* In-call actions */}
      {(state === "ringing" || state === "connected") && (
        <div className="flex items-center gap-3 mb-6">
          <IconBtn
            onClick={call.toggleMute}
            active={!!active?.isMuted}
            icon={active?.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            label="Mute (M)"
          />
          <IconBtn
            onClick={call.toggleHold}
            active={!!active?.isOnHold}
            icon={<Pause size={16} />}
            label="Hold (H)"
          />
          <IconBtn
            onClick={() => void dialer.dropVm()}
            icon={<Voicemail size={16} />}
            label="Drop VM (V)"
            disabled={state !== "connected"}
            highlight
          />
        </div>
      )}

      {/* Always-available actions */}
      <div className="flex items-center gap-3">
        <IconBtn
          onClick={() => void dialer.skip()}
          icon={<SkipForward size={14} />}
          label="Skip (S)"
          disabled={!dialer.currentItem}
        />
        <IconBtn
          onClick={() => void dialer.back()}
          icon={<Undo2 size={14} />}
          label="Back (B)"
        />
      </div>

      {/* Loading / errors */}
      {dialer.loading && (
        <div className="mt-6 flex items-center gap-2 text-[11px] text-ink-muted">
          <Loader2 size={12} className="animate-spin" /> Loading queue…
        </div>
      )}
      {dialer.error && (
        <p className="mt-6 text-[11px] text-signal-red-text">{dialer.error}</p>
      )}
    </section>
  );
}

function IconBtn({
  onClick,
  icon,
  label,
  active,
  disabled,
  highlight,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "flex flex-col items-center gap-1 px-3 py-2 rounded-[10px] text-[10px] font-medium transition-colors disabled:opacity-30",
        active
          ? "bg-signal-blue text-signal-blue-text"
          : highlight
            ? "bg-signal-green/20 text-signal-green-text hover:bg-signal-green/30"
            : "bg-section text-ink-secondary hover:bg-hover",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
