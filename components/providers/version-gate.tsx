"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useCallContext } from "@/components/calling/call-context";

/** Build SHA baked into THIS bundle at build time (see next.config.ts). */
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "dev";
const POLL_MS = 60_000;
/** Force a reload after this long stale (no call), even if the tab stays focused. */
const FORCE_AFTER_MS = 120_000;

/**
 * Detects when this tab is running an outdated JS bundle after a new deploy and
 * reloads it. Critical for calling: a stale tab runs old call-handling code
 * (e.g. an old build that auto-answered inbound calls), so we never want one
 * lingering. Auto-reloads only when there's no live/ringing call; otherwise the
 * rep can reload via the banner. No-op in local dev (BUILD_ID === "dev").
 */
export function VersionGate() {
  const { activeCall, incomingCall } = useCallContext();
  const [stale, setStale] = useState(false);
  const staleSinceRef = useRef<number | null>(null);

  useEffect(() => {
    if (BUILD_ID === "dev") return;
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/app-version", { cache: "no-store" });
        const data = await res.json();
        const live = data?.buildId;
        if (!cancelled && live && live !== "dev" && live !== BUILD_ID) {
          if (staleSinceRef.current === null) staleSinceRef.current = Date.now();
          setStale(true);
        }
      } catch {
        // offline / transient — try again next tick
      }
    }
    void check();
    const timer = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // Reload when it's safe: never mid-call. Prefer when the tab is backgrounded,
  // and force after a grace period so a forgotten foreground tab still heals.
  const busy = !!activeCall || !!incomingCall;
  useEffect(() => {
    if (!stale) return;
    const maybeReload = () => {
      if (busy) return;
      const elapsed = Date.now() - (staleSinceRef.current ?? Date.now());
      if (document.hidden || elapsed > FORCE_AFTER_MS) {
        window.location.reload();
      }
    };
    maybeReload();
    const t = setInterval(maybeReload, 5_000);
    document.addEventListener("visibilitychange", maybeReload);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", maybeReload);
    };
  }, [stale, busy]);

  if (!stale) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-3 bg-ink text-on-ink rounded-full pl-4 pr-2 py-2 shadow-2xl">
      <RefreshCw size={14} />
      <span className="text-[12px] font-medium">A new version of Leadey is available.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-3 py-1 rounded-full bg-on-ink/15 text-on-ink text-[11px] font-medium hover:bg-on-ink/25 transition-colors"
      >
        Reload
      </button>
    </div>
  );
}
