"use client";

import { FileSpreadsheet, Radio, Webhook, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SourceType = "csv" | "signals" | "webhook" | "companies";

const sourceOptions: { type: SourceType; label: string; description: string; icon: typeof FileSpreadsheet }[] = [
  { type: "csv", label: "CSV Import", description: "Upload a CSV file with lead data", icon: FileSpreadsheet },
  { type: "signals", label: "Buying Signals", description: "Auto-add leads from detected signals", icon: Radio },
  { type: "webhook", label: "Webhook", description: "Receive leads from external tools via webhook", icon: Webhook },
  { type: "companies", label: "Company Contacts", description: "Pull contacts from tracked companies", icon: Building2 },
];

interface FunnelSourcesStepProps {
  selectedSources: SourceType[];
  onChange: (sources: SourceType[]) => void;
}

export function FunnelSourcesStep({ selectedSources, onChange }: FunnelSourcesStepProps) {
  function toggleSource(type: SourceType) {
    if (selectedSources.includes(type)) {
      onChange(selectedSources.filter((s) => s !== type));
    } else {
      onChange([...selectedSources, type]);
    }
  }

  return (
    <div>
      <h2 className="text-[16px] font-semibold text-ink mb-1">Lead Sources</h2>
      <p className="text-[12px] text-ink-muted mb-6">Choose how leads will enter this funnel. You can configure details after creation.</p>

      <div className="grid grid-cols-2 gap-3">
        {sourceOptions.map((src) => {
          const selected = selectedSources.includes(src.type);
          return (
            <button
              key={src.type}
              onClick={() => toggleSource(src.type)}
              className={cn(
                "rounded-[14px] border p-4 text-left transition-colors",
                selected
                  ? "border-signal-blue-text bg-signal-blue/10"
                  : "border-border-subtle bg-surface hover:border-border-default hover:bg-hover/50"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center mb-3",
                selected ? "bg-signal-blue/20" : "bg-section"
              )}>
                <src.icon size={18} strokeWidth={1.5} className={selected ? "text-signal-blue-text" : "text-ink-muted"} />
              </div>
              <h4 className="text-[12px] font-semibold text-ink mb-0.5">{src.label}</h4>
              <p className="text-[10px] text-ink-muted">{src.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
