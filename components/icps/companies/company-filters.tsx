"use client";

import { cn } from "@/lib/utils";
import type { SignalType } from "@/lib/types/icp";
import type { EnrichmentStatus } from "@/lib/types/company";

const signalChips: { type: SignalType; label: string }[] = [
  { type: "hiring", label: "Hiring" },
  { type: "funding", label: "Funding" },
  { type: "tech_adoption", label: "Tech" },
  { type: "intent", label: "Intent" },
  { type: "job_change", label: "Job Change" },
  { type: "expansion", label: "Expansion" },
  { type: "news", label: "News" },
  { type: "social", label: "Social" },
];

const enrichmentOptions: { value: EnrichmentStatus; label: string }[] = [
  { value: "not_enriched", label: "Not enriched" },
  { value: "partial", label: "Partial" },
  { value: "full", label: "Full" },
  { value: "pending_review", label: "Pending review" },
];

interface CompanyFiltersProps {
  activeSignals: SignalType[];
  onToggleSignal: (type: SignalType) => void;
  enrichmentFilter: EnrichmentStatus | null;
  onSetEnrichment: (status: EnrichmentStatus | null) => void;
}

export function CompanyFilters({ activeSignals, onToggleSignal, enrichmentFilter, onSetEnrichment }: CompanyFiltersProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Signal Type Chips */}
      <div className="flex items-center gap-1.5">
        {signalChips.map((chip) => (
          <button
            key={chip.type}
            onClick={() => onToggleSignal(chip.type)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border",
              activeSignals.includes(chip.type)
                ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                : "bg-surface text-ink-muted border-border-subtle hover:bg-hover"
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <span className="w-px h-4 bg-border-subtle" />

      {/* Enrichment Status */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onSetEnrichment(null)}
          className={cn(
            "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border",
            enrichmentFilter === null
              ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
              : "bg-surface text-ink-muted border-border-subtle hover:bg-hover"
          )}
        >
          All
        </button>
        {enrichmentOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSetEnrichment(enrichmentFilter === opt.value ? null : opt.value)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border",
              enrichmentFilter === opt.value
                ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                : "bg-surface text-ink-muted border-border-subtle hover:bg-hover"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
