"use client";

import { formatRelativeTime } from "@/lib/utils";
import { OrgChartPreview } from "@/components/icps/enrichment/org-chart-preview";
import { EnrichmentSelector } from "@/components/icps/enrichment/enrichment-selector";
import type { ICPCompany } from "@/lib/types/company";
import type { OrgChartPreview as OrgChartPreviewType } from "@/lib/types/company";
import type { EnrichedLead } from "@/lib/types/lead";

interface CompanyRowExpandedProps {
  company: ICPCompany;
  leads: EnrichedLead[];
  orgChart: OrgChartPreviewType | null;
  showSelector: boolean;
  onToggleSelector: () => void;
}

export function CompanyRowExpanded({ company, leads, orgChart, showSelector, onToggleSelector }: CompanyRowExpandedProps) {
  return (
    <div className="px-4 py-4 bg-section/30 border-t border-border-subtle">
      <div className="grid grid-cols-2 gap-4">
        {/* Signal Timeline */}
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">Recent Signals</h4>
          <div className="space-y-2">
            {company.signals.slice(0, 5).map((signal) => (
              <div key={signal.id} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-signal-blue-text mt-1.5 shrink-0" />
                <div>
                  <p className="text-[11px] text-ink-secondary">{signal.summary}</p>
                  <span className="text-[10px] text-ink-faint">{formatRelativeTime(signal.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enriched Leads */}
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">Enriched Leads ({leads.length})</h4>
          {leads.length > 0 ? (
            <div className="space-y-1.5">
              {leads.slice(0, 5).map((lead) => (
                <div key={lead.id} className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-[11px] font-medium text-ink">{lead.name}</span>
                    <span className="text-[10px] text-ink-muted ml-1.5">{lead.title}</span>
                  </div>
                  <span className="text-[10px] text-ink-faint">{lead.email || "No email"}</span>
                </div>
              ))}
              {leads.length > 5 && (
                <p className="text-[10px] text-ink-faint">+{leads.length - 5} more</p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-ink-muted">No leads enriched yet</p>
          )}
        </div>
      </div>

      {/* Org Chart / Enrichment */}
      {orgChart && (
        <div className="mt-4">
          {showSelector ? (
            <EnrichmentSelector
              departments={orgChart.departmentBreakdown}
              onEnrich={() => {}}
            />
          ) : (
            <OrgChartPreview
              chart={orgChart}
              onEnrichMatching={() => {}}
              onCustomize={onToggleSelector}
              onSkip={() => {}}
            />
          )}
        </div>
      )}

      {!orgChart && company.enrichmentStatus === "not_enriched" && (
        <div className="mt-4">
          <button className="px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors">
            Enrich Company
          </button>
        </div>
      )}
    </div>
  );
}
