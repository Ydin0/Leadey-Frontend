"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, X, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterPopover } from "@/components/scrapers/filters/filter-popover";
import { statusDot, statusLabel } from "@/lib/utils/lead-status";
import type { LeadStatus } from "@/lib/types/funnel";

export interface FunnelLeadsFilters {
  statuses: LeadStatus[];
  companies: string[];
  sources: string[];
  scoreMin: number | null;
  hasPhone: "true" | "false" | null;
  hasEmail: "true" | "false" | null;
  isOverdue: boolean;
  callCountMin: number | null;
  emailCountMin: number | null;
  search: string;
}

export const DEFAULT_FUNNEL_LEADS_FILTERS: FunnelLeadsFilters = {
  statuses: [],
  companies: [],
  sources: [],
  scoreMin: null,
  hasPhone: null,
  hasEmail: null,
  isOverdue: false,
  callCountMin: null,
  emailCountMin: null,
  search: "",
};

const ALL_STATUSES: LeadStatus[] = [
  "new", "contacted", "no_answer", "callback", "interested",
  "not_interested", "competitor", "dnc", "other_contact",
  "qualified", "bounced", "completed",
];

const SCORE_PRESETS = [
  { value: 70, label: "70+" },
  { value: 80, label: "80+" },
  { value: 90, label: "90+" },
];

const COUNT_PRESETS = [
  { value: 1, label: "1+" },
  { value: 3, label: "3+" },
  { value: 5, label: "5+" },
];

const CONTACT_DATA_OPTIONS = [
  { value: "true", label: "Has data" },
  { value: "false", label: "Missing" },
];

interface FunnelLeadsFilterBarProps {
  filters: FunnelLeadsFilters;
  onChange: (filters: FunnelLeadsFilters) => void;
  companyOptions: string[];
  sourceOptions: string[];
}

type AdditionalFilterKey = "sources" | "scoreMin" | "hasPhone" | "hasEmail" | "isOverdue" | "callCountMin" | "emailCountMin";

const ADDITIONAL_FILTER_DEFS: { key: AdditionalFilterKey; label: string }[] = [
  { key: "sources", label: "Source" },
  { key: "scoreMin", label: "Score" },
  { key: "hasPhone", label: "Has Phone" },
  { key: "hasEmail", label: "Has Email" },
  { key: "isOverdue", label: "Overdue" },
  { key: "callCountMin", label: "Calls Made" },
  { key: "emailCountMin", label: "Emails Sent" },
];

