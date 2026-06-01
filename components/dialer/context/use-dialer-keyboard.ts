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

/** Global keyboard shortcuts for the dialer session. Disabled when the user
 *  is typing in a text input. Mount once at the top of the session page. */
export function useDialerKeyboard(): void {
  const dialer = useDialerContext();
  const call = useCallContext();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      // Modifier-bearing combos are not ours (let copy/paste etc. flow).
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;

      // Space — start next call (only when idle and not awaiting dispo)
      if (key === " " || key === "Spacebar") {
        if (dialer.awaitingDisposition) return;
        if (call.activeCall) return;
        if (!dialer.currentItem) return;
        e.preventDefault();
        dialer.startNext();
        return;
      }

      // Esc / End — hang up
      if (key === "Escape" || key === "End") {
        if (call.activeCall) {
          e.preventDefault();
          call.endCall();
        }
        return;
      }

      // V — drop voicemail (only while connected)
      if (key === "v" || key === "V") {
        if (call.activeCall?.state === "connected") {
          e.preventDefault();
          void dialer.dropVm();
        }
        return;
      }

      // S — skip current (no disposition)
      if (key === "s" || key === "S") {
        e.preventDefault();
        void dialer.skip();
        return;
      }

      // B — back to previous
      if (key === "b" || key === "B") {
        e.preventDefault();
        void dialer.back();
        return;
      }

      // N — advance with last-used disposition
      if (key === "n" || key === "N") {
        if (dialer.awaitingDisposition && dialer.lastDispositionSlug) {
          e.preventDefault();
          void dialer.advance(dialer.lastDispositionSlug);
        }
        return;
      }

      // M — mute toggle
      if (key === "m" || key === "M") {
        if (call.activeCall?.state === "connected") {
          e.preventDefault();
          call.toggleMute();
        }
        return;
      }

      // H — hold toggle
      if (key === "h" || key === "H") {
        if (call.activeCall?.state === "connected") {
          e.preventDefault();
          call.toggleHold();
        }
        return;
      }

      // 1-9 — disposition hotkeys (only when awaiting disposition)
      if (/^[1-9]$/.test(key) && dialer.awaitingDisposition) {
        const match = dialer.dispositions.find((d) => d.hotkey === key);
        if (match) {
          e.preventDefault();
          void dialer.advance(match.slug);
        }
        return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialer, call]);
}
