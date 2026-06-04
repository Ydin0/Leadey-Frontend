"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Briefcase } from "lucide-react";

interface LeadHiringPanelProps {
  /** Roles the company is actively hiring for (job-scraper / CSV signal). */
  roles: string[];
}

export function LeadHiringPanel({ roles }: LeadHiringPanelProps) {
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
          Hiring For
        </span>
        {roles.length > 0 && (
          <span className="text-[10px] font-medium text-ink-muted ml-1">{roles.length}</span>
        )}
      </button>
      {expanded && (
        <div className="pl-1">
          {roles.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {roles.map((role, i) => (
                <span
                  key={`${role}-${i}`}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-signal-blue/10 text-signal-blue-text text-[10px] font-medium"
                >
                  <Briefcase size={9} strokeWidth={2} />
                  {role}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Briefcase size={14} strokeWidth={1.5} className="text-ink-faint shrink-0" />
              <span className="text-[11px] text-ink-faint">Not available</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
