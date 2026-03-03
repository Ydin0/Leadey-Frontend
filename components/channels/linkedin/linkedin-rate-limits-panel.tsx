"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { mockLinkedInRateLimits } from "@/lib/mock-data/channels";
import type { LinkedInRateLimit } from "@/lib/types/channel";

function getBarColor(current: number, limit: number): string {
  const pct = (current / limit) * 100;
  if (pct > 85) return "bg-signal-red-text";
  if (pct > 60) return "bg-signal-blue-text";
  return "bg-signal-green-text";
}

export function LinkedInRateLimitsPanel() {
  const [limits, setLimits] = useState<LinkedInRateLimit[]>(mockLinkedInRateLimits);

  function handleLimitChange(id: string, value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return;
    setLimits((prev) =>
      prev.map((l) => (l.id === id ? { ...l, limit: num } : l))
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
        Rate Limits & Usage
      </p>
      <div className="space-y-3">
        {limits.map((limit) => {
          const pct = limit.limit > 0 ? Math.min((limit.current / limit.limit) * 100, 100) : 0;
          return (
            <div key={limit.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-ink-secondary">{limit.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-ink font-medium">
                    {limit.current}
                  </span>
                  <span className="text-[10px] text-ink-faint">/</span>
                  <input
                    type="number"
                    value={limit.limit}
                    onChange={(e) => handleLimitChange(limit.id, e.target.value)}
                    className="w-14 px-2 py-0.5 rounded-[6px] bg-surface border border-border-subtle text-[11px] text-ink text-right focus:outline-none focus:border-border-default"
                    min={0}
                  />
                  <span className="text-[10px] text-ink-faint">{limit.period}</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-section overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", getBarColor(limit.current, limit.limit))}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
