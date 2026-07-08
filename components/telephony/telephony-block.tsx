"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneOff, ArrowRight } from "lucide-react";
import { apiRequest } from "@/lib/api/client";
import { usePermissions } from "@/lib/hooks/use-permissions";

/**
 * Telephony spend gate (client side). The server hard-blocks outbound
 * calls/SMS/number purchases when the org's wallet balance hits its floor
 * (or the monthly budget is reached); this module gives users a proper
 * "out of calling credit" modal instead of dead air / raw errors.
 */

export interface TelephonyStatus {
  blocked: boolean;
  reason: "floor" | "budget" | null;
  floorMinor: number;
  liveBalanceMinor: number;
}

// Module-level cache: dialer bursts and per-keystroke UI must not hammer
// the endpoint. The server caches 60s on top.
let cached: { at: number; status: TelephonyStatus } | null = null;
const CACHE_TTL_MS = 30 * 1000;

export async function fetchTelephonyStatus(force = false): Promise<TelephonyStatus> {
  if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.status;
  const status = await apiRequest<TelephonyStatus>("/credits/telephony/status");
  cached = { at: Date.now(), status };
  return status;
}

/** True when a server error is the telephony spend-gate 403 (the API
 *  throws message-only Errors, so we match the stable phrasing). */
export function isTelephonyBlockedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  return msg.includes("out of calling credit") || msg.includes("telephony budget has been reached");
}

/** Gate hook: `ensureAllowed()` resolves true to proceed, or false after
 *  opening the block modal. Render `blockModal` in the host component. */
export function useTelephonyBlock() {
  const [blockedStatus, setBlockedStatus] = useState<TelephonyStatus | null>(null);

  const ensureAllowed = useCallback(async (): Promise<boolean> => {
    try {
      const status = await fetchTelephonyStatus();
      if (status.blocked) {
        setBlockedStatus(status);
        return false;
      }
      return true;
    } catch {
      // Status check failing must never block work — the server enforces.
      return true;
    }
  }, []);

  const showBlockModal = useCallback((status?: TelephonyStatus | null) => {
    setBlockedStatus(status ?? { blocked: true, reason: "floor", floorMinor: 0, liveBalanceMinor: 0 });
  }, []);

  const blockModal = blockedStatus ? (
    <TelephonyBlockModal status={blockedStatus} onClose={() => setBlockedStatus(null)} />
  ) : null;

  return { ensureAllowed, showBlockModal, blockModal };
}

export function TelephonyBlockModal({
  status,
  onClose,
}: {
  status: TelephonyStatus;
  onClose: () => void;
}) {
  const router = useRouter();
  const { has } = usePermissions();
  const canTopUp = has("settings.manageBilling");
  const isFloor = status.reason !== "budget";
  const fmt = (minor: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(minor / 100);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-[3px] p-4"
      onClick={onClose}
    >
      <style>{`@keyframes telblock-in { 0% { transform: scale(0.92) translateY(8px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }`}</style>
      <div
        className="w-full max-w-[400px] bg-surface rounded-[16px] border border-border-subtle shadow-2xl overflow-hidden"
        style={{ animation: "telblock-in 0.25s cubic-bezier(0.21, 1.02, 0.73, 1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-7 pb-5 text-center">
          <div className="w-14 h-14 rounded-full bg-signal-red/15 flex items-center justify-center mx-auto">
            <PhoneOff size={22} className="text-signal-red-text" />
          </div>
          <h3 className="text-[16px] font-semibold text-ink mt-4">
            {isFloor ? "Out of calling credit" : "Monthly telephony budget reached"}
          </h3>
          <p className="text-[12px] text-ink-muted mt-2 max-w-[320px] mx-auto">
            {isFloor ? (
              <>
                Your telephony balance{" "}
                <span className="font-medium text-signal-red-text tabular-nums">{fmt(status.liveBalanceMinor)}</span>{" "}
                has reached its {fmt(status.floorMinor)} limit, so outbound calls and texts are
                paused.{" "}
                {canTopUp
                  ? "Top up your balance to resume instantly."
                  : "Please ask your workspace admin to top up the balance."}
              </>
            ) : canTopUp ? (
              "Your team has hit its monthly telephony spending limit. Raise the limit in Settings → Credits to resume calling and texting."
            ) : (
              "Your team has hit its monthly telephony spending limit. Please ask your workspace admin to raise it."
            )}
          </p>
        </div>

        <div className="px-6 pb-6 flex items-center justify-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[20px] text-[11.5px] font-medium text-ink-secondary border border-border-subtle hover:bg-hover transition-colors"
          >
            Close
          </button>
          {canTopUp && (
            <button
              onClick={() => {
                onClose();
                router.push("/dashboard/settings?tab=credits");
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-[20px] bg-ink text-on-ink text-[11.5px] font-medium hover:opacity-90 transition-opacity"
            >
              {isFloor ? "Top up balance" : "Open Credits settings"} <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
