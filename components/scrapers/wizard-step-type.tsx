"use client";

// This component is no longer used — the wizard auto-selects Job Board Monitor.
// Kept for potential future use when we add other scraper types back.

import { Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScraperDefinition } from "@/lib/types/scraper";
import { scraperCatalog } from "@/lib/mock-data/scrapers";

const iconMap: Record<string, typeof Briefcase> = { Briefcase };

interface WizardStepTypeProps {
  selectedId: string | null;
  onSelect: (scraper: ScraperDefinition) => void;
}

export function WizardStepType({ selectedId, onSelect }: WizardStepTypeProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {scraperCatalog.map((scraper) => {
        const Icon = iconMap[scraper.icon] || Briefcase;
        const isSelected = selectedId === scraper.id;

        return (
          <button
            key={scraper.id}
            type="button"
            onClick={() => onSelect(scraper)}
            className={cn(
              "text-left bg-surface rounded-[14px] border p-4 transition-all",
              isSelected
                ? "ring-2 ring-signal-blue-text border-signal-blue-text/30"
                : "border-border-subtle hover:border-border-default cursor-pointer"
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-section flex items-center justify-center">
                <Icon size={16} strokeWidth={1.5} className="text-ink-muted" />
              </div>
              <span className="text-[9px] font-medium rounded-full px-1.5 py-0.5 bg-signal-green text-signal-green-text">
                {scraper.tier}
              </span>
            </div>
            <h4 className="text-[12px] font-medium text-ink mb-1">{scraper.name}</h4>
            <p className="text-[10px] text-ink-muted leading-relaxed mb-3">{scraper.description}</p>
            <span className="text-[10px] text-ink-faint">{scraper.frequencyOptions.join(", ")}</span>
          </button>
        );
      })}
    </div>
  );
}
