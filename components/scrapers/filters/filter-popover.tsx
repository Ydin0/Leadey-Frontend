"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterPopoverProps {
  label: string;
  isActive: boolean;
  activeCount?: number;
  children: ReactNode;
}

export function FilterPopover({ label, isActive, activeCount, children }: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[12px] font-medium transition-colors border",
          isActive
            ? "bg-signal-blue/10 text-signal-blue-text border-signal-blue-text/20"
            : "bg-surface text-ink-secondary border-border-subtle hover:bg-hover"
        )}
      >
        {label}
        {activeCount !== undefined && activeCount > 0 && (
          <span className="bg-signal-blue-text text-surface text-[9px] font-semibold rounded-[4px] min-w-[16px] h-[16px] flex items-center justify-center px-1">
            {activeCount}
          </span>
        )}
        <ChevronDown size={12} className={cn("text-ink-faint transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 min-w-[240px] bg-surface rounded-[10px] border border-border-subtle shadow-lg z-20 p-3">
          {children}
        </div>
      )}
    </div>
  );
}
