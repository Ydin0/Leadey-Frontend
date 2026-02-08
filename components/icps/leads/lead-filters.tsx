"use client";

import { cn } from "@/lib/utils";
import type { Department, SeniorityLevel } from "@/lib/types/icp";
import type { LeadStatus } from "@/lib/types/lead";

const departments: Department[] = ["Sales", "Marketing", "RevOps", "Engineering", "Product", "C-Suite", "Finance", "HR", "Operations", "Customer Success"];
const seniorities: SeniorityLevel[] = ["C-Level", "VP", "Director", "Manager", "Senior IC"];

const statusOptions: { value: LeadStatus; label: string; activeClass: string }[] = [
  { value: "discovered", label: "Discovered", activeClass: "bg-signal-slate text-signal-slate-text border-signal-slate-text/20" },
  { value: "enriching", label: "Enriching", activeClass: "bg-signal-blue text-signal-blue-text border-signal-blue-text/20" },
  { value: "enriched", label: "Enriched", activeClass: "bg-signal-green text-signal-green-text border-signal-green-text/20" },
  { value: "in_funnel", label: "In Funnel", activeClass: "bg-signal-blue text-signal-blue-text border-signal-blue-text/20" },
];

interface LeadFiltersProps {
  activeDepartments: Department[];
  onToggleDepartment: (dept: Department) => void;
  activeSeniorities: SeniorityLevel[];
  onToggleSeniority: (level: SeniorityLevel) => void;
  activeStatuses: LeadStatus[];
  onToggleStatus: (status: LeadStatus) => void;
}

export function LeadFilters({ activeDepartments, onToggleDepartment, activeSeniorities, onToggleSeniority, activeStatuses, onToggleStatus }: LeadFiltersProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-ink-faint mr-1">Dept:</span>
        {departments.map((dept) => (
          <button
            key={dept}
            onClick={() => onToggleDepartment(dept)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border",
              activeDepartments.includes(dept)
                ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                : "bg-surface text-ink-muted border-border-subtle hover:bg-hover"
            )}
          >
            {dept}
          </button>
        ))}
      </div>
      <span className="w-px h-4 bg-border-subtle" />
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-ink-faint mr-1">Level:</span>
        {seniorities.map((level) => (
          <button
            key={level}
            onClick={() => onToggleSeniority(level)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border",
              activeSeniorities.includes(level)
                ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                : "bg-surface text-ink-muted border-border-subtle hover:bg-hover"
            )}
          >
            {level}
          </button>
        ))}
      </div>
      <span className="w-px h-4 bg-border-subtle" />
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-ink-faint mr-1">Status:</span>
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onToggleStatus(opt.value)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border",
              activeStatuses.includes(opt.value)
                ? opt.activeClass
                : "bg-surface text-ink-muted border-border-subtle hover:bg-hover"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