function SearchableMultiSelect({
  options,
  selected,
  onToggle,
  placeholder,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
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
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={cn(
              "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
              selected.includes(opt)
                ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                : "bg-section text-ink-secondary border-transparent hover:bg-hover"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function toggleInArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function FunnelLeadsFilterBar({ filters, onChange, companyOptions, sourceOptions }: FunnelLeadsFilterBarProps) {
  const [activeAdditional, setActiveAdditional] = useState<AdditionalFilterKey[]>(() => {
    const active: AdditionalFilterKey[] = [];
    if (filters.sources.length > 0) active.push("sources");
    if (filters.scoreMin !== null) active.push("scoreMin");
    if (filters.hasPhone) active.push("hasPhone");
    if (filters.hasEmail) active.push("hasEmail");
    if (filters.isOverdue) active.push("isOverdue");
    if (filters.callCountMin !== null) active.push("callCountMin");
    if (filters.emailCountMin !== null) active.push("emailCountMin");
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

  // Build pills
  const pills: { key: string; label: string }[] = [];
  if (filters.statuses.length > 0) {
    pills.push({ key: "statuses", label: `Status: ${filters.statuses.map((s) => statusLabel[s]).join(", ")}` });
  }
  if (filters.companies.length > 0) {
    pills.push({ key: "companies", label: `Company: ${filters.companies.join(", ")}` });
  }
  if (filters.sources.length > 0) {
    pills.push({ key: "sources", label: `Source: ${filters.sources.join(", ")}` });
  }
  if (filters.scoreMin !== null) {
    pills.push({ key: "scoreMin", label: `Score: ${filters.scoreMin}+` });
  }
  if (filters.hasEmail) {
    pills.push({ key: "hasEmail", label: filters.hasEmail === "true" ? "Has Email" : "No Email" });
  }
  if (filters.hasPhone) {
    pills.push({ key: "hasPhone", label: filters.hasPhone === "true" ? "Has Phone" : "No Phone" });
  }
  if (filters.isOverdue) {
    pills.push({ key: "isOverdue", label: "Overdue" });
  }
  if (filters.callCountMin !== null) {
    pills.push({ key: "callCountMin", label: `Calls: ${filters.callCountMin}+` });
  }
  if (filters.emailCountMin !== null) {
    pills.push({ key: "emailCountMin", label: `Emails: ${filters.emailCountMin}+` });
  }

  const addFilter = (key: AdditionalFilterKey) => {
    if (!activeAdditional.includes(key)) setActiveAdditional([...activeAdditional, key]);
    setAddDropdownOpen(false);
  };

  const removeAdditional = (key: AdditionalFilterKey) => {
    setActiveAdditional(activeAdditional.filter((k) => k !== key));
    removePill(key);
  };

  const removePill = (key: string) => {
    const updated = { ...filters };
    switch (key) {
      case "statuses": updated.statuses = []; break;
      case "companies": updated.companies = []; break;
      case "sources": updated.sources = []; break;
      case "scoreMin": updated.scoreMin = null; break;
      case "hasEmail": updated.hasEmail = null; break;
      case "hasPhone": updated.hasPhone = null; break;
      case "isOverdue": updated.isOverdue = false; break;
      case "callCountMin": updated.callCountMin = null; break;
      case "emailCountMin": updated.emailCountMin = null; break;
    }
    onChange(updated);
  };

  const clearAll = () => {
    onChange({ ...DEFAULT_FUNNEL_LEADS_FILTERS, search: filters.search });
    setActiveAdditional([]);
  };

  const availableAdditional = ADDITIONAL_FILTER_DEFS.filter((d) => !activeAdditional.includes(d.key));

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Status — always visible */}
        <FilterPopover label="Status" isActive={filters.statuses.length > 0} activeCount={filters.statuses.length}>
          <div className="flex flex-wrap gap-1.5 max-w-[320px]">
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange({ ...filters, statuses: toggleInArray(filters.statuses, s) as LeadStatus[] })}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                  filters.statuses.includes(s)
                    ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                    : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                )}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full", statusDot[s])} />
                {statusLabel[s]}
              </button>
            ))}
          </div>
        </FilterPopover>

        {/* Company — always visible, searchable */}
        <FilterPopover label="Company" isActive={filters.companies.length > 0} activeCount={filters.companies.length}>
          <SearchableMultiSelect
            options={companyOptions}
            selected={filters.companies}
            onToggle={(v) => onChange({ ...filters, companies: toggleInArray(filters.companies, v) })}
            placeholder="Search companies..."
          />
        </FilterPopover>

        {/* Additional filters */}
        {activeAdditional.map((key) => {
          const def = ADDITIONAL_FILTER_DEFS.find((d) => d.key === key)!;

          if (key === "sources") {
            return (
              <FilterPopover key={key} label="Source" isActive={filters.sources.length > 0} activeCount={filters.sources.length}>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {sourceOptions.map((s) => (
                      <button key={s} type="button" onClick={() => onChange({ ...filters, sources: toggleInArray(filters.sources, s) })}
                        className={cn("px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                          filters.sources.includes(s) ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20" : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                        )}>{s}</button>
                    ))}
                  </div>
                  <div className="pt-1.5 border-t border-border-subtle">
                    <button type="button" onClick={() => removeAdditional(key)} className="text-[11px] text-ink-muted hover:text-signal-red-text transition-colors">Remove filter</button>
                  </div>
                </div>
              </FilterPopover>
            );
          }

          if (key === "scoreMin") {
            return (
              <FilterPopover key={key} label="Score" isActive={filters.scoreMin !== null} activeCount={filters.scoreMin !== null ? 1 : 0}>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {SCORE_PRESETS.map((p) => (
                      <button key={p.value} type="button" onClick={() => onChange({ ...filters, scoreMin: filters.scoreMin === p.value ? null : p.value })}
                        className={cn("px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                          filters.scoreMin === p.value ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20" : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                        )}>{p.label}</button>
                    ))}
                  </div>
                  <div className="pt-1.5 border-t border-border-subtle">
                    <button type="button" onClick={() => removeAdditional(key)} className="text-[11px] text-ink-muted hover:text-signal-red-text transition-colors">Remove filter</button>
                  </div>
                </div>
              </FilterPopover>
            );
          }

          if (key === "hasEmail" || key === "hasPhone") {
            const value = key === "hasEmail" ? filters.hasEmail : filters.hasPhone;
            return (
              <FilterPopover key={key} label={def.label} isActive={!!value} activeCount={value ? 1 : 0}>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {CONTACT_DATA_OPTIONS.map((opt) => (
                      <button key={opt.value} type="button"
                        onClick={() => onChange({ ...filters, [key]: value === opt.value ? null : opt.value as "true" | "false" })}
                        className={cn("px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                          value === opt.value ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20" : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                        )}>{opt.label}</button>
                    ))}
                  </div>
                  <div className="pt-1.5 border-t border-border-subtle">
                    <button type="button" onClick={() => removeAdditional(key)} className="text-[11px] text-ink-muted hover:text-signal-red-text transition-colors">Remove filter</button>
                  </div>
                </div>
              </FilterPopover>
            );
          }

          if (key === "isOverdue") {
            return (
              <FilterPopover key={key} label="Overdue" isActive={filters.isOverdue} activeCount={filters.isOverdue ? 1 : 0}>
                <div className="space-y-2">
                  <button type="button" onClick={() => onChange({ ...filters, isOverdue: !filters.isOverdue })}
                    className={cn("px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                      filters.isOverdue ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20" : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                    )}>Only overdue leads</button>
                  <div className="pt-1.5 border-t border-border-subtle">
                    <button type="button" onClick={() => removeAdditional(key)} className="text-[11px] text-ink-muted hover:text-signal-red-text transition-colors">Remove filter</button>
                  </div>
                </div>
              </FilterPopover>
            );
          }

          if (key === "callCountMin" || key === "emailCountMin") {
            const value = key === "callCountMin" ? filters.callCountMin : filters.emailCountMin;
            return (
              <FilterPopover key={key} label={def.label} isActive={value !== null} activeCount={value !== null ? 1 : 0}>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {COUNT_PRESETS.map((p) => (
                      <button key={p.value} type="button"
                        onClick={() => onChange({ ...filters, [key]: value === p.value ? null : p.value })}
                        className={cn("px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                          value === p.value ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20" : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                        )}>{p.label}</button>
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

        {/* + Filter */}
        {availableAdditional.length > 0 && (
          <div className="relative" ref={addRef}>
            <button type="button" onClick={() => setAddDropdownOpen(!addDropdownOpen)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[12px] font-medium text-ink-muted border border-dashed border-border-default hover:bg-hover/30 hover:text-ink-secondary transition-colors">
              <Plus size={12} />
              Filter
              <ChevronDown size={10} className={cn("transition-transform", addDropdownOpen && "rotate-180")} />
            </button>
            {addDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-surface rounded-[10px] border border-border-subtle shadow-lg z-20 py-1">
                {availableAdditional.map((def) => (
                  <button key={def.key} type="button" onClick={() => addFilter(def.key)}
                    className="w-full text-left px-3 py-1.5 text-[12px] text-ink hover:bg-hover transition-colors">{def.label}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search — right side */}
        <div className="relative ml-auto">
          <Search size={13} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search leads..."
            className="pl-8 pr-3 py-1.5 rounded-full bg-section border border-border-subtle text-[11px] text-ink placeholder:text-ink-faint w-48 focus:outline-none focus:border-border-default"
          />
        </div>
      </div>

      {/* Active filter pills */}
      {pills.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {pills.map((pill) => (
            <span key={pill.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[11px] font-medium bg-signal-blue/10 text-signal-blue-text">
              {pill.label}
              <button type="button" onClick={() => removePill(pill.key)} className="p-0.5 rounded hover:bg-signal-blue/20 transition-colors">
                <X size={10} />
              </button>
            </span>
          ))}
          <button type="button" onClick={clearAll} className="text-[11px] font-medium text-ink-muted hover:text-ink-secondary transition-colors ml-1">Clear all</button>
        </div>
      )}
    </div>
  );
}
