"use client";

import { useState } from "react";
import { MapPin, Loader2, Lock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { provisionLocalNumber, type UncoveredState } from "@/lib/api/calls";

interface Props {
  uncovered: UncoveredState[];
  costPer: number;
  canProvision: boolean;
  /** Continue and start the dialer (after kicking off any purchases). */
  onProceed: () => void;
}

/**
 * Shown once at the start of a dialer session when the list contains US states
 * the org has no local number for. Lets an admin buy local numbers for the
 * chosen states (one consolidated decision, with total cost) before dialing.
 * Buys run in the background — covered states start dialing immediately.
 */
export function LocalPresencePreflightModal({ uncovered, costPer, canProvision, onProceed }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(uncovered.map((u) => u.state)));
  const [working, setWorking] = useState(false);

  const toggle = (state: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(state)) next.delete(state);
      else next.add(state);
      return next;
    });

  const chosen = uncovered.filter((u) => selected.has(u.state));
  const total = (chosen.length * costPer).toFixed(2);

  function buyAndStart() {
    setWorking(true);
    // Fire-and-forget: provision the chosen states in the background so dialing
    // starts now; numbers get used by rotation as soon as they're ready.
    for (const u of chosen) {
      void provisionLocalNumber({ areaCode: u.sampleAreaCode }).catch((err) =>
        console.warn("[local-presence] provision failed for", u.state, err),
      );
    }
    onProceed();
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-[14px] border border-border-subtle w-full max-w-md mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-[14px] font-semibold text-ink flex items-center gap-2"><MapPin size={15} className="text-ink-muted" /> Local presence</h2>
          <p className="text-[11px] text-ink-muted mt-0.5">
            This list reaches {uncovered.length} state{uncovered.length === 1 ? "" : "s"} you don&apos;t have a local number for. Calls there will use your default line unless you add one.
          </p>
        </div>

        <div className="px-5 py-3 max-h-[300px] overflow-y-auto">
          {!canProvision && (
            <p className="text-[11px] text-ink-faint flex items-center gap-1.5 mb-3"><Lock size={11} /> Ask an admin to add local numbers for these states.</p>
          )}
          <div className="flex flex-col gap-1">
            {uncovered.map((u) => (
              <label key={u.state} className={cn("flex items-center gap-2.5 px-3 py-2 rounded-[8px] border transition-colors", canProvision ? "bg-section/40 border-border-subtle hover:bg-hover cursor-pointer" : "bg-section/30 border-border-subtle")}>
                {canProvision && (
                  <input type="checkbox" checked={selected.has(u.state)} onChange={() => toggle(u.state)} className="rounded" />
                )}
                <span className="flex-1 text-[12.5px] text-ink font-medium">{u.stateName}</span>
                <span className="text-[10px] text-ink-muted tabular-nums">{u.leadCount} lead{u.leadCount === 1 ? "" : "s"} · {u.sampleAreaCode}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border-subtle">
          <span className="text-[11px] text-ink-muted">
            {canProvision && chosen.length > 0 ? `${chosen.length} number${chosen.length === 1 ? "" : "s"} · ~$${total}/mo` : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onProceed}
              disabled={working}
              className="px-4 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors disabled:opacity-50"
            >
              Skip &amp; start
            </button>
            {canProvision && (
              <button
                onClick={buyAndStart}
                disabled={working || chosen.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] bg-signal-green text-signal-green-text text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {working ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={11} />}
                Buy {chosen.length || ""} &amp; start
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
