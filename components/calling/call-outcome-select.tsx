"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Check, Settings2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { OUTCOME_COLOR_DOT, type CallOutcome } from "@/lib/api/call-outcomes";

function titleize(key: string): string {
  return key.split(/[_\s]+/).filter(Boolean).map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
}

interface Props {
  value: string | null | undefined;
  outcomes: CallOutcome[];
  onChange: (key: string | null) => void;
  /** Whether the AI set this (shows a subtle sparkle until a human confirms). */
  aiSuggested?: boolean;
  size?: "sm" | "md";
}

/**
 * Close-style call-outcome picker: a coloured pill showing the current outcome
 * with a dropdown to change it (or clear), plus a link to manage the list.
 */
export function CallOutcomeSelect({ value, outcomes, onChange, aiSuggested, size = "md" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const current = value ? outcomes.find((o) => o.key === value) : null;
  const dot = current ? OUTCOME_COLOR_DOT[current.color] : "bg-ink-faint";
  const label = current?.label ?? (value ? titleize(value) : "Set outcome");
  const pad = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]";

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full font-medium border transition-colors",
          pad,
          value
            ? "bg-section border-border-subtle text-ink-secondary hover:border-border-default"
            : "bg-transparent border-dashed border-border-default text-ink-muted hover:bg-hover",
        )}
      >
        {value && <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />}
        <span className="truncate max-w-[160px]">{label}</span>
        {aiSuggested && value && <Sparkles size={10} className="text-accent" />}
        <ChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 min-w-[230px] bg-surface rounded-[12px] border border-border-default shadow-lg shadow-black/20 py-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {value && (
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-[12px] text-signal-blue-text hover:bg-hover transition-colors"
            >
              Clear
            </button>
          )}
          {value && <div className="my-1 border-t border-border-subtle" />}
          {outcomes.map((o) => (
            <button
              key={o.key}
              onClick={() => { onChange(o.key); setOpen(false); }}
              className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-[12px] text-ink hover:bg-hover transition-colors text-left"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", OUTCOME_COLOR_DOT[o.color])} />
                <span className="truncate">{o.label}</span>
              </span>
              {value === o.key && <Check size={13} className="text-ink-secondary shrink-0" />}
            </button>
          ))}
          <div className="my-1 border-t border-border-subtle" />
          <Link
            href="/dashboard/settings?tab=call-outcomes"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11.5px] text-ink-muted hover:bg-hover transition-colors"
          >
            <Settings2 size={12} /> Manage outcomes…
          </Link>
        </div>
      )}
    </div>
  );
}
