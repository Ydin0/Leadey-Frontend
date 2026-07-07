"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, X, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlideOver } from "@/components/shared/slide-over";
import { NativeSelect } from "@/components/ui/native-select";
import { ValueInput } from "./filter-builder";
import {
  LEAD_FILTER_FIELDS,
  OPERATOR_LABELS,
  NO_VALUE_OPS,
  activeConditionCount,
  EMPTY_FILTER,
  type FilterGroup,
  type FilterCondition,
  type FilterFieldDef,
} from "@/lib/types/lead-filter";

type OptionList = { value: string; label: string }[];

interface FilterSideOverProps {
  value: FilterGroup;
  onChange: (g: FilterGroup) => void;
  /** Runtime options for enum fields, keyed by FilterFieldDef.dynamicOptionsKey. */
  dynamicOptions?: Record<string, OptionList>;
  /** Extra filterable fields (e.g. the org's custom fields). */
  extraFields?: FilterFieldDef[];
  /** Field keys to hide (e.g. the Campaign filter on a single-campaign page). */
  excludeKeys?: string[];
}

const GROUP_ORDER: FilterFieldDef["group"][] = ["Lead", "Opportunity", "Company", "Activity", "Custom"];

/** Close-style filter panel: a slide-over with a searchable, grouped checklist
 *  of fields. Ticking a field adds a condition (expanded inline with an
 *  operator + value editor); unticking removes it. One condition per field. */
export function FilterSideOver({ value, onChange, dynamicOptions = {}, extraFields = [], excludeKeys = []  }: FilterSideOverProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const group = value ?? EMPTY_FILTER;
  const count = activeConditionCount(group);

  const allFields = useMemo(
    () => [...LEAD_FILTER_FIELDS, ...extraFields].filter((f) => !excludeKeys.includes(f.key)),
    [extraFields, excludeKeys],
  );

  const optionsFor = (def: FilterFieldDef): OptionList =>
    def.options ? def.options : def.dynamicOptionsKey ? dynamicOptions[def.dynamicOptionsKey] ?? [] : [];

  // Index of a field's condition within the group (one per field), or -1.
  const condIndex = (key: string) => group.conditions.findIndex((c) => c.field === key);

  const update = (next: FilterGroup) => onChange(next);
  const setCondByKey = (key: string, patch: Partial<FilterCondition>) => {
    const i = condIndex(key);
    if (i < 0) return;
    update({ ...group, conditions: group.conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  };
  const toggleField = (def: FilterFieldDef) => {
    const i = condIndex(def.key);
    if (i >= 0) {
      update({ ...group, conditions: group.conditions.filter((_, idx) => idx !== i) });
    } else {
      update({
        ...group,
        conditions: [...group.conditions, { field: def.key, op: def.operators[0], value: def.type === "boolean" ? "true" : "" }],
      });
    }
  };

  const q = query.trim().toLowerCase();
  const visibleByGroup = GROUP_ORDER
    .map((g) => ({
      group: g,
      fields: allFields.filter((f) => f.group === g && (!q || f.label.toLowerCase().includes(q))),
    }))
    .filter((s) => s.fields.length > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium transition-colors",
          count > 0
            ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
            : "bg-section text-ink-secondary border-border-subtle hover:bg-hover",
        )}
      >
        <SlidersHorizontal size={13} strokeWidth={1.75} />
        Filters
        {count > 0 && (
          <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-signal-blue-text text-on-ink text-[9px] font-semibold">
            {count}
          </span>
        )}
      </button>

      <SlideOver open={open} onClose={() => setOpen(false)} width="max-w-[420px]">
        {/* Header */}
        <div className="relative flex items-center justify-between px-5 h-14 border-b border-border-subtle shrink-0">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal-blue-text/40 to-transparent" />
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-ink-secondary" />
            <span className="text-[13px] font-semibold text-ink">Filters</span>
            {count > 0 && <span className="text-[11px] text-ink-muted">· {count} active</span>}
          </div>
          <div className="flex items-center gap-2">
            {count > 0 && (
              <button
                type="button"
                onClick={() => update(EMPTY_FILTER)}
                className="text-[11px] text-ink-muted hover:text-signal-red-text transition-colors"
              >
                Clear all
              </button>
            )}
            <button onClick={() => setOpen(false)} className="p-1.5 -mr-1 rounded-lg text-ink-muted hover:bg-hover hover:text-ink transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a filter…"
              className="w-full pl-8 pr-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
            />
          </div>
          {count > 1 && (
            <div className="flex items-center gap-1.5 text-[11px] text-ink-muted mt-2.5">
              <span>Match</span>
              <div className="inline-flex rounded-[6px] border border-border-subtle overflow-hidden">
                {(["and", "or"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => update({ ...group, match: m })}
                    className={cn(
                      "px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                      group.match === m ? "bg-signal-blue/15 text-signal-blue-text" : "text-ink-muted hover:bg-hover",
                    )}
                  >
                    {m === "and" ? "ALL" : "ANY"}
                  </button>
                ))}
              </div>
              <span>of the filters</span>
            </div>
          )}
        </div>

        {/* Field checklist */}
        <div className="flex-1 overflow-y-auto px-2 pb-6">
          {visibleByGroup.length === 0 ? (
            <p className="text-[11px] text-ink-faint text-center py-8">No filters match “{query}”.</p>
          ) : (
            visibleByGroup.map((section) => (
              <div key={section.group} className="mb-1">
                <p className="text-[10px] uppercase tracking-wider text-ink-faint font-medium px-3 pt-3 pb-1">{section.group}</p>
                {section.fields.map((def) => {
                  const i = condIndex(def.key);
                  const active = i >= 0;
                  const cond = active ? group.conditions[i] : null;
                  return (
                    <div key={def.key} className={cn("rounded-[8px]", active && "bg-section/60")}>
                      <button
                        type="button"
                        onClick={() => toggleField(def)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-hover rounded-[8px] transition-colors"
                      >
                        <span
                          className={cn(
                            "flex items-center justify-center w-4 h-4 rounded-[4px] border shrink-0 transition-colors",
                            active ? "bg-signal-blue-text border-signal-blue-text text-on-ink" : "border-border-default",
                          )}
                        >
                          {active && <Check size={11} strokeWidth={3} />}
                        </span>
                        <span className={cn("text-[12px]", active ? "text-ink font-medium" : "text-ink-secondary")}>{def.label}</span>
                      </button>

                      {active && cond && (
                        <div className="px-3 pb-3 pt-0.5 pl-9 space-y-1.5">
                          <NativeSelect
                            value={cond.op}
                            onChange={(e) => setCondByKey(def.key, { op: e.target.value as FilterCondition["op"], value: "" })}
                            className="w-full text-[11.5px]"
                          >
                            {def.operators.map((op) => (
                              <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
                            ))}
                          </NativeSelect>
                          {!NO_VALUE_OPS.has(cond.op) && (
                            <ValueInput
                              def={def}
                              cond={cond}
                              options={optionsFor(def)}
                              onChange={(value) => setCondByKey(def.key, { value })}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </SlideOver>
    </>
  );
}
