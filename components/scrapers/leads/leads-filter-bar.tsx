"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, X, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterPopover } from "@/components/scrapers/filters/filter-popover";

export interface LeadsFilters {
  enrichmentStatus: string | null;
  contactStatus: string | null;
  companies: string[];
  title: string;
  location: string;
  hasEmail: "true" | "false" | null;
  hasPhone: "true" | "false" | null;
}

export const DEFAULT_LEADS_FILTERS: LeadsFilters = {
  enrichmentStatus: null,
  contactStatus: null,
  companies: [],
  title: "",
  location: "",
  hasEmail: null,
  hasPhone: null,
};

const ENRICHMENT_OPTIONS = [
  { value: "none", label: "Not Enriched" },
  { value: "pending", label: "Pending" },
  { value: "enriched", label: "Enriched" },
  { value: "failed", label: "Failed" },
];

const STATUS_OPTIONS = [
  { value: "discovered", label: "Discovered" },
  { value: "in_funnel", label: "In Funnel" },
  { value: "dismissed", label: "Dismissed" },
];

const CONTACT_DATA_OPTIONS = [
  { value: "true", label: "Has data" },
  { value: "false", label: "Missing" },
];

interface LeadsFilterBarProps {
  filters: LeadsFilters;
  onChange: (filters: LeadsFilters) => void;
  companyOptions?: { name: string; count: number }[];
}

type AdditionalFilterKey = "contactStatus" | "title" | "location" | "hasEmail" | "hasPhone";

const ADDITIONAL_FILTER_DEFS: { key: AdditionalFilterKey; label: string }[] = [
  { key: "contactStatus", label: "Status" },
  { key: "title", label: "Job Title" },
  { key: "location", label: "Location" },
  { key: "hasEmail", label: "Has Email" },
  { key: "hasPhone", label: "Has Phone" },
];

