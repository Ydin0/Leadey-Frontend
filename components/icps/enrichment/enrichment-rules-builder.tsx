"use client";

import { EnrichmentRuleCard } from "./enrichment-rule-card";
import { CreditUsageBar } from "@/components/icps/dashboard/credit-usage-bar";
import type { EnrichmentRuleSet } from "@/lib/types/icp";

interface EnrichmentRulesBuilderProps {
  rules: EnrichmentRuleSet;
  creditsUsed: number;
}

export function EnrichmentRulesBuilder({ rules, creditsUsed }: EnrichmentRulesBuilderProps) {
  const modeLabel = { auto: "Auto-enrich", preview: "Preview mode", manual: "Manual only" }[rules.defaultRule.mode];

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <CreditUsageBar used={creditsUsed} total={rules.globalBudget} label="Monthly Budget" />

      {/* Company Rules */}
      <div>
        <h3 className="text-[13px] font-semibold text-ink mb-3">Company Size Rules</h3>
        <div className="space-y-2">
          {rules.companyRules.map((rule) => (
            <EnrichmentRuleCard key={rule.id} rule={rule} />
          ))}
          {rules.companyRules.length === 0 && (
            <p className="text-[12px] text-ink-muted text-center py-4">No custom rules defined</p>
          )}
        </div>
      </div>

      {/* Default Rule */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-medium text-ink">Default Rule</span>
          <span className="text-[10px] text-ink-muted">Applied to unmatched companies</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-ink-faint">
          <span>{modeLabel}</span>
          <span>&middot;</span>
          <span>Max {rules.defaultRule.maxLeadsPerCompany} leads/company</span>
          <span>&middot;</span>
          <span>Priority: {rules.defaultRule.prioritySeniority.join(", ")}</span>
        </div>
      </div>

      {/* Safety Net */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <h4 className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">Safety Net</h4>
        <div className="space-y-1.5 text-[11px] text-ink-secondary">
          <p>Pause auto-enrichment at <span className="font-medium text-ink">{rules.safetyThreshold}%</span> budget usage</p>
          <p>Notify for companies with <span className="font-medium text-ink">{rules.notifyThreshold.toLocaleString()}+</span> employees</p>
        </div>
      </div>

      {/* Credit Breakdown */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <h4 className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">Credit Usage Breakdown</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-ink-secondary">Auto-enrichment</span>
            <span className="text-[11px] font-medium text-ink">{Math.round(creditsUsed * 0.7)} credits</span>
          </div>
          <div className="h-[3px] rounded bg-section">
            <div className="h-full rounded bg-signal-blue-text" style={{ width: "70%" }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-ink-secondary">Manual enrichment</span>
            <span className="text-[11px] font-medium text-ink">{Math.round(creditsUsed * 0.3)} credits</span>
          </div>
          <div className="h-[3px] rounded bg-section">
            <div className="h-full rounded bg-signal-slate-text" style={{ width: "30%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
