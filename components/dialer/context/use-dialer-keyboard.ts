"use client";

import { useEffect } from "react";
import { useDialerContext } from "./dialer-context";
import { useCallContext } from "@/components/calling/call-context";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

/** Global keyboard shortcuts for the power-dialer bar. Disabled while typing
 *  in a text input. Mounted by the bar, so active whenever a session runs. */
export function useDialerKeyboard(): void {
  const dialer = useDialerContext();
  const call = useCallContext();

  useEffect(() => {
    if (!dialer.session) return;

    function onKey(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;

      // Space — pause / resume the auto-dialer.
      if (key === " " || key === "Spacebar") {
        e.preventDefault();
        if (dialer.mode === "paused") void dialer.resume();
        else void dialer.pause(true); // explicit pause hangs up the live call
        return;
      }

      // Esc / End — hang up the live call.
      if (key === "Escape" || key === "End") {
        if (call.activeCall) {
          e.preventDefault();
          call.endCall();
        }
        return;
      }

      // V — drop voicemail (while connected).
      if (key === "v" || key === "V") {
        if (call.activeCall?.state === "connected") {
          e.preventDefault();
          void dialer.dropVm();
        }
        return;
      }

      // S — next call: go to the next lead and dial it now.
      if (key === "s" || key === "S") {
        e.preventDefault();
        void dialer.nextNow();
        return;
      }

      // B — back to previous.
      if (key === "b" || key === "B") {
        e.preventDefault();
        void dialer.back();
        return;
      }

      // M — mute toggle (while connected).
      if (key === "m" || key === "M") {
        if (call.activeCall?.state === "connected") {
          e.preventDefault();
          call.toggleMute();
        }
        return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialer, call]);
}
