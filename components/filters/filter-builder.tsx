"use client";

import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterPopover } from "@/components/scrapers/filters/filter-popover";
import { NativeSelect } from "@/components/ui/native-select";
import {
  LEAD_FILTER_FIELDS,
  fieldDef,
  OPERATOR_LABELS,
  NO_VALUE_OPS,
  activeConditionCount,
  EMPTY_FILTER,
  type FilterGroup,
  type FilterCondition,
  type FilterFieldDef,
} from "@/lib/types/lead-filter";

type OptionList = { value: string; label: string }[];

interface FilterBuilderProps {
  value: FilterGroup;
  onChange: (g: FilterGroup) => void;
  /** Runtime options for enum fields, keyed by FilterFieldDef.dynamicOptionsKey. */
  dynamicOptions?: Record<string, OptionList>;
}

const inputCls =
  "bg-surface border border-border-subtle rounded-md px-2 py-1 text-[11.5px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default";

const GROUPS: FilterFieldDef["group"][] = ["Lead", "Company", "Activity"];

export function FilterBuilder({ value, onChange, dynamicOptions = {} }: FilterBuilderProps) {
  const group = value ?? EMPTY_FILTER;
  const count = activeConditionCount(group);

  const update = (next: FilterGroup) => onChange(next);
  const setCond = (i: number, patch: Partial<FilterCondition>) =>
    update({ ...group, conditions: group.conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  const removeCond = (i: number) => update({ ...group, conditions: group.conditions.filter((_, idx) => idx !== i) });
  const addCond = () => {
    const f = LEAD_FILTER_FIELDS[0];
    update({ ...group, conditions: [...group.conditions, { field: f.key, op: f.operators[0], value: "" }] });
  };
  const changeField = (i: number, key: string) => {
    const d = fieldDef(key)!;
    setCond(i, { field: key, op: d.operators[0], value: d.type === "boolean" ? "true" : "" });
  };

  function optionsFor(def: FilterFieldDef): OptionList {
    if (def.options) return def.options;
    if (def.dynamicOptionsKey) return dynamicOptions[def.dynamicOptionsKey] ?? [];
    return [];
  }

  return (
    <FilterPopover label="Filter" isActive={count > 0} activeCount={count}>
      <div className="w-[440px] space-y-2.5">
        {group.conditions.length > 1 && (
          <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
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
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
            <span>of the conditions</span>
          </div>
        )}

        <div className="space-y-1.5 max-h-[340px] overflow-y-auto">
          {group.conditions.map((c, i) => {
            const def = fieldDef(c.field);
            return (
              <div key={i} className="flex items-start gap-1.5">
                <NativeSelect
                  value={c.field}
                  onChange={(e) => changeField(i, e.target.value)}
                  className="w-[130px] shrink-0 text-[11.5px]"
                >
                  {GROUPS.map((g) => (
                    <optgroup key={g} label={g}>
                      {LEAD_FILTER_FIELDS.filter((f) => f.group === g).map((f) => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </NativeSelect>

                <NativeSelect
                  value={c.op}
                  onChange={(e) => setCond(i, { op: e.target.value as FilterCondition["op"], value: "" })}
                  className="w-[120px] shrink-0 text-[11.5px]"
                >
                  {(def?.operators ?? []).map((op) => (
                    <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
                  ))}
                </NativeSelect>

                <div className="flex-1 min-w-0">
                  {def && !NO_VALUE_OPS.has(c.op) && (
                    <ValueInput def={def} cond={c} options={optionsFor(def)} onChange={(value) => setCond(i, { value })} />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeCond(i)}
                  className="mt-1 text-ink-faint hover:text-signal-red-text transition-colors shrink-0"
                  title="Remove condition"
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-1.5 border-t border-border-subtle">
          <button
            type="button"
            onClick={addCond}
            className="inline-flex items-center gap-1 text-[11.5px] font-medium text-signal-blue-text hover:underline"
          >
            <Plus size={12} /> Add condition
          </button>
          {count > 0 && (
            <button
              type="button"
              onClick={() => update(EMPTY_FILTER)}
              className="text-[11px] text-ink-muted hover:text-signal-red-text transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    </FilterPopover>
  );
}

function ValueInput({
  def,
  cond,
  options,
  onChange,
}: {
  def: FilterFieldDef;
  cond: FilterCondition;
  options: OptionList;
  onChange: (v: FilterCondition["value"]) => void;
}) {
  if (def.type === "boolean") {
    return (
      <NativeSelect value={String(cond.value ?? "true")} onChange={(e) => onChange(e.target.value)} className="w-full text-[11.5px]">
        {(def.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </NativeSelect>
    );
  }

  if (def.type === "enum") {
    const selected = Array.isArray(cond.value) ? cond.value : cond.value ? [String(cond.value)] : [];
    const toggle = (v: string) =>
      onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
    if (options.length === 0) {
      // No known options yet — fall back to a free-text value.
      return <input value={(cond.value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="value" className={cn(inputCls, "w-full")} />;
    }
    return (
      <div className="flex flex-wrap gap-1 max-h-[88px] overflow-y-auto">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={cn(
              "px-1.5 py-0.5 rounded-[5px] text-[10.5px] font-medium border transition-colors",
              selected.includes(o.value)
                ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                : "bg-section text-ink-secondary border-transparent hover:bg-hover",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  if (cond.op === "between") {
    const arr = Array.isArray(cond.value) ? cond.value : ["", ""];
    const type = def.type === "date" ? "date" : "number";
    return (
      <div className="flex items-center gap-1">
        <input type={type === "number" ? "text" : "date"} inputMode={type === "number" ? "numeric" : undefined} value={arr[0] ?? ""} onChange={(e) => onChange([type === "number" ? e.target.value.replace(/[^0-9]/g, "") : e.target.value, arr[1] ?? ""])} placeholder="min" className={cn(inputCls, "w-full")} />
        <span className="text-ink-faint text-[11px]">–</span>
        <input type={type === "number" ? "text" : "date"} inputMode={type === "number" ? "numeric" : undefined} value={arr[1] ?? ""} onChange={(e) => onChange([arr[0] ?? "", type === "number" ? e.target.value.replace(/[^0-9]/g, "") : e.target.value])} placeholder="max" className={cn(inputCls, "w-full")} />
      </div>
    );
  }

  if (def.type === "date") {
    return <input type="date" value={(cond.value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "w-full")} />;
  }

  if (def.type === "number") {
    return <input inputMode="numeric" value={(cond.value as string) ?? ""} onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))} placeholder="value" className={cn(inputCls, "w-full")} />;
  }

  return <input value={(cond.value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="value" className={cn(inputCls, "w-full")} />;
}
