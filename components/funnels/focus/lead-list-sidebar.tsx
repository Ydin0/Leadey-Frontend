"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompanyAvatar } from "./company-avatar";
import type { FunnelLead } from "@/lib/types/funnel";

interface LeadListSidebarProps {
  leads: FunnelLead[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  onClose: () => void;
  funnelName: string;
}

interface CompanyGroup {
  company: string;
  domain?: string;
  firstIndex: number;
  count: number;
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

  const currentCompany = currentIndex >= 0 && currentIndex < leads.length
    ? leads[currentIndex].company
    : null;

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

  // Group leads by company — just show companies, not individual contacts
  const companyGroups = useMemo(() => {
    const groups: CompanyGroup[] = [];
    const seen = new Map<string, number>();

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const key = lead.company || "Unknown";

      // Apply search
      if (search) {
        const q = search.toLowerCase();
        const matchesCompany = key.toLowerCase().includes(q);
        const matchesName = lead.name.toLowerCase().includes(q);
        if (!matchesCompany && !matchesName) continue;
      }

      if (seen.has(key)) {
        groups[seen.get(key)!].count++;
      } else {
        seen.set(key, groups.length);
        groups.push({
          company: key,
          domain: lead.companyDomain || lead.email?.split("@")[1],
          firstIndex: i,
          count: 1,
        });
      }
    }

    return groups;
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
          {funnelName} &middot; {companyGroups.length} companies
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

      {/* Company list — flat, no dropdowns */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {companyGroups.map((group) => {
          const isActive = currentCompany === group.company;
          return (
            <button
              key={group.company}
              ref={isActive ? activeRef : null}
              type="button"
              onClick={() => onSelectIndex(group.firstIndex)}
              className={cn(
                "w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors border-l-2",
                isActive
                  ? "bg-hover border-signal-blue-text"
                  : "border-transparent hover:bg-hover/50"
              )}
            >
              <CompanyAvatar name={group.company} size="sm" domain={group.domain} />
              <div className="flex-1 min-w-0">
                <span className={cn(
                  "text-[11px] truncate block",
                  isActive ? "font-medium text-ink" : "text-ink-secondary"
                )}>
                  {group.company}
                </span>
              </div>
              <span className="text-[9px] text-ink-faint shrink-0">{group.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