function SearchableMultiSelect({
  options,
  selected,
  onToggle,
  placeholder,
}: {
  options: { value: string; label: string; count?: number }[];
  selected: string[];
  onToggle: (value: string) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder || "Search..."}
          className="w-full pl-8 pr-3 py-1.5 rounded-[8px] bg-section text-[11px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30 placeholder:text-ink-faint"
        />
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
        {filtered.length === 0 && (
          <span className="text-[11px] text-ink-faint py-2">No matches</span>
        )}
        {filtered.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            className={cn(
              "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
              selected.includes(opt.value)
                ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                : "bg-section text-ink-secondary border-transparent hover:bg-hover"
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span className="ml-1 text-ink-faint">({opt.count})</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function LeadsFilterBar({ filters, onChange, companyOptions = [] }: LeadsFilterBarProps) {
  const [activeAdditional, setActiveAdditional] = useState<AdditionalFilterKey[]>(() => {
    const active: AdditionalFilterKey[] = [];
    if (filters.contactStatus) active.push("contactStatus");
    if (filters.title) active.push("title");
    if (filters.location) active.push("location");
    if (filters.hasEmail) active.push("hasEmail");
    if (filters.hasPhone) active.push("hasPhone");
    return active;
  });
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!addDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (addRef.current && !addRef.current.contains(e.target as Node)) {
        setAddDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [addDropdownOpen]);

  const pills: { key: string; label: string }[] = [];
  if (filters.enrichmentStatus) {
    const opt = ENRICHMENT_OPTIONS.find((o) => o.value === filters.enrichmentStatus);
    pills.push({ key: "enrichmentStatus", label: `Enrichment: ${opt?.label ?? filters.enrichmentStatus}` });
  }
  if (filters.companies.length > 0) {
    pills.push({ key: "companies", label: `Company: ${filters.companies.join(", ")}` });
  }
  if (filters.contactStatus) {
    const opt = STATUS_OPTIONS.find((o) => o.value === filters.contactStatus);
    pills.push({ key: "contactStatus", label: `Status: ${opt?.label ?? filters.contactStatus}` });
  }
  if (filters.title) {
    pills.push({ key: "title", label: `Title: ${filters.title}` });
  }
  if (filters.location) {
    pills.push({ key: "location", label: `Location: ${filters.location}` });
  }
  if (filters.hasEmail) {
    pills.push({ key: "hasEmail", label: filters.hasEmail === "true" ? "Has Email" : "No Email" });
  }
  if (filters.hasPhone) {
    pills.push({ key: "hasPhone", label: filters.hasPhone === "true" ? "Has Phone" : "No Phone" });
  }

  const addFilter = (key: AdditionalFilterKey) => {
    if (!activeAdditional.includes(key)) {
      setActiveAdditional([...activeAdditional, key]);
    }
    setAddDropdownOpen(false);
  };

  const removeAdditional = (key: AdditionalFilterKey) => {
    setActiveAdditional(activeAdditional.filter((k) => k !== key));
    removePill(key);
  };

  const removePill = (key: string) => {
    switch (key) {
      case "enrichmentStatus": onChange({ ...filters, enrichmentStatus: null }); break;
      case "companies": onChange({ ...filters, companies: [] }); break;
      case "contactStatus":
        onChange({ ...filters, contactStatus: null });
        setActiveAdditional(activeAdditional.filter((k) => k !== "contactStatus"));
        break;
      case "title":
        onChange({ ...filters, title: "" });
        setActiveAdditional(activeAdditional.filter((k) => k !== "title"));
        break;
      case "location":
        onChange({ ...filters, location: "" });
        setActiveAdditional(activeAdditional.filter((k) => k !== "location"));
        break;
      case "hasEmail":
        onChange({ ...filters, hasEmail: null });
        setActiveAdditional(activeAdditional.filter((k) => k !== "hasEmail"));
        break;
      case "hasPhone":
        onChange({ ...filters, hasPhone: null });
        setActiveAdditional(activeAdditional.filter((k) => k !== "hasPhone"));
        break;
    }
  };

  const clearAll = () => {
    onChange(DEFAULT_LEADS_FILTERS);
    setActiveAdditional([]);
  };

  function toggleCompany(name: string) {
    const next = filters.companies.includes(name)
      ? filters.companies.filter((c) => c !== name)
      : [...filters.companies, name];
    onChange({ ...filters, companies: next });
  }

  const availableAdditional = ADDITIONAL_FILTER_DEFS.filter((d) => !activeAdditional.includes(d.key));

  return (
    <div className="mb-4 space-y-2">
      {/* Filters row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Enrichment Status */}
        <FilterPopover
          label="Enrichment"
          isActive={!!filters.enrichmentStatus}
          activeCount={filters.enrichmentStatus ? 1 : 0}
        >
          <div className="flex flex-wrap gap-1.5">
            {ENRICHMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onChange({
                    ...filters,
                    enrichmentStatus: filters.enrichmentStatus === opt.value ? null : opt.value,
                  })
                }
                className={cn(
                  "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                  filters.enrichmentStatus === opt.value
                    ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                    : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FilterPopover>

        {/* Company — always visible, searchable multi-select */}
        <FilterPopover
          label="Company"
          isActive={filters.companies.length > 0}
          activeCount={filters.companies.length}
        >
          <SearchableMultiSelect
            options={companyOptions.map((c) => ({ value: c.name, label: c.name, count: c.count }))}
            selected={filters.companies}
            onToggle={toggleCompany}
            placeholder="Search companies..."
          />
        </FilterPopover>

        {/* Active additional filter popovers */}
        {activeAdditional.map((key) => {
          if (key === "contactStatus") {
            return (
              <FilterPopover key={key} label="Status" isActive={!!filters.contactStatus} activeCount={filters.contactStatus ? 1 : 0}>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange({ ...filters, contactStatus: filters.contactStatus === opt.value ? null : opt.value })}
                        className={cn(
                          "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                          filters.contactStatus === opt.value
                            ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                            : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="pt-1.5 border-t border-border-subtle">
                    <button type="button" onClick={() => removeAdditional(key)} className="text-[11px] text-ink-muted hover:text-signal-red-text transition-colors">Remove filter</button>
                  </div>
                </div>
              </FilterPopover>
            );
          }

          if (key === "title") {
            return (
              <FilterPopover key={key} label="Job Title" isActive={!!filters.title}>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={filters.title}
                    onChange={(e) => onChange({ ...filters, title: e.target.value })}
                    placeholder="e.g. CEO, VP Sales..."
                    className="w-full px-3 py-1.5 rounded-[8px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30 placeholder:text-ink-faint"
                  />
                  <div className="pt-1.5 border-t border-border-subtle">
                    <button type="button" onClick={() => removeAdditional(key)} className="text-[11px] text-ink-muted hover:text-signal-red-text transition-colors">Remove filter</button>
                  </div>
                </div>
              </FilterPopover>
            );
          }

          if (key === "location") {
            return (
              <FilterPopover key={key} label="Location" isActive={!!filters.location}>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={filters.location}
                    onChange={(e) => onChange({ ...filters, location: e.target.value })}
                    placeholder="e.g. London, New York..."
                    className="w-full px-3 py-1.5 rounded-[8px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30 placeholder:text-ink-faint"
                  />
                  <div className="pt-1.5 border-t border-border-subtle">
                    <button type="button" onClick={() => removeAdditional(key)} className="text-[11px] text-ink-muted hover:text-signal-red-text transition-colors">Remove filter</button>
                  </div>
                </div>
              </FilterPopover>
            );
          }

          if (key === "hasEmail") {
            return (
              <FilterPopover key={key} label="Has Email" isActive={!!filters.hasEmail} activeCount={filters.hasEmail ? 1 : 0}>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {CONTACT_DATA_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange({ ...filters, hasEmail: filters.hasEmail === opt.value ? null : opt.value as "true" | "false" })}
                        className={cn(
                          "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                          filters.hasEmail === opt.value
                            ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                            : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="pt-1.5 border-t border-border-subtle">
                    <button type="button" onClick={() => removeAdditional(key)} className="text-[11px] text-ink-muted hover:text-signal-red-text transition-colors">Remove filter</button>
                  </div>
                </div>
              </FilterPopover>
            );
          }

          if (key === "hasPhone") {
            return (
              <FilterPopover key={key} label="Has Phone" isActive={!!filters.hasPhone} activeCount={filters.hasPhone ? 1 : 0}>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {CONTACT_DATA_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange({ ...filters, hasPhone: filters.hasPhone === opt.value ? null : opt.value as "true" | "false" })}
                        className={cn(
                          "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                          filters.hasPhone === opt.value
                            ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                            : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="pt-1.5 border-t border-border-subtle">
                    <button type="button" onClick={() => removeAdditional(key)} className="text-[11px] text-ink-muted hover:text-signal-red-text transition-colors">Remove filter</button>
                  </div>
                </div>
              </FilterPopover>
            );
          }

          return null;
        })}

        {/* + Add Filter */}
        {availableAdditional.length > 0 && (
          <div className="relative" ref={addRef}>
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
            onClick={clearAll}
            className="text-[11px] font-medium text-ink-muted hover:text-ink-secondary transition-colors ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
