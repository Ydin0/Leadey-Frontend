"use client";

import { Upload } from "lucide-react";

export function CSVImportZone() {
  return (
    <div className="border-2 border-dashed border-border-default rounded-[14px] p-8 text-center hover:border-signal-blue-text/30 transition-colors cursor-pointer">
      <div className="w-10 h-10 rounded-full bg-section flex items-center justify-center mx-auto mb-3">
        <Upload size={18} strokeWidth={1.5} className="text-ink-muted" />
      </div>
      <p className="text-[13px] font-medium text-ink mb-1">Drop CSV here to start importing</p>
      <p className="text-[11px] text-ink-muted mb-3">
        Leads with emails go straight into funnel &middot; Missing emails get auto-enriched &middot; Duplicates auto-removed
      </p>
      <div className="flex items-center justify-center gap-1.5">
        {[".csv", ".xlsx", ".tsv"].map((fmt) => (
          <span key={fmt} className="px-2 py-0.5 rounded-full bg-section text-ink-muted text-[10px] font-medium">{fmt}</span>
        ))}
      </div>
    </div>
  );
}
