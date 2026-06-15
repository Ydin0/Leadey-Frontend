"use client";

import { useState } from "react";
import { X, Loader2, ShieldCheck, UserCheck, Clock, Calendar, AlertCircle, Play } from "lucide-react";
import { createSession, getActiveSession, endSession } from "@/lib/api/dialer";
import { useDialerContext } from "@/components/dialer/context/dialer-context";
import type { FunnelStep } from "@/lib/types/funnel";

interface DialerConfigModalProps {
  /** Step mode: queue leads on this call step. */
  step?: FunnelStep;
  /** Campaign mode: queue every phone-having lead in this funnel (used when
   *  the campaign has no call step). */
  funnelId?: string;
  onClose: () => void;
}

export function DialerConfigModal({ step, funnelId, onClose }: DialerConfigModalProps) {
  const dialer = useDialerContext();
  const [excludeDoNotCall, setExcludeDoNotCall] = useState(true);
  const [excludeClosed, setExcludeClosed] = useState(true);
  const [excludeRecentlyCalled, setExcludeRecentlyCalled] = useState(true);
  const [recentlyCalledDays, setRecentlyCalledDays] = useState(2);
  const [respectTimezone, setRespectTimezone] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState<number | null>(3);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const { session } = await createSession({
        ...(step ? { funnelStepId: step.id } : { funnelId }),
        filters: {
          excludeDoNotCall,
          excludeClosed,
          excludeRecentlyCalled,
          recentlyCalledDays,
          respectTimezone,
          maxAttempts,
        },
      });
      // Show the persistent dialer bar in place — no navigation.
      dialer.beginSession(session);
      onClose();
    } catch (err: any) {
      const msg = err?.message || "Failed to start dialer";
      if (msg.toLowerCase().includes("active dialer session")) {
        // Offer to resume / end the existing session rather than dead-ending.
        try {
          const active = await getActiveSession();
          setActiveSessionId(active?.id ?? null);
        } catch {
          setActiveSessionId(null);
        }
        setError("You already have a power dialer in progress.");
      } else {
        setError(msg);
      }
      setStarting(false);
    }
  }

  async function handleResume() {
    // Load the existing session into the persistent dialer bar (beginSession
    // pulls the current item) and close — actually resuming, not just dismissing.
    try {
      const active = await getActiveSession();
      if (active) dialer.beginSession(active);
    } catch {
      /* fall through to close */
    }
    onClose();
  }

  async function handleEndAndStart() {
    if (!activeSessionId) return;
    setEnding(true);
    try {
      await endSession(activeSessionId);
      setActiveSessionId(null);
      setError(null);
      await handleStart();
    } catch {
      setError("Couldn't end the active session. Try again.");
    } finally {
      setEnding(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-[14px] border border-border-subtle w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div>
            <h2 className="text-[14px] font-semibold text-ink">Start Power Dialer</h2>
            <p className="text-[11px] text-ink-muted mt-0.5">
              {step ? `Step: ${step.label}` : "All leads in this campaign"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-hover text-ink-muted"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-[11px] text-ink-muted">
            Choose who to include. Filters apply at queue creation; you can
            disposition them all once the session starts.
          </p>

          <FilterRow
            icon={<ShieldCheck size={13} className="text-signal-green-text" />}
            label="Exclude DNC contacts"
            description="Skip anyone marked Do Not Call"
            value={excludeDoNotCall}
            onChange={setExcludeDoNotCall}
          />
          <FilterRow
            icon={<UserCheck size={13} className="text-signal-green-text" />}
            label="Only new & follow-up leads"
            description="Skip Not Interested, DNC, Qualified and other closed leads"
            value={excludeClosed}
            onChange={setExcludeClosed}
          />
          <FilterRow
            icon={<Clock size={13} className="text-signal-blue-text" />}
            label="Exclude recently called"
            description="Skip anyone called within the window below"
            value={excludeRecentlyCalled}
            onChange={setExcludeRecentlyCalled}
          />
          {excludeRecentlyCalled && (
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-[8px] bg-section ml-7">
              <p className="text-[12px] font-medium text-ink">Recently-called window</p>
              <select
                value={recentlyCalledDays}
                onChange={(e) => setRecentlyCalledDays(Number(e.target.value))}
                className="px-2 py-1 rounded-[6px] bg-surface text-[12px] text-ink border border-border-subtle outline-none focus:border-border-default"
              >
                <option value={1}>1 day</option>
                <option value={2}>2 days</option>
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
              </select>
            </div>
          )}
          <FilterRow
            icon={<Calendar size={13} className="text-ink-muted" />}
            label="Respect timezone"
            description="Only queue contacts currently within their business hours"
            value={respectTimezone}
            onChange={setRespectTimezone}
          />

          <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-[8px] bg-section">
            <div>
              <p className="text-[12px] font-medium text-ink">Max attempts per contact (last 24h)</p>
              <p className="text-[10px] text-ink-muted">Empty = no limit</p>
            </div>
            <input
              type="number"
              value={maxAttempts ?? ""}
              min={1}
              max={10}
              onChange={(e) => setMaxAttempts(e.target.value === "" ? null : Number(e.target.value))}
              className="w-16 px-2 py-1 rounded-[6px] bg-surface text-[12px] text-ink border border-border-subtle text-center outline-none focus:border-border-default"
            />
          </div>

          {error && (
            <div className="rounded-[8px] bg-signal-red/10 border border-signal-red-text/20 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle size={12} className="text-signal-red-text shrink-0 mt-0.5" />
                <p className="text-[11px] text-signal-red-text">{error}</p>
              </div>
              {activeSessionId && (
                <div className="flex items-center gap-2 mt-2.5 pl-5">
                  <button
                    type="button"
                    onClick={() => void handleResume()}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-[20px] bg-signal-green text-signal-green-text text-[11px] font-medium hover:opacity-90 transition-opacity"
                  >
                    <Play size={11} /> Resume it
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleEndAndStart()}
                    disabled={ending || starting}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle disabled:opacity-50"
                  >
                    {ending ? <Loader2 size={11} className="animate-spin" /> : null}
                    End & start new
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-subtle">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={starting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] bg-signal-green text-signal-green-text text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {starting && <Loader2 size={11} className="animate-spin" />}
            {starting ? "Starting…" : "Start Dialing"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterRow({
  icon,
  label,
  description,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 px-3 py-2 rounded-[8px] bg-section hover:bg-hover cursor-pointer transition-colors">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 rounded"
      />
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-[12px] font-medium text-ink">{label}</span>
        </div>
        <p className="text-[10px] text-ink-muted mt-0.5">{description}</p>
      </div>
    </label>
  );
}
