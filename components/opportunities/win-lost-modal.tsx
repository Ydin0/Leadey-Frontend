"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";

interface WinLostModalProps {
  variant: "win" | "lose";
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
}

export function WinLostModal({ variant, onClose, onConfirm }: WinLostModalProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isWin = variant === "win";

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(isWin ? undefined : reason.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-[14px] border border-border-subtle w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="text-[14px] font-semibold text-ink">
            {isWin ? "Mark as Won" : "Mark as Lost"}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-hover text-ink-muted">
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-[12px] text-ink-muted">
            {isWin
              ? "This moves the opportunity to the Won stage and stamps a close date."
              : "The opportunity will close and stop counting toward your forecast. Adding a reason helps spot patterns."}
          </p>

          {!isWin && (
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1">
                Reason (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="e.g. Lost to competitor, no budget, timing"
                className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink outline-none resize-none focus:border-border-default placeholder:text-ink-faint"
              />
            </div>
          )}

          {error && (
            <p className="text-[11px] text-signal-red-text">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-subtle">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={
              isWin
                ? "flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] bg-signal-green text-signal-green-text text-[11px] font-medium hover:opacity-90 disabled:opacity-50"
                : "flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] bg-signal-red-text text-white text-[11px] font-medium hover:opacity-90 disabled:opacity-50"
            }
          >
            {busy && <Loader2 size={11} className="animate-spin" />}
            {isWin ? "Mark Won" : "Mark Lost"}
          </button>
        </div>
      </div>
    </div>
  );
}
