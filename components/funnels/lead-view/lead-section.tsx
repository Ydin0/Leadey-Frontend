"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionProps {
  icon: LucideIcon;
  title: string;
  count?: number | null;
  actions?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** Close-style stacked, collapsible detail panel used in the Lead View's
 *  Details column (About / Tasks / Opportunities / Contacts / Custom fields). */
export function Section({ icon: Icon, title, count, actions, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border-subtle">
      <div
        className="flex items-center gap-2 py-2.5 px-1 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDown
          size={13}
          className={cn("text-ink-muted transition-transform", !open && "-rotate-90")}
        />
        <Icon size={13} className="text-ink-secondary" />
        <span className="text-[10px] uppercase tracking-wider text-ink-secondary font-medium">
          {title}
        </span>
        {count != null && <span className="text-[11px] text-ink-muted">{count}</span>}
        <div className="flex-1" />
        {actions && (
          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>
      {open && <div className="pb-3.5">{children}</div>}
    </div>
  );
}

export function MiniBtn({ icon: Icon, onClick, title }: { icon: LucideIcon; onClick?: () => void; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="flex items-center justify-center w-[22px] h-[22px] rounded-md text-ink-secondary hover:bg-hover hover:text-ink transition-colors"
    >
      <Icon size={13} />
    </button>
  );
}
