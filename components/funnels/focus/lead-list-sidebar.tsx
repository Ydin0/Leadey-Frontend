"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusDot } from "@/lib/utils/lead-status";
import { CompanyAvatar } from "./company-avatar";
import type { FunnelLead } from "@/lib/types/funnel";

interface LeadListSidebarProps {
  leads: FunnelLead[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  onClose: () => void;
  funnelName: string;
}

export function LeadListSidebar({
  leads,
  currentIndex,
  onSelectIndex,
  onClose,
  funnelName,
}: LeadListSidebarProps) {
  const [search, setSearch] = useState("");
  const activeRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active item
  useEffect(() => {
    if (activeRef.current && listRef.current) {
      const container = listRef.current;
      const el = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

      if (elRect.top < containerRect.top || elRect.bottom > containerRect.bottom) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  }, [currentIndex]);

  const filteredWithIndex = useMemo(() => {
    if (!search) return leads.map((lead, i) => ({ lead, originalIndex: i }));
    const q = search.toLowerCase();
    return leads
      .map((lead, i) => ({ lead, originalIndex: i }))
      .filter(
        ({ lead }) =>
          lead.company.toLowerCase().includes(q) ||
          lead.name.toLowerCase().includes(q)
      );
  }, [leads, search]);

  return (
    <div className="w-56 border-r border-border-subtle bg-surface flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink transition-colors mb-2"
        >
          <ArrowLeft size={13} strokeWidth={1.5} />
          Back to list
        </button>
        <div className="text-[10px] text-ink-faint">
          {funnelName} &middot; {leads.length} leads
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search size={12} strokeWidth={1.5} className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-7 pr-2 py-1 rounded-full bg-section border border-border-subtle text-[10px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
          />
        </div>
      </div>

      {/* Lead list */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {filteredWithIndex.map(({ lead, originalIndex }) => {
          const isActive = originalIndex === currentIndex;
          return (
            <button
              key={lead.id}
              ref={isActive ? activeRef : null}
              onClick={() => onSelectIndex(originalIndex)}
              className={cn(
                "w-full text-left px-3 py-2 flex items-center gap-2 transition-colors border-l-2",
                isActive
                  ? "bg-hover border-signal-blue-text"
                  : "border-transparent hover:bg-hover"
              )}
            >
              <CompanyAvatar name={lead.company} size="sm" domain={lead.companyDomain || lead.email?.split("@")[1]} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "text-[11px] truncate",
                    isActive ? "font-medium text-ink" : "text-ink-secondary"
                  )}>
                    {lead.company}
                  </span>
                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDot[lead.status])} />
                </div>
                <div className="text-[10px] text-ink-muted truncate">{lead.name}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
