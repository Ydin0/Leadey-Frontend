"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpDown, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { LEAD_SORT_OPTIONS, type LeadSortKey } from "@/lib/utils/sort-leads";

interface LeadSortMenuProps {
  value: LeadSortKey;
  onChange: (key: LeadSortKey) => void;
}

export function LeadSortMenu({ value, onChange }: LeadSortMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const current = LEAD_SORT_OPTIONS.find((o) => o.value === value) ?? LEAD_SORT_OPTIONS[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 h-8 rounded-full bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors"
      >
        <ArrowUpDown size={12} strokeWidth={1.5} className="text-ink-muted" />
        <span className="text-ink-muted">Sort:</span>
        <span className="text-ink">{current.label}</span>
        <ChevronDown size={11} className="text-ink-faint" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-surface rounded-[12px] border border-border-default shadow-xl py-1.5">
          {LEAD_SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[12px] transition-colors hover:bg-hover",
                opt.value === value ? "text-ink font-medium" : "text-ink-secondary",
              )}
            >
              {opt.label}
              {opt.value === value && <Check size={13} className="text-signal-green-text shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
