"use client";

import { useState } from "react";
import { GitFork, Users } from "lucide-react";
import { SignalRow } from "./signal-row";
import type { LiveSignal } from "@/lib/types/pipeline";

interface LiveSignalFeedProps {
  signals: LiveSignal[];
}

export function LiveSignalFeed({ signals }: LiveSignalFeedProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllEnriched() {
    const enrichedIds = signals
      .filter((s) => s.status === "enriched" || s.status === "in_funnel")
      .map((s) => s.id);
    setSelected(new Set(enrichedIds));
  }

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold text-ink">Live Signal Feed</h3>
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal-blue-text opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-signal-blue-text" />
          </span>
          <span className="text-[10px] font-medium bg-signal-blue text-signal-blue-text rounded-full px-1.5 py-0.5">
            {signals.length}
          </span>
        </div>
        <button onClick={selectAllEnriched} className="text-[10px] text-signal-blue-text hover:text-signal-blue-text/80 transition-colors">
          Select All Enriched
        </button>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-signal-blue/30 border-b border-border-subtle">
          <span className="text-[11px] font-medium text-ink">{selected.size} selected</span>
          <button className="flex items-center gap-1 px-2.5 py-1 rounded-[16px] bg-ink text-on-ink text-[10px] font-medium hover:bg-ink/90 transition-colors">
            <Users size={10} strokeWidth={1.5} />
            Enrich {selected.size} Selected
          </button>
          <button className="flex items-center gap-1 px-2.5 py-1 rounded-[16px] bg-section text-ink-secondary text-[10px] font-medium hover:bg-hover transition-colors">
            <GitFork size={10} strokeWidth={1.5} />
            Add to Funnel
          </button>
        </div>
      )}

      {/* Signal Rows */}
      <div className="divide-y divide-border-subtle">
        {signals.map((signal) => (
          <SignalRow
            key={signal.id}
            signal={signal}
            selected={selected.has(signal.id)}
            onSelect={toggleSelect}
          />
        ))}
      </div>
    </div>
  );
}
