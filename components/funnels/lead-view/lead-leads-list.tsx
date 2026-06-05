"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompanyAvatar } from "@/components/funnels/focus/company-avatar";
import { getStatusDotClass } from "@/lib/utils/lead-status";
import type { FunnelLead } from "@/lib/types/funnel";
import type { LeadStatusOption } from "@/lib/utils/lead-status";

interface LeadLeadsListProps {
  leads: FunnelLead[];
  funnelId: string;
  currentLeadId: string;
  statuses?: LeadStatusOption[];
}

/** The "Leads" tab in the Lead View Details column — every lead in the
 *  campaign, grouped by company, so a rep can jump between them quickly. */
export function LeadLeadsList({ leads, funnelId, currentLeadId, statuses }: LeadLeadsListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentLeadId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q) ||
        (l.title || "").toLowerCase().includes(q),
    );
  }, [leads, search]);

  // Group by company, preserving the incoming (sorted) order.
  const groups = useMemo(() => {
    const map = new Map<string, FunnelLead[]>();
    for (const l of filtered) {
      const key = l.company || "Unknown";
      const arr = map.get(key) || [];
      arr.push(l);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-1 pt-2 pb-2 shrink-0">
        <div className="relative">
          <Search size={12} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="w-full pl-7 pr-2 py-1.5 rounded-full bg-surface border border-border-default text-[11px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink-muted"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        {groups.map(([company, companyLeads]) => (
          <div key={company} className="mb-2">
            <div className="flex items-center gap-2 px-1 py-1.5">
              <CompanyAvatar name={company} size="sm" domain={companyLeads[0].companyDomain} />
              <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium truncate">
                {company}
              </span>
              <span className="text-[10px] text-ink-faint">{companyLeads.length}</span>
            </div>
            <div className="flex flex-col">
              {companyLeads.map((lead) => {
                const isActive = lead.id === currentLeadId;
                return (
                  <button
                    key={lead.id}
                    ref={isActive ? activeRef : null}
                    type="button"
                    onClick={() => router.push(`/dashboard/funnels/${funnelId}/leads/${lead.id}`)}
                    className={cn(
                      "w-full text-left pl-3 pr-2 py-1.5 flex items-center gap-2 rounded-lg transition-colors",
                      isActive ? "bg-hover" : "hover:bg-hover/50",
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusDotClass(lead.status, statuses))} />
                    <span className="flex-1 min-w-0">
                      <span
                        className={cn(
                          "block text-[12px] truncate",
                          isActive ? "font-medium text-ink" : "text-ink-secondary",
                          lead.doNotCall && "text-signal-red-text",
                        )}
                      >
                        {lead.name}
                      </span>
                      {lead.title && (
                        <span className="block text-[10px] text-ink-faint truncate">{lead.title}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
