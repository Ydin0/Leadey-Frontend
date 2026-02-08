"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DepartmentBreakdown } from "@/lib/types/company";

interface EnrichmentSelectorProps {
  departments: DepartmentBreakdown[];
  onEnrich: (selections: { department: string; level: string; count: number }[]) => void;
}

interface Selection {
  key: string;
  department: string;
  level: string;
  count: number;
}

const levels = [
  { key: "vp", label: "VP+", field: "vp" as const },
  { key: "director", label: "Directors", field: "director" as const },
  { key: "manager", label: "Managers", field: "manager" as const },
];

export function EnrichmentSelector({ departments, onEnrich }: EnrichmentSelectorProps) {
  const matchingDepts = departments.filter((d) => d.matchesPersona);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(matchingDepts.flatMap((d) => levels.filter((l) => l.key === "vp" || l.key === "director").map((l) => `${d.department}-${l.key}`)))
  );

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const selections: Selection[] = matchingDepts.flatMap((d) =>
    levels
      .filter((l) => selected.has(`${d.department}-${l.key}`))
      .map((l) => ({ key: `${d.department}-${l.key}`, department: d.department, level: l.label, count: d[l.field] }))
  );

  const totalLeads = selections.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="space-y-1">
        {matchingDepts.map((dept) => (
          <div key={dept.department}>
            {levels.map((level) => {
              const key = `${dept.department}-${level.key}`;
              const count = dept[level.field];
              const isSelected = selected.has(key);
              return (
                <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-hover/50">
                  <button
                    onClick={() => toggle(key)}
                    className="flex items-center gap-2"
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                      isSelected ? "bg-signal-blue-text border-signal-blue-text" : "border-border-default"
                    )}>
                      {isSelected && <span className="text-[10px] text-white font-bold">&#10003;</span>}
                    </div>
                    <span className="text-[11px] text-ink">{dept.department} {level.label}</span>
                  </button>
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] text-ink-muted">{count} people</span>
                    <span className="text-[11px] text-ink-muted w-16 text-right">{count} credits</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
        <span className="text-[12px] font-medium text-ink">
          Selected: {totalLeads} leads &middot; Cost: {totalLeads} credits
        </span>
        <button
          onClick={() => onEnrich(selections)}
          className="px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
        >
          Enrich Selected
        </button>
      </div>
    </div>
  );
}
