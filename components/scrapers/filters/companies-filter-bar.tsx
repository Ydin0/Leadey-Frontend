"use client";

import { useState } from "react";
import { Plus, X, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterPopover } from "./filter-popover";
import type { CompaniesFilterState } from "./filter-types";
import {
  FUNDING_STAGE_OPTIONS,
  EMPLOYEE_PRESETS,
  INDUSTRY_OPTIONS,
  COUNTRY_PRESETS,
  formatOptionLabel,
} from "./filter-types";
import { getCompaniesFilterPills, clearCompaniesFilterKey } from "./filter-utils";

interface CompaniesFilterBarProps {
  filters: CompaniesFilterState;
  setFilters: (f: CompaniesFilterState) => void;
  updateFilter: <K extends keyof CompaniesFilterState>(key: K, value: CompaniesFilterState[K]) => void;
  clearAll: () => void;
  isEmpty: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
}

type AdditionalFilterKey = "industry" | "country" | "minJobCount";

const ADDITIONAL_FILTER_DEFS: { key: AdditionalFilterKey; label: string }[] = [
  { key: "industry", label: "Industry" },
  { key: "country", label: "Country" },
  { key: "minJobCount", label: "Min Jobs" },
];

function toggleInArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function CompaniesFilterBar({ filters, setFilters, updateFilter, clearAll, isEmpty, search = "", onSearchChange }: CompaniesFilterBarProps) {
  const [activeAdditional, setActiveAdditional] = useState<AdditionalFilterKey[]>([]);
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);

  const pills = getCompaniesFilterPills(filters);

  const addFilter = (key: AdditionalFilterKey) => {
    if (!activeAdditional.includes(key)) {
      setActiveAdditional([...activeAdditional, key]);
    }
    setAddDropdownOpen(false);
  };

  const removeAdditional = (key: AdditionalFilterKey) => {
    setActiveAdditional(activeAdditional.filter((k) => k !== key));
    setFilters(clearCompaniesFilterKey(filters, key));
  };

  const removePill = (key: string) => {
    setFilters(clearCompaniesFilterKey(filters, key));
    setActiveAdditional(activeAdditional.filter((k) => k !== key));
  };

  const availableAdditional = ADDITIONAL_FILTER_DEFS.filter((d) => !activeAdditional.includes(d.key));

  return (
    <div className="mb-4 space-y-2">
      {/* Quick filters row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Funding Stage */}
        <FilterPopover
          label="Funding Stage"
          isActive={filters.fundingStage.length > 0}
          activeCount={filters.fundingStage.length}
        >
          <div className="flex flex-wrap gap-1.5">
            {FUNDING_STAGE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => updateFilter("fundingStage", toggleInArray(filters.fundingStage, opt))}
                className={cn(
                  "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                  filters.fundingStage.includes(opt)
                    ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                    : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                )}
              >
                {formatOptionLabel(opt)}
              </button>
            ))}
          </div>
        </FilterPopover>

        {/* Employee Count — multi-select presets */}
        <FilterPopover
          label="Employees"
          isActive={filters.employeeSizeRanges.length > 0}
          activeCount={filters.employeeSizeRanges.length}
        >
          <div className="flex flex-wrap gap-1.5">
            {EMPLOYEE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => updateFilter("employeeSizeRanges", toggleInArray(filters.employeeSizeRanges, preset.label))}
                className={cn(
                  "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                  filters.employeeSizeRanges.includes(preset.label)
                    ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                    : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </FilterPopover>

        {/* Active additional filter popovers */}
        {activeAdditional.map((key) => {
          const def = ADDITIONAL_FILTER_DEFS.find((d) => d.key === key)!;
          const isActive = (() => {
            switch (key) {
              case "industry": return filters.industry.length > 0;
              case "country": return filters.country.length > 0;
              case "minJobCount": return filters.minJobCount !== null;
              default: return false;
            }
          })();
          const activeCount = key === "industry" ? filters.industry.length
            : key === "country" ? filters.country.length
            : undefined;

          return (
            <FilterPopover key={key} label={def.label} isActive={isActive} activeCount={activeCount}>
              <div className="space-y-2">
                {key === "industry" && (
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                    {INDUSTRY_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateFilter("industry", toggleInArray(filters.industry, opt))}
                        className={cn(
                          "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                          filters.industry.includes(opt)
                            ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                            : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {key === "country" && (
                  <div className="flex flex-wrap gap-1.5">
                    {COUNTRY_PRESETS.map(({ code, flag }) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => updateFilter("country", toggleInArray(filters.country, code))}
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                          filters.country.includes(code)
                            ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                            : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                        )}
                      >
                        <span>{flag}</span> {code}
                      </button>
                    ))}
                  </div>
                )}

                {key === "minJobCount" && (
                  <div>
                    <label className="text-[10px] text-ink-faint mb-1 block">Minimum Jobs</label>
                    <input
                      type="number"
                      value={filters.minJobCount ?? ""}
                      onChange={(e) => updateFilter("minJobCount", e.target.value ? Number(e.target.value) : null)}
                      placeholder="e.g. 2"
                      min={1}
                      className="w-full px-3 py-1.5 rounded-[8px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
                    />
                  </div>
                )}

                <div className="pt-1.5 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => removeAdditional(key)}
                    className="text-[11px] text-ink-muted hover:text-signal-red-text transition-colors"
                  >
                    Remove filter
                  </button>
                </div>
              </div>
            </FilterPopover>
          );
        })}

        {/* + Add Filter */}
        {availableAdditional.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setAddDropdownOpen(!addDropdownOpen)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[12px] font-medium text-ink-muted border border-dashed border-border-default hover:bg-hover/30 hover:text-ink-secondary transition-colors"
            >
              <Plus size={12} />
              Filter
              <ChevronDown size={10} className={cn("transition-transform", addDropdownOpen && "rotate-180")} />
            </button>
            {addDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-surface rounded-[10px] border border-border-subtle shadow-lg z-20 py-1">
                {availableAdditional.map((def) => (
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
            )}
          </div>
        )}

        {/* Search */}
        {onSearchChange && (
          <div className="relative ml-auto">
            <Search size={13} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search companies..."
              className="pl-8 pr-3 py-1.5 rounded-full bg-section border border-border-subtle text-[11px] text-ink placeholder:text-ink-faint w-48 focus:outline-none focus:border-border-default"
            />
          </div>
        )}
      </div>

      {/* Active filter pills */}
      {pills.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {pills.map((pill) => (
            <span
              key={pill.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[11px] font-medium bg-signal-blue/10 text-signal-blue-text"
            >
              {pill.label}
              <button
                type="button"
                onClick={() => removePill(pill.key)}
                className="p-0.5 rounded hover:bg-signal-blue/20 transition-colors"
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => {
              clearAll();
              setActiveAdditional([]);
            }}
            className="text-[11px] font-medium text-ink-muted hover:text-ink-secondary transition-colors ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
