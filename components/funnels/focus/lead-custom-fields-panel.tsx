"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { FunnelLeadCustomField } from "@/lib/types/funnel-focus";

interface LeadCustomFieldsPanelProps {
  fields: FunnelLeadCustomField[];
}

export function LeadCustomFieldsPanel({ fields }: LeadCustomFieldsPanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (fields.length === 0) return null;

  return (
    <div className="pb-4 mb-4">
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
          Custom Fields
        </span>
        <span className="text-[10px] font-medium text-ink-muted ml-1">{fields.length}</span>
      </button>
      {expanded && (
        <div className="space-y-2 pl-1">
          {fields.map((field) => (
            <div key={field.label} className="flex items-baseline gap-3">
              <span className="text-[11px] text-ink-muted w-32 shrink-0 truncate">
                {field.label}
              </span>
              {field.isLink ? (
                <a
                  href={field.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-signal-blue-text hover:underline truncate"
                >
                  {field.value}
                </a>
              ) : (
                <span className="text-[11px] text-ink">{field.value}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
