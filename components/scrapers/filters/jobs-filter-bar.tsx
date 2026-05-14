"use client";

import { useState } from "react";
import { Plus, X, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterPopover } from "./filter-popover";
import { TagInput } from "@/components/shared/tag-input";
import type { JobsFilterState } from "./filter-types";
import {
  SENIORITY_OPTIONS,
  EMPLOYMENT_OPTIONS,
  FUNDING_STAGE_OPTIONS,
  SOURCE_OPTIONS,
  INDUSTRY_OPTIONS,
  EMPLOYEE_PRESETS,
  SALARY_PRESETS,
  SCORE_PRESETS,
  POSTED_WITHIN_OPTIONS,
  formatOptionLabel,
} from "./filter-types";
import { getJobsFilterPills, clearJobsFilterKey } from "./filter-utils";

interface JobsFilterBarProps {
  filters: JobsFilterState;
  setFilters: (f: JobsFilterState) => void;
  updateFilter: <K extends keyof JobsFilterState>(key: K, value: JobsFilterState[K]) => void;
  clearAll: () => void;
  isEmpty: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
}

type AdditionalFilterKey =
  | "sourceId" | "technologySlugs" | "salary" | "location" | "postedWithinDays"
  | "companyIndustry" | "companySize" | "companyFundingStage" | "enrichmentStatus";

const ADDITIONAL_FILTER_DEFS: { key: AdditionalFilterKey; label: string; category: string }[] = [
  { key: "sourceId", label: "Source", category: "Job" },
  { key: "technologySlugs", label: "Tech Stack", category: "Job" },
  { key: "salary", label: "Salary Range", category: "Job" },
  { key: "location", label: "Location", category: "Job" },
  { key: "postedWithinDays", label: "Posted Within", category: "Job" },
  { key: "companyIndustry", label: "Industry", category: "Company" },
  { key: "companySize", label: "Company Size", category: "Company" },
  { key: "companyFundingStage", label: "Funding Stage", category: "Company" },
  { key: "enrichmentStatus", label: "Enrichment Status", category: "Other" },
];

const ENRICHMENT_OPTIONS = ["not_enriched", "partial", "full", "pending_review"];

function toggleInArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function JobsFilterBar({ filters, setFilters, updateFilter, clearAll, isEmpty, search = "", onSearchChange }: JobsFilterBarProps) {
  const [activeAdditional, setActiveAdditional] = useState<AdditionalFilterKey[]>([]);
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);

  const pills = getJobsFilterPills(filters);

  const addFilter = (key: AdditionalFilterKey) => {
    if (!activeAdditional.includes(key)) {
      setActiveAdditional([...activeAdditional, key]);
    }
    setAddDropdownOpen(false);
  };

  const removeAdditional = (key: AdditionalFilterKey) => {
    setActiveAdditional(activeAdditional.filter((k) => k !== key));
    setFilters(clearJobsFilterKey(filters, key));
  };

  const removePill = (key: string) => {
    setFilters(clearJobsFilterKey(filters, key));
    setActiveAdditional(activeAdditional.filter((k) => k !== key));
  };

  const availableAdditional = ADDITIONAL_FILTER_DEFS.filter((d) => !activeAdditional.includes(d.key));
  const groupedAvailable = availableAdditional.reduce<Record<string, typeof ADDITIONAL_FILTER_DEFS>>((acc, d) => {
    if (!acc[d.category]) acc[d.category] = [];
    acc[d.category].push(d);
    return acc;
  }, {});

  return (
    <div className="mb-4 space-y-2">
      {/* Quick filters row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Seniority */}
        <FilterPopover
          label="Seniority"
          isActive={filters.seniority.length > 0}
          activeCount={filters.seniority.length}
        >
          <div className="flex flex-wrap gap-1.5">
            {SENIORITY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => updateFilter("seniority", toggleInArray(filters.seniority, opt))}
                className={cn(
                  "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                  filters.seniority.includes(opt)
                    ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                    : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                )}
              >
                {formatOptionLabel(opt)}
              </button>
            ))}
          </div>
        </FilterPopover>

        {/* Remote */}
        <FilterPopover
          label="Remote"
          isActive={filters.remote !== "all"}
        >
          <div className="flex gap-1.5">
            {(["all", "remote", "onsite"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => updateFilter("remote", opt)}
                className={cn(
                  "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                  filters.remote === opt
                    ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                    : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                )}
              >
                {opt === "all" ? "All" : opt === "remote" ? "Remote" : "On-site"}
              </button>
            ))}
          </div>
        </FilterPopover>

        {/* Score */}
        <FilterPopover
          label="Score"
          isActive={filters.scoreMin !== null || filters.scoreMax !== null}
        >
          <div className="space-y-3">
            <div className="flex gap-1.5">
              {SCORE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    updateFilter("scoreMin", filters.scoreMin === p.min ? null : p.min);
                    updateFilter("scoreMax", null);
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                    filters.scoreMin === p.min && filters.scoreMax === null
                      ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                      : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-ink-faint mb-1 block">Min</label>
                <input
                  type="number"
                  value={filters.scoreMin ?? ""}
                  onChange={(e) => updateFilter("scoreMin", e.target.value ? Number(e.target.value) : null)}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 rounded-[8px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
                />
              </div>
              <span className="text-ink-faint mt-4">&ndash;</span>
              <div className="flex-1">
                <label className="text-[10px] text-ink-faint mb-1 block">Max</label>
                <input
                  type="number"
                  value={filters.scoreMax ?? ""}
                  onChange={(e) => updateFilter("scoreMax", e.target.value ? Number(e.target.value) : null)}
                  placeholder="100"
                  className="w-full px-2.5 py-1.5 rounded-[8px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
                />
              </div>
            </div>
          </div>
        </FilterPopover>

        {/* Employment Type */}
        <FilterPopover
          label="Employment"
          isActive={filters.employmentType.length > 0}
          activeCount={filters.employmentType.length}
        >
          <div className="flex flex-wrap gap-1.5">
            {EMPLOYMENT_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => updateFilter("employmentType", toggleInArray(filters.employmentType, opt))}
                className={cn(
                  "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                  filters.employmentType.includes(opt)
                    ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                    : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                )}
              >
                {formatOptionLabel(opt)}
              </button>
            ))}
          </div>
        </FilterPopover>

        {/* Active additional filter popovers */}
        {activeAdditional.map((key) => (
          <AdditionalFilterPopover
            key={key}
            filterKey={key}
            filters={filters}
            updateFilter={updateFilter}
            onRemove={() => removeAdditional(key)}
          />
        ))}

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
              <div className="absolute top-full left-0 mt-1 w-48 bg-surface rounded-[10px] border border-border-subtle shadow-lg z-20 py-1 max-h-64 overflow-y-auto">
                {Object.entries(groupedAvailable).map(([group, defs]) => (
                  <div key={group}>
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-ink-faint font-medium">
                      {group}
                    </div>
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

        {/* Search */}
        {onSearchChange && (
          <div className="relative ml-auto">
            <Search size={13} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search jobs..."
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

// ─── Additional Filter Popovers ──────────────────────────────────────

function AdditionalFilterPopover({
  filterKey,
  filters,
  updateFilter,
  onRemove,
}: {
  filterKey: AdditionalFilterKey;
  filters: JobsFilterState;
  updateFilter: <K extends keyof JobsFilterState>(key: K, value: JobsFilterState[K]) => void;
  onRemove: () => void;
}) {
  const def = ADDITIONAL_FILTER_DEFS.find((d) => d.key === filterKey)!;

  const isActive = (() => {
    switch (filterKey) {
      case "sourceId": return filters.sourceId.length > 0;
      case "technologySlugs": return filters.technologySlugs.length > 0;
      case "salary": return filters.salaryRanges.length > 0;
      case "location": return filters.location !== "";
      case "postedWithinDays": return filters.postedWithinDays !== null;
      case "companyIndustry": return filters.companyIndustry.length > 0;
      case "companySize": return filters.companySizeRanges.length > 0;
      case "companyFundingStage": return filters.companyFundingStage.length > 0;
      case "enrichmentStatus": return filters.enrichmentStatus.length > 0;
      default: return false;
    }
  })();

  const activeCount = (() => {
    switch (filterKey) {
      case "sourceId": return filters.sourceId.length;
      case "salary": return filters.salaryRanges.length;
      case "companyIndustry": return filters.companyIndustry.length;
      case "companySize": return filters.companySizeRanges.length;
      case "companyFundingStage": return filters.companyFundingStage.length;
      case "enrichmentStatus": return filters.enrichmentStatus.length;
      default: return undefined;
    }
  })();

  const renderContent = () => {
    switch (filterKey) {
      case "sourceId":
        return (
          <div className="flex flex-wrap gap-1.5">
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => updateFilter("sourceId", toggleInArray(filters.sourceId, opt))}
                className={cn(
                  "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                  filters.sourceId.includes(opt)
                    ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                    : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        );

      case "technologySlugs":
        return (
          <TagInput
            tags={filters.technologySlugs}
            onChange={(tags) => updateFilter("technologySlugs", tags)}
            placeholder="e.g. react, python, aws..."
          />
        );

      case "salary":
        return (
          <div className="flex flex-wrap gap-1.5">
            {SALARY_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => updateFilter("salaryRanges", toggleInArray(filters.salaryRanges, preset.label))}
                className={cn(
                  "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                  filters.salaryRanges.includes(preset.label)
                    ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                    : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        );

      case "location":
        return (
          <input
            type="text"
            value={filters.location}
            onChange={(e) => updateFilter("location", e.target.value)}
            placeholder="e.g. San Francisco, London..."
            className="w-full px-3 py-1.5 rounded-[8px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
          />
        );

      case "postedWithinDays":
        return (
          <div className="flex flex-wrap gap-1.5">
            {POSTED_WITHIN_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateFilter("postedWithinDays", filters.postedWithinDays === value ? null : value)}
                className={cn(
                  "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                  filters.postedWithinDays === value
                    ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                    : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        );

      case "companyIndustry":
        return (
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
            {INDUSTRY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => updateFilter("companyIndustry", toggleInArray(filters.companyIndustry, opt))}
                className={cn(
                  "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                  filters.companyIndustry.includes(opt)
                    ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                    : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        );

      case "companySize":
        return (
          <div className="flex flex-wrap gap-1.5">
            {EMPLOYEE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => updateFilter("companySizeRanges", toggleInArray(filters.companySizeRanges, preset.label))}
                className={cn(
                  "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                  filters.companySizeRanges.includes(preset.label)
                    ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                    : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        );

      case "companyFundingStage":
        return (
          <div className="flex flex-wrap gap-1.5">
            {FUNDING_STAGE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => updateFilter("companyFundingStage", toggleInArray(filters.companyFundingStage, opt))}
                className={cn(
                  "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                  filters.companyFundingStage.includes(opt)
                    ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                    : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                )}
              >
                {formatOptionLabel(opt)}
              </button>
            ))}
          </div>
        );

      case "enrichmentStatus":
        return (
          <div className="flex flex-wrap gap-1.5">
            {ENRICHMENT_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => updateFilter("enrichmentStatus", toggleInArray(filters.enrichmentStatus, opt))}
                className={cn(
                  "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                  filters.enrichmentStatus.includes(opt)
                    ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                    : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                )}
              >
                {formatOptionLabel(opt)}
              </button>
            ))}
          </div>
        );
    }
  };

  return (
    <FilterPopover label={def.label} isActive={isActive} activeCount={activeCount}>
      <div className="space-y-2">
        {renderContent()}
        <div className="pt-1.5 border-t border-border-subtle">
          <button
            type="button"
            onClick={onRemove}
            className="text-[11px] text-ink-muted hover:text-signal-red-text transition-colors"
          >
            Remove filter
          </button>
        </div>
      </div>
    </FilterPopover>
  );
}
