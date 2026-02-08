"use client";

import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { RangeSlider } from "@/components/shared/range-slider";
import type { ICP, EnrichmentCompanyRule, EnrichmentMode, SeniorityLevel } from "@/lib/types/icp";

const allSeniorities: SeniorityLevel[] = ["C-Level", "VP", "Director", "Manager", "Senior IC"];
const modeLabels: Record<EnrichmentMode, string> = { auto: "Auto-enrich", preview: "Preview mode", manual: "Manual only" };

interface StepEnrichmentRulesProps {
  data: Partial<ICP>;
  onChange: (data: Partial<ICP>) => void;
}

export function StepEnrichmentRules({ data, onChange }: StepEnrichmentRulesProps) {
  const rules = data.enrichmentRules || {
    globalBudget: 2000,
    companyRules: [],
    defaultRule: {
      mode: "auto" as EnrichmentMode,
      maxLeadsPerCompany: 10,
      onlyPersonas: true,
      prioritySeniority: ["VP", "Director"] as SeniorityLevel[],
    },
    safetyThreshold: 80,
    notifyThreshold: 1000,
  };

  function updateRules(partial: Partial<typeof rules>) {
    onChange({ ...data, enrichmentRules: { ...rules, ...partial } });
  }

  function addRule() {
    const newRule: EnrichmentCompanyRule = {
      id: `rule_${Date.now()}`,
      name: "",
      condition: "Companies > 500 employees",
      conditionMin: 500,
      action: {
        mode: "preview",
        maxLeadsPerCompany: 20,
        onlyPersonas: true,
        prioritySeniority: ["VP", "Director"],
      },
    };
    updateRules({ companyRules: [...rules.companyRules, newRule] });
  }

  function updateRule(index: number, updated: EnrichmentCompanyRule) {
    const next = [...rules.companyRules];
    next[index] = updated;
    updateRules({ companyRules: next });
  }

  function removeRule(index: number) {
    updateRules({ companyRules: rules.companyRules.filter((_, i) => i !== index) });
  }

  const estimatedEnrichments = Math.round(rules.globalBudget * 0.7);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold text-ink mb-1">How should we spend your credits?</h2>
        <p className="text-[12px] text-ink-muted">Set budget limits and enrichment rules for different company sizes</p>
      </div>

      {/* Monthly Budget */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <RangeSlider
          label="Monthly Budget"
          min={500}
          max={10000}
          step={100}
          value={rules.globalBudget}
          onChange={(globalBudget) => updateRules({ globalBudget })}
          formatValue={(v) => `${v.toLocaleString()} credits`}
        />
        <p className="text-[11px] text-ink-muted mt-2">~{estimatedEnrichments.toLocaleString()} enrichments per month at current rates</p>
      </div>

      {/* Company Rules */}
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">Company Size Rules</label>
        <div className="space-y-3">
          {rules.companyRules.map((rule, i) => (
            <div key={rule.id} className="bg-surface rounded-[14px] border border-border-subtle p-4">
              <div className="flex items-center justify-between mb-3">
                <input
                  type="text"
                  value={rule.name || rule.condition}
                  onChange={(e) => updateRule(i, { ...rule, name: e.target.value })}
                  className="text-[12px] font-medium text-ink bg-transparent outline-none flex-1"
                  placeholder="Rule name..."
                />
                <button onClick={() => removeRule(i)} className="p-1 rounded-full hover:bg-hover transition-colors">
                  <X size={14} strokeWidth={1.5} className="text-ink-muted" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[10px] text-ink-faint mb-1 block">Min employees</label>
                  <input
                    type="number"
                    value={rule.conditionMin}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateRule(i, { ...rule, conditionMin: val, condition: rule.conditionMax ? `Companies ${val}\u2013${rule.conditionMax} employees` : `Companies > ${val} employees` });
                    }}
                    className="w-full px-3 py-1.5 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-ink-faint mb-1 block">Max employees (optional)</label>
                  <input
                    type="number"
                    value={rule.conditionMax || ""}
                    onChange={(e) => {
                      const val = Number(e.target.value) || undefined;
                      updateRule(i, { ...rule, conditionMax: val, condition: val ? `Companies ${rule.conditionMin}\u2013${val} employees` : `Companies > ${rule.conditionMin} employees` });
                    }}
                    placeholder="No limit"
                    className="w-full px-3 py-1.5 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {(["auto", "preview", "manual"] as EnrichmentMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updateRule(i, { ...rule, action: { ...rule.action, mode } })}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border",
                      rule.action.mode === mode
                        ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                        : "bg-surface text-ink-muted border-border-subtle hover:bg-hover"
                    )}
                  >
                    {modeLabels[mode]}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-ink-faint mb-1 block">Max leads/company</label>
                  <input
                    type="number"
                    value={rule.action.maxLeadsPerCompany}
                    onChange={(e) => updateRule(i, { ...rule, action: { ...rule.action, maxLeadsPerCompany: Number(e.target.value) } })}
                    className="w-full px-3 py-1.5 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-ink-faint mb-1 block">Priority seniority</label>
                  <div className="flex flex-wrap gap-1">
                    {allSeniorities.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          const next = rule.action.prioritySeniority.includes(s)
                            ? rule.action.prioritySeniority.filter((x) => x !== s)
                            : [...rule.action.prioritySeniority, s];
                          updateRule(i, { ...rule, action: { ...rule.action, prioritySeniority: next } });
                        }}
                        className={cn(
                          "px-1.5 py-0.5 rounded-full text-[9px] font-medium transition-colors border",
                          rule.action.prioritySeniority.includes(s)
                            ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                            : "bg-surface text-ink-faint border-border-subtle"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addRule}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle mt-3"
        >
          <Plus size={14} strokeWidth={2} />
          Add Rule
        </button>
      </div>

      {/* Default Rule */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">Default Rule</label>
        <p className="text-[11px] text-ink-muted mb-3">Applied to companies that do not match any specific rule</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(["auto", "preview", "manual"] as EnrichmentMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => updateRules({ defaultRule: { ...rules.defaultRule, mode } })}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border",
                rules.defaultRule.mode === mode
                  ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                  : "bg-surface text-ink-muted border-border-subtle hover:bg-hover"
              )}
            >
              {modeLabels[mode]}
            </button>
          ))}
        </div>
        <div>
          <label className="text-[10px] text-ink-faint mb-1 block">Max leads per company</label>
          <input
            type="number"
            value={rules.defaultRule.maxLeadsPerCompany}
            onChange={(e) => updateRules({ defaultRule: { ...rules.defaultRule, maxLeadsPerCompany: Number(e.target.value) } })}
            className="w-24 px-3 py-1.5 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle"
          />
        </div>
      </div>

      {/* Safety Net */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-3">Safety Net</label>
        <RangeSlider
          label="Pause auto-enrichment at"
          min={50}
          max={100}
          step={5}
          value={rules.safetyThreshold}
          onChange={(safetyThreshold) => updateRules({ safetyThreshold })}
          formatValue={(v) => `${v}% budget usage`}
        />
        <div className="mt-4">
          <label className="text-[10px] text-ink-faint mb-1 block">Notify me for companies with more than</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={rules.notifyThreshold}
              onChange={(e) => updateRules({ notifyThreshold: Number(e.target.value) })}
              className="w-28 px-3 py-1.5 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle"
            />
            <span className="text-[11px] text-ink-muted">employees</span>
          </div>
        </div>
      </div>
    </div>
  );
}
