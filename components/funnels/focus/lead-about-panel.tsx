"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, MapPin, Globe, FileText, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FunnelLeadCompany } from "@/lib/types/funnel-focus";

interface LeadAboutPanelProps {
  company: FunnelLeadCompany;
}

export function LeadAboutPanel({ company }: LeadAboutPanelProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border-b border-border-subtle pb-4 mb-4">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 mb-3 group"
      >
        {expanded ? (
          <ChevronDown size={12} strokeWidth={2} className="text-ink-muted" />
        ) : (
          <ChevronRight size={12} strokeWidth={2} className="text-ink-muted" />
        )}
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
          About
        </span>
      </button>
      {expanded && (
        <div className="space-y-2.5 pl-1">
          {company.address ? (
            <div className="flex items-start gap-2">
              <MapPin size={14} strokeWidth={1.5} className="text-ink-faint mt-0.5 shrink-0" />
              <span className="text-[11px] text-ink">{company.address}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <MapPin size={14} strokeWidth={1.5} className="text-ink-faint shrink-0" />
              <span className="text-[11px] text-ink-faint">Add address...</span>
            </div>
          )}

          {company.website ? (
            <div className="flex items-center gap-2">
              <Globe size={14} strokeWidth={1.5} className="text-ink-faint shrink-0" />
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-signal-blue-text hover:underline"
              >
                {company.domain}
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Globe size={14} strokeWidth={1.5} className="text-ink-faint shrink-0" />
              <span className="text-[11px] text-ink-faint">Add website...</span>
            </div>
          )}

          {company.description ? (
            <div className="flex items-start gap-2">
              <FileText size={14} strokeWidth={1.5} className="text-ink-faint mt-0.5 shrink-0" />
              <span className="text-[11px] text-ink leading-relaxed">{company.description}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <FileText size={14} strokeWidth={1.5} className="text-ink-faint shrink-0" />
              <span className="text-[11px] text-ink-faint">Add description...</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Building2 size={14} strokeWidth={1.5} className="text-ink-faint shrink-0" />
            <span className="text-[11px] text-ink">
              {company.industry}
              {company.employeeCount > 0 && (
                <span className={cn("text-ink-muted")}> &middot; {company.employeeCount.toLocaleString()} employees</span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
