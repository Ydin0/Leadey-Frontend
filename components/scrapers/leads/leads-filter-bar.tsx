"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LeadsFilters {
  enrichmentStatus: string | null;
  contactStatus: string | null;
}

const ENRICHMENT_OPTIONS = [
  { value: "none", label: "Not Enriched" },
  { value: "pending", label: "Pending" },
  { value: "enriched", label: "Enriched" },
  { value: "failed", label: "Failed" },
];

const STATUS_OPTIONS = [
  { value: "discovered", label: "Discovered" },
  { value: "in_funnel", label: "In Funnel" },
  { value: "dismissed", label: "Dismissed" },
];

interface LeadsFilterBarProps {
  filters: LeadsFilters;
  onChange: (filters: LeadsFilters) => void;
}

export function LeadsFilterBar({ filters, onChange }: LeadsFilterBarProps) {
  const hasFilters = filters.enrichmentStatus || filters.contactStatus;

  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mr-1">
        Filter
      </span>

      {/* Enrichment status pills */}
      <div className="flex items-center gap-1">
        {ENRICHMENT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() =>
              onChange({
                ...filters,
                enrichmentStatus: filters.enrichmentStatus === opt.value ? null : opt.value,
              })
            }
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border",
              filters.enrichmentStatus === opt.value
                ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                : "bg-surface text-ink-muted border-border-subtle hover:bg-hover"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-border-subtle" />

      {/* Contact status pills */}
      <div className="flex items-center gap-1">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() =>
              onChange({
                ...filters,
                contactStatus: filters.contactStatus === opt.value ? null : opt.value,
              })
            }
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border",
              filters.contactStatus === opt.value
                ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                : "bg-surface text-ink-muted border-border-subtle hover:bg-hover"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {hasFilters && (
        <button
          onClick={() => onChange({ enrichmentStatus: null, contactStatus: null })}
          className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium text-ink-muted hover:text-ink transition-colors ml-1"
        >
          <X size={10} />
          Clear
        </button>
      )}
    </div>
  );
}
