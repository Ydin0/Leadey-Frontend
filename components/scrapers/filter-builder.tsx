"use client";

import { useState } from "react";
import { Plus, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TagInput } from "@/components/shared/tag-input";
import { MultiSelectPills } from "@/components/shared/multi-select-pills";
import { RangeWithPresets } from "@/components/shared/range-slider";
import type { TheirStackFilters } from "@/lib/types/scraper";
import {
  SENIORITY_OPTIONS,
  EMPLOYMENT_OPTIONS,
  FUNDING_STAGE_OPTIONS,
  SOURCE_OPTIONS,
  INDUSTRY_OPTIONS,
  EMPLOYEE_PRESETS,
  SALARY_PRESETS,
  REVENUE_PRESETS,
  FUNDING_PRESETS,
  COUNTRY_PRESETS,
  POSTED_WITHIN_OPTIONS,
  formatOptionLabel,
} from "./filters/filter-types";

// ─── Filter Definitions ─────────────────────────────────────────────

type FilterType = "pills" | "radio" | "range" | "tags" | "toggle";

interface FilterDef {
  key: string;
  label: string;
  category: string;
  type: FilterType;
  options?: string[];
  presets?: Array<{ label: string; min: number; max: number }>;
  suggestions?: string[];
  minKey?: string;
  maxKey?: string;
  placeholder?: string;
}

const ADDITIONAL_FILTERS: FilterDef[] = [
  { key: "job_seniority_or", label: "Seniority", category: "Job", type: "pills", options: SENIORITY_OPTIONS },
  { key: "remote", label: "Remote", category: "Job", type: "radio", options: ["All", "Remote", "On-site"] },
  { key: "salary", label: "Salary Range", category: "Job", type: "range", minKey: "min_salary_usd", maxKey: "max_salary_usd", presets: SALARY_PRESETS },
  { key: "employment_statuses_or", label: "Employment Type", category: "Job", type: "pills", options: EMPLOYMENT_OPTIONS },
  { key: "employee_count", label: "Company Size", category: "Company", type: "range", minKey: "min_employee_count", maxKey: "max_employee_count", presets: EMPLOYEE_PRESETS },
  { key: "industry_or", label: "Industry", category: "Company", type: "tags", suggestions: INDUSTRY_OPTIONS, placeholder: "Search industries..." },
  { key: "revenue", label: "Company Revenue", category: "Company", type: "range", minKey: "min_revenue_usd", maxKey: "max_revenue_usd", presets: REVENUE_PRESETS },
  { key: "funding", label: "Company Funding", category: "Company", type: "range", minKey: "min_funding_usd", maxKey: "max_funding_usd", presets: FUNDING_PRESETS },
  { key: "funding_stage_or", label: "Funding Stage", category: "Company", type: "pills", options: FUNDING_STAGE_OPTIONS },
  { key: "job_technology_slug_or", label: "Tech Stack", category: "Job", type: "tags", placeholder: "e.g. react, python, aws..." },
  { key: "company_country_code_or", label: "Company HQ Country", category: "Company", type: "tags", placeholder: "e.g. US, GB, DE..." },
  { key: "job_description_pattern_or", label: "Description Keywords", category: "Job", type: "tags", placeholder: "e.g. quota, outbound..." },
  { key: "url_domain_or", label: "Job Source", category: "Source", type: "pills", options: SOURCE_OPTIONS },
  { key: "company_name_or", label: "Company Name", category: "Company", type: "tags", placeholder: "e.g. Stripe, HubSpot..." },
  { key: "company_domain_or", label: "Company Domain", category: "Company", type: "tags", placeholder: "e.g. stripe.com..." },
  { key: "investors_or", label: "Investors", category: "Company", type: "tags", placeholder: "e.g. Sequoia, a16z..." },
  { key: "only_yc_companies", label: "Y Combinator", category: "Company", type: "toggle" },
  { key: "company_type", label: "Company Type", category: "Company", type: "radio", options: ["All", "Direct Employer", "Agency"] },
];

// ─── Country Selector ───────────────────────────────────────────────

// ─── Helper to get/set filter values ────────────────────────────────

function getFilterArrayValue(filters: TheirStackFilters, key: string): string[] {
  return (filters as any)[key] || [];
}

function getFilterNumberValue(filters: TheirStackFilters, key: string): number {
  return (filters as any)[key] || 0;
}

// ─── Filter Section Renderer ────────────────────────────────────────

