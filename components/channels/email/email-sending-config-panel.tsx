"use client";

import { useState } from "react";

export function EmailSendingConfigPanel() {
  const [dailyLimit, setDailyLimit] = useState(200);
  const [warmupEnabled, setWarmupEnabled] = useState(true);
  const [minutesBetweenSends, setMinutesBetweenSends] = useState(3);
  const [trackOpens, setTrackOpens] = useState(true);
  const [trackClicks, setTrackClicks] = useState(true);

  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
        Sending Configuration
      </p>

      {/* Daily sending limit */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] text-ink font-medium">Daily sending limit</p>
          <p className="text-[10px] text-ink-muted">Max emails sent per day across all accounts</p>
        </div>
        <input
          type="number"
          value={dailyLimit}
          onChange={(e) => setDailyLimit(parseInt(e.target.value, 10) || 0)}
          className="w-20 px-2 py-1.5 rounded-[8px] bg-surface border border-border-subtle text-[11px] text-ink text-right focus:outline-none focus:border-border-default"
          min={0}
        />
      </div>

      {/* Warmup mode */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] text-ink font-medium">Warmup mode</p>
          <p className="text-[10px] text-ink-muted">Gradually increase sending volume for new accounts</p>
        </div>
        <button
          type="button"
          onClick={() => setWarmupEnabled(!warmupEnabled)}
          className={`relative w-9 h-5 rounded-full transition-colors ${
            warmupEnabled ? "bg-signal-green-text" : "bg-section"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-surface transition-transform shadow-sm ${
              warmupEnabled ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Minutes between sends */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] text-ink font-medium">Minutes between sends</p>
          <p className="text-[10px] text-ink-muted">Delay between individual email sends</p>
        </div>
        <input
          type="number"
          value={minutesBetweenSends}
          onChange={(e) => setMinutesBetweenSends(parseInt(e.target.value, 10) || 0)}
          className="w-20 px-2 py-1.5 rounded-[8px] bg-surface border border-border-subtle text-[11px] text-ink text-right focus:outline-none focus:border-border-default"
          min={0}
        />
      </div>

      {/* Track opens */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] text-ink font-medium">Track opens</p>
          <p className="text-[10px] text-ink-muted">Insert tracking pixel to monitor email opens</p>
        </div>
        <button
          type="button"
          onClick={() => setTrackOpens(!trackOpens)}
          className={`relative w-9 h-5 rounded-full transition-colors ${
            trackOpens ? "bg-signal-green-text" : "bg-section"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-surface transition-transform shadow-sm ${
              trackOpens ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Track link clicks */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] text-ink font-medium">Track link clicks</p>
          <p className="text-[10px] text-ink-muted">Rewrite links to track click-through rates</p>
        </div>
        <button
          type="button"
          onClick={() => setTrackClicks(!trackClicks)}
          className={`relative w-9 h-5 rounded-full transition-colors ${
            trackClicks ? "bg-signal-green-text" : "bg-section"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-surface transition-transform shadow-sm ${
              trackClicks ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
