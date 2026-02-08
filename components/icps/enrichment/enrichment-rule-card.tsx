import { cn } from "@/lib/utils";
import type { EnrichmentCompanyRule, EnrichmentMode } from "@/lib/types/icp";

const modeLabels: Record<EnrichmentMode, { label: string; bg: string; text: string }> = {
  auto: { label: "Auto-enrich", bg: "bg-signal-green", text: "text-signal-green-text" },
  preview: { label: "Preview mode", bg: "bg-signal-blue", text: "text-signal-blue-text" },
  manual: { label: "Manual only", bg: "bg-signal-slate", text: "text-signal-slate-text" },
};

export function EnrichmentRuleCard({ rule }: { rule: EnrichmentCompanyRule }) {
  const modeStyle = modeLabels[rule.action.mode];

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-medium text-ink">{rule.name || rule.condition}</span>
        <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", modeStyle.bg, modeStyle.text)}>
          {modeStyle.label}
        </span>
      </div>
      <p className="text-[11px] text-ink-muted mb-2">{rule.condition}</p>
      <div className="flex items-center gap-3 text-[10px] text-ink-faint">
        <span>Max {rule.action.maxLeadsPerCompany} leads/company</span>
        <span>&middot;</span>
        <span>{rule.action.onlyPersonas ? "Persona matches only" : "All contacts"}</span>
        <span>&middot;</span>
        <span>Priority: {rule.action.prioritySeniority.join(", ")}</span>
      </div>
    </div>
  );
}