function FilterSection({
  def,
  filters,
  onChange,
  onRemove,
}: {
  def: FilterDef;
  filters: TheirStackFilters;
  onChange: (patch: Partial<TheirStackFilters>) => void;
  onRemove: () => void;
}) {
  const renderInput = () => {
    switch (def.type) {
      case "pills": {
        const selected = getFilterArrayValue(filters, def.key);
        return (
          <div className="flex flex-wrap gap-1.5">
            {(def.options || []).map((opt) => {
              const isSelected = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    const next = isSelected ? selected.filter((s) => s !== opt) : [...selected, opt];
                    onChange({ [def.key]: next } as any);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors border",
                    isSelected
                      ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                      : "bg-surface text-ink-secondary border-border-subtle hover:bg-hover"
                  )}
                >
                  {formatOptionLabel(opt)}
                </button>
              );
            })}
          </div>
        );
      }

      case "radio": {
        const options = def.options || [];
        let currentValue: string;
        if (def.key === "remote") {
          currentValue = filters.remote === true ? "Remote" : filters.remote === false ? "On-site" : "All";
        } else if (def.key === "company_type") {
          currentValue = filters.company_type === "direct_employer" ? "Direct Employer"
            : filters.company_type === "recruiting_agency" ? "Agency" : "All";
        } else {
          currentValue = "All";
        }

        return (
          <div className="flex gap-1.5">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  if (def.key === "remote") {
                    onChange({ remote: opt === "Remote" ? true : opt === "On-site" ? false : undefined } as any);
                  } else if (def.key === "company_type") {
                    const val = opt === "Direct Employer" ? "direct_employer"
                      : opt === "Agency" ? "recruiting_agency" : undefined;
                    onChange({ company_type: val } as any);
                  }
                }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors border",
                  currentValue === opt
                    ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                    : "bg-surface text-ink-secondary border-border-subtle hover:bg-hover"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        );
      }

      case "range": {
        const minKey = def.minKey || "";
        const maxKey = def.maxKey || "";
        return (
          <RangeWithPresets
            presets={def.presets || []}
            selectedMin={getFilterNumberValue(filters, minKey)}
            selectedMax={getFilterNumberValue(filters, maxKey)}
            onChangeMin={(v) => onChange({ [minKey]: v || undefined } as any)}
            onChangeMax={(v) => onChange({ [maxKey]: v || undefined } as any)}
          />
        );
      }

      case "tags": {
        const tags = getFilterArrayValue(filters, def.key);
        return (
          <TagInput
            tags={tags}
            onChange={(next) => onChange({ [def.key]: next } as any)}
            placeholder={def.placeholder}
            suggestions={def.suggestions}
          />
        );
      }

      case "toggle": {
        const value = !!(filters as any)[def.key];
        return (
          <button
            type="button"
            onClick={() => onChange({ [def.key]: !value } as any)}
            className={cn(
              "relative w-10 h-5 rounded-full transition-colors",
              value ? "bg-signal-blue-text" : "bg-section border border-border-subtle"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 w-4 h-4 rounded-full bg-surface shadow transition-transform",
                value ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
        );
      }
    }
  };

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">{def.label}</span>
        <button
          type="button"
          onClick={onRemove}
          className="p-0.5 rounded hover:bg-hover/50 text-ink-faint hover:text-ink-muted transition-colors"
        >
          <X size={12} />
        </button>
      </div>
      {renderInput()}
    </div>
  );
}

// ─── Main Filter Builder ────────────────────────────────────────────

interface FilterBuilderProps {
  filters: TheirStackFilters;
  onChange: (filters: TheirStackFilters) => void;
}

