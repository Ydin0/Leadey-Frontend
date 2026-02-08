"use client";

import { useState } from "react";
import { X, ArrowLeft, FileSpreadsheet, Radio, Webhook, Building2 } from "lucide-react";
import { CSVFlow } from "./csv-flow";
import { SignalsFlow } from "./signals-flow";
import { WebhookFlow } from "./webhook-flow";
import { CompaniesFlow } from "./companies-flow";

type SourceType = "csv" | "signals" | "webhook" | "companies" | null;

const sources = [
  { type: "csv" as const, label: "CSV Import", description: "Upload a CSV file with lead data", icon: FileSpreadsheet },
  { type: "signals" as const, label: "From Signals", description: "Add leads from detected buying signals", icon: Radio },
  { type: "webhook" as const, label: "Webhook", description: "Set up an inbound webhook integration", icon: Webhook },
  { type: "companies" as const, label: "From Companies", description: "Select companies and add their contacts", icon: Building2 },
];

interface AddLeadsModalProps {
  funnelId: string;
  onClose: () => void;
  onLeadsImported?: () => void;
}

export function AddLeadsModal({ funnelId, onClose, onLeadsImported }: AddLeadsModalProps) {
  const [activeSource, setActiveSource] = useState<SourceType>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface rounded-[14px] border border-border-subtle shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle sticky top-0 bg-surface rounded-t-[14px] z-10">
          <div className="flex items-center gap-2">
            {activeSource && (
              <button
                onClick={() => setActiveSource(null)}
                className="p-1 rounded-full hover:bg-hover transition-colors"
              >
                <ArrowLeft size={14} strokeWidth={1.5} className="text-ink-muted" />
              </button>
            )}
            <h2 className="text-[14px] font-semibold text-ink">Add Leads</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-hover transition-colors">
            <X size={16} strokeWidth={1.5} className="text-ink-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {!activeSource && (
            <div className="grid grid-cols-2 gap-3">
              {sources.map((src) => (
                <button
                  key={src.type}
                  onClick={() => setActiveSource(src.type)}
                  className="bg-surface rounded-[14px] border border-border-subtle p-4 text-left hover:border-border-default hover:bg-hover/50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-section flex items-center justify-center mb-3">
                    <src.icon size={18} strokeWidth={1.5} className="text-ink-muted group-hover:text-ink-secondary transition-colors" />
                  </div>
                  <h4 className="text-[12px] font-semibold text-ink mb-0.5">{src.label}</h4>
                  <p className="text-[10px] text-ink-muted">{src.description}</p>
                </button>
              ))}
            </div>
          )}

          {activeSource === "csv" && (
            <CSVFlow
              funnelId={funnelId}
              onDone={onClose}
              onImported={onLeadsImported}
            />
          )}
          {activeSource === "signals" && <SignalsFlow onDone={onClose} />}
          {activeSource === "webhook" && <WebhookFlow onDone={onClose} />}
          {activeSource === "companies" && <CompaniesFlow onDone={onClose} />}
        </div>
      </div>
    </div>
  );
}
