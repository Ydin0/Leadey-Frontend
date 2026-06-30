"use client";

import { useEffect, useRef, useState } from "react";
import { UserPlus, ChevronDown, User, FileSpreadsheet, Building2, Radio, Webhook } from "lucide-react";
import { cn } from "@/lib/utils";

export type AddLeadsSource = "csv" | "companies" | "signals" | "webhook";

const SOURCE_ITEMS: { source: AddLeadsSource; label: string; icon: typeof FileSpreadsheet }[] = [
  { source: "csv", label: "CSV Import", icon: FileSpreadsheet },
  { source: "companies", label: "From Companies", icon: Building2 },
  { source: "signals", label: "From Signals", icon: Radio },
  { source: "webhook", label: "Webhook", icon: Webhook },
];

interface AddLeadsButtonProps {
  onIndividual: () => void;
  onSource: (source: AddLeadsSource) => void;
}

/** Add Leads ▾ — Individual contact (quick create) plus every bulk import source. */
export function AddLeadsButton({ onIndividual, onSource }: AddLeadsButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function pick(fn: () => void) {
    setOpen(false);
    fn();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
      >
        <UserPlus size={12} strokeWidth={2} />
        Add Leads
        <ChevronDown size={12} strokeWidth={2} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-56 z-50 bg-surface rounded-[12px] border border-border-subtle shadow-xl py-1.5 origin-top-right">
          <button
            onClick={() => pick(onIndividual)}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-hover transition-colors"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-section shrink-0">
              <User size={13} strokeWidth={1.5} className="text-ink-secondary" />
            </span>
            <span className="min-w-0">
              <span className="block text-[12px] font-medium text-ink">Individual contact</span>
              <span className="block text-[10px] text-ink-muted">Quick-add one lead</span>
            </span>
          </button>

          <div className="my-1.5 mx-3 h-px bg-border-subtle" />

          {SOURCE_ITEMS.map((item) => (
            <button
              key={item.source}
              onClick={() => pick(() => onSource(item.source))}
              className="flex items-center gap-2.5 w-full px-3 py-1.5 text-left hover:bg-hover transition-colors"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-section shrink-0">
                <item.icon size={13} strokeWidth={1.5} className="text-ink-muted" />
              </span>
              <span className="text-[12px] text-ink-secondary">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
