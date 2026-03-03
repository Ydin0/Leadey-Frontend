"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadFocusNavigationProps {
  currentIndex: number;
  totalLeads: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function LeadFocusNavigation({
  currentIndex,
  totalLeads,
  onPrevious,
  onNext,
}: LeadFocusNavigationProps) {
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalLeads - 1;

  return (
    <div className="fixed bottom-6 right-6 flex items-center gap-3 z-50">
      <span className="text-[11px] text-ink-muted">
        {currentIndex + 1} of {totalLeads}
      </span>
      <button
        onClick={onPrevious}
        disabled={isFirst}
        className={cn(
          "w-10 h-10 rounded-full bg-surface border border-border-subtle shadow-lg flex items-center justify-center transition-colors",
          isFirst ? "opacity-40 pointer-events-none" : "hover:bg-hover"
        )}
      >
        <ChevronLeft size={18} strokeWidth={1.5} className="text-ink" />
      </button>
      <button
        onClick={onNext}
        disabled={isLast}
        className={cn(
          "w-10 h-10 rounded-full bg-ink text-on-ink shadow-lg flex items-center justify-center transition-colors",
          isLast ? "opacity-40 pointer-events-none" : "hover:bg-ink/90"
        )}
      >
        <ChevronRight size={18} strokeWidth={1.5} />
      </button>
    </div>
  );
}