export function FilterBuilder({ filters, onChange }: FilterBuilderProps) {
  const [activeFilterKeys, setActiveFilterKeys] = useState<string[]>(() => {
    // Initialize with filters that already have values
    const active: string[] = [];
    for (const def of ADDITIONAL_FILTERS) {
      if (def.type === "range") {
        if (getFilterNumberValue(filters, def.minKey || "") || getFilterNumberValue(filters, def.maxKey || "")) {
          active.push(def.key);
        }
      } else if (def.type === "toggle") {
        if ((filters as any)[def.key]) active.push(def.key);
      } else if (def.type === "radio") {
        if (def.key === "remote" && filters.remote !== undefined && filters.remote !== null) active.push(def.key);
        else if (def.key === "company_type" && filters.company_type) active.push(def.key);
      } else {
        if (getFilterArrayValue(filters, def.key).length > 0) active.push(def.key);
      }
    }
    return active;
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleFilterChange = (patch: Partial<TheirStackFilters>) => {
    onChange({ ...filters, ...patch });
  };

  const addFilter = (key: string) => {
    if (!activeFilterKeys.includes(key)) {
      setActiveFilterKeys([...activeFilterKeys, key]);
    }
    setDropdownOpen(false);
  };

  const removeFilter = (key: string) => {
    setActiveFilterKeys(activeFilterKeys.filter((k) => k !== key));
    // Clear the filter values
    const def = ADDITIONAL_FILTERS.find((f) => f.key === key);
    if (!def) return;
    const patch: any = {};
    if (def.type === "range") {
      if (def.minKey) patch[def.minKey] = undefined;
      if (def.maxKey) patch[def.maxKey] = undefined;
    } else if (def.type === "toggle") {
      patch[key] = undefined;
    } else if (def.type === "radio") {
      patch[key] = undefined;
    } else {
      patch[key] = undefined;
    }
    onChange({ ...filters, ...patch });
  };

  const availableFilters = ADDITIONAL_FILTERS.filter((f) => !activeFilterKeys.includes(f.key));
  const groupedAvailable = availableFilters.reduce<Record<string, FilterDef[]>>((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Essential Filters — always visible */}
      <div className="space-y-4">
        {/* Search Name */}

        {/* Job Titles (pattern match — "contains any of") */}
        <TagInput
          label="Job Titles"
          tags={filters.job_title_pattern_or || filters.job_title_or || []}
          onChange={(tags) => handleFilterChange({ job_title_pattern_or: tags, job_title_or: undefined })}
          placeholder="e.g. SDR, Account Executive, Sales Engineer..."
          suggestions={["SDR", "BDR", "Account Executive", "Account Manager", "Sales Engineer", "Sales Manager", "VP Sales", "Customer Success", "Revenue Operations"]}
        />

        {/* Excluded Titles (pattern match) */}
        <TagInput
          label="Excluded Titles"
          tags={filters.job_title_pattern_not || filters.job_title_not || []}
          onChange={(tags) => handleFilterChange({ job_title_pattern_not: tags, job_title_not: undefined })}
          placeholder="e.g. intern, contract..."
          suggestions={["intern", "internship", "contract", "part-time", "temporary", "freelance", "volunteer"]}
        />

        {/* Countries */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">Countries</label>
          <div className="flex flex-wrap gap-1.5">
            {COUNTRY_PRESETS.map(({ code, flag }) => {
              const selected = (filters.job_country_code_or || []).includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    const current = filters.job_country_code_or || [];
                    const next = selected ? current.filter((c) => c !== code) : [...current, code];
                    handleFilterChange({ job_country_code_or: next });
                  }}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-colors border",
                    selected
                      ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                      : "bg-surface text-ink-secondary border-border-subtle hover:bg-hover"
                  )}
                >
                  <span>{flag}</span> {code}
                </button>
              );
            })}
          </div>
        </div>

        {/* Posted Within */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">Posted Within</label>
          <div className="flex flex-wrap gap-1.5">
            {POSTED_WITHIN_OPTIONS.map(({ label, value }) => {
              const selected = filters.posted_at_max_age_days === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleFilterChange({ posted_at_max_age_days: value })}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors border",
                    selected
                      ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                      : "bg-surface text-ink-secondary border-border-subtle hover:bg-hover"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active additional filters */}
      {activeFilterKeys.map((key) => {
        const def = ADDITIONAL_FILTERS.find((f) => f.key === key);
        if (!def) return null;
        return (
          <FilterSection
            key={key}
            def={def}
            filters={filters}
            onChange={handleFilterChange}
            onRemove={() => removeFilter(key)}
          />
        );
      })}

      {/* Add Filter button */}
      {availableFilters.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] border border-dashed border-border-default text-[11px] font-medium text-ink-muted hover:bg-hover/30 hover:text-ink-secondary transition-colors"
          >
            <Plus size={12} /> Add Filter
            <ChevronDown size={10} className={cn("transition-transform", dropdownOpen && "rotate-180")} />
          </button>
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-surface rounded-[10px] border border-border-subtle shadow-lg z-20 py-1 max-h-72 overflow-y-auto">
              {Object.entries(groupedAvailable).map(([group, defs]) => (
                <div key={group}>
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-ink-faint font-medium">{group}</div>
                  {defs.map((def) => (
                    <button
                      key={def.key}
                      type="button"
                      onClick={() => addFilter(def.key)}
                      className="w-full text-left px-3 py-1.5 text-[12px] text-ink hover:bg-hover transition-colors"
                    >
                      {def.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
