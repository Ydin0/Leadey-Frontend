"use client";

import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { SourceBadge } from "./source-badge";
import type { LiveSignal } from "@/lib/types/pipeline";

function getScoreColor(score: number) {
  if (score >= 80) return "bg-signal-green text-signal-green-text";
  if (score >= 65) return "bg-signal-slate text-signal-slate-text";
  return "bg-section text-ink-faint";
}

interface SignalRowProps {
  signal: LiveSignal;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function SignalRow({ signal, selected, onSelect }: SignalRowProps) {
  const canSelect = signal.status === "enriched" || signal.status === "in_funnel";

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] hover:bg-hover/50 transition-colors group">
      {/* Checkbox */}
      <div className="w-4 shrink-0">
        {canSelect && (
          <button
            onClick={() => onSelect(signal.id)}
            className={cn(
              "w-4 h-4 rounded border transition-colors flex items-center justify-center",
              selected
                ? "bg-signal-blue-text border-signal-blue-text"
                : "border-border-default hover:border-signal-blue-text/50"
            )}
          >
            {selected && <Check size={10} strokeWidth={2.5} className="text-white" />}
          </button>
        )}
      </div>

      {/* Source Badge */}
      <SourceBadge source={signal.source} />

      {/* Company + Signal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-ink">{signal.company}</span>
          <span className="text-[10px] text-ink-faint">{signal.domain}</span>
        </div>
        <p className="text-[11px] text-ink-secondary truncate">{signal.signal}</p>
      </div>

      {/* Score */}
      <span className={cn("text-[10px] font-medium rounded-full px-1.5 py-0.5 shrink-0", getScoreColor(signal.score))}>
        {signal.score}
      </span>

      {/* Status */}
      <div className="w-16 flex items-center justify-end shrink-0">
        {signal.status === "new" && (
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal-blue-text opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-signal-blue-text" />
          </span>
        )}
        {signal.status === "enriching" && (
          <Loader2 size={12} strokeWidth={1.5} className="text-signal-blue-text animate-spin" />
        )}
        {signal.status === "enriched" && (
          <Check size={12} strokeWidth={2} className="text-signal-green-text" />
        )}
        {signal.status === "in_funnel" && (
          <Check size={12} strokeWidth={2} className="text-ink-muted" />
        )}
      </div>

      {/* Time */}
      <span className="text-[10px] text-ink-faint whitespace-nowrap w-12 text-right shrink-0">
        {formatRelativeTime(signal.time)}
      </span>
    </div>
  );
}
