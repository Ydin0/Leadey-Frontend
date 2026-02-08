"use client";

import { useState } from "react";
import { Phone, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CockpitCallItem } from "@/lib/types/funnel";

type CallOutcome = "connected" | "voicemail" | "no_answer" | "reschedule";

function CallCard({ item }: { item: CockpitCallItem }) {
  const [expanded, setExpanded] = useState(false);
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);

  if (outcome) return null;

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle overflow-hidden">
      {/* Collapsed */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-hover/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-signal-green/20 flex items-center justify-center shrink-0">
            <Phone size={14} strokeWidth={1.5} className="text-signal-green-text" />
          </div>
          <div className="text-left">
            <div className="text-[12px] font-medium text-ink">{item.name}</div>
            <div className="text-[11px] text-ink-muted">{item.title} at {item.company}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-ink-secondary font-mono">{item.phone}</span>
          {expanded ? (
            <ChevronUp size={14} className="text-ink-faint" />
          ) : (
            <ChevronDown size={14} className="text-ink-faint" />
          )}
        </div>
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border-subtle">
          {/* Hook */}
          <div className="mt-3 mb-3">
            <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Opening</span>
            <p className="text-[11px] text-ink-secondary mt-1 leading-relaxed">{item.script.hook}</p>
          </div>

          {/* Talking Points */}
          <div className="mb-3">
            <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Talking Points</span>
            <ul className="mt-1 space-y-1">
              {item.script.talkingPoints.map((point, i) => (
                <li key={i} className="text-[11px] text-ink-secondary flex items-start gap-1.5">
                  <span className="text-ink-faint mt-0.5">&#8226;</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Objection Handlers */}
          <div className="mb-4">
            <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Objection Handlers</span>
            <ul className="mt-1 space-y-1">
              {item.script.objectionHandlers.map((handler, i) => (
                <li key={i} className="text-[11px] text-ink-secondary italic">{handler}</li>
              ))}
            </ul>
          </div>

          {/* Outcome Buttons */}
          <div className="flex items-center gap-2">
            {(
              [
                { key: "connected", label: "Connected", className: "bg-signal-green text-signal-green-text" },
                { key: "voicemail", label: "Voicemail", className: "bg-signal-blue text-signal-blue-text" },
                { key: "no_answer", label: "No Answer", className: "bg-signal-slate text-signal-slate-text" },
                { key: "reschedule", label: "Reschedule", className: "bg-section text-ink-muted" },
              ] as const
            ).map((btn) => (
              <button
                key={btn.key}
                onClick={() => setOutcome(btn.key)}
                className={cn("px-3 py-1.5 rounded-[20px] text-[10px] font-medium transition-colors", btn.className)}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CallQueue({ items }: { items: CockpitCallItem[] }) {
  if (items.length === 0) {
    return (
      <div className="bg-surface rounded-[14px] border border-border-subtle p-6 text-center">
        <Phone size={20} strokeWidth={1.5} className="text-ink-faint mx-auto mb-2" />
        <p className="text-[12px] text-ink-muted">No calls queued</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Phone size={14} strokeWidth={1.5} className="text-signal-green-text" />
        <h3 className="text-[13px] font-semibold text-ink">Call Queue</h3>
        <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-section text-ink-muted">{items.length}</span>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <CallCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
