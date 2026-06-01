"use client";

import { useDialerContext } from "../context/dialer-context";

/** Pulses on the disposition panel when the call has ended and the rep
 *  needs to pick a disposition before the next dial. We render a small
 *  banner rather than blocking the whole UI, so the rep can also add notes
 *  before clicking the disposition. */
export function AwaitingDispositionOverlay() {
  const { awaitingDisposition } = useDialerContext();
  if (!awaitingDisposition) return null;
  return (
    <div className="absolute inset-x-0 top-0 z-10 px-4 py-2 bg-signal-blue text-signal-blue-text text-[11px] font-medium text-center border-b border-signal-blue-text/20">
      Pick a disposition to continue → press 1–9 or click on the right
    </div>
  );
}
