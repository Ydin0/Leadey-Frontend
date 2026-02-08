"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PersonaFilter, Department, SeniorityLevel } from "@/lib/types/icp";

const allDepartments: Department[] = [
  "Sales", "Marketing", "RevOps", "Engineering", "Product", "C-Suite", "Finance", "HR", "Operations", "Customer Success",
];

const allSeniorities: SeniorityLevel[] = ["C-Level", "VP", "Director", "Manager", "Senior IC"];

interface PersonaCardProps {
  persona: PersonaFilter;
  onChange: (updated: PersonaFilter) => void;
  onRemove: () => void;
}

export function PersonaCard({ persona, onChange, onRemove }: PersonaCardProps) {
  function toggleDepartment(dept: Department) {
    const next = persona.departments.includes(dept)
      ? persona.departments.filter((d) => d !== dept)
      : [...persona.departments, dept];
    onChange({ ...persona, departments: next });
  }

  function toggleSeniority(level: SeniorityLevel) {
    const next = persona.seniorityLevels.includes(level)
      ? persona.seniorityLevels.filter((s) => s !== level)
      : [...persona.seniorityLevels, level];
    onChange({ ...persona, seniorityLevels: next });
  }

  function handleTitleKeywords(value: string) {
    onChange({ ...persona, titleKeywords: value.split(",").map((s) => s.trim()).filter(Boolean) });
  }

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="flex items-center justify-between mb-4">
        <input
          type="text"
          value={persona.name}
          onChange={(e) => onChange({ ...persona, name: e.target.value })}
          placeholder="Persona name..."
          className="text-[13px] font-medium text-ink bg-transparent outline-none flex-1"
        />
        <button onClick={onRemove} className="p-1 rounded-full hover:bg-hover transition-colors">
          <X size={14} strokeWidth={1.5} className="text-ink-muted" />
        </button>
      </div>

      {/* Departments */}
      <div className="mb-3">
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Department</label>
        <div className="flex flex-wrap gap-1.5">
          {allDepartments.map((dept) => (
            <button
              key={dept}
              onClick={() => toggleDepartment(dept)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border",
                persona.departments.includes(dept)
                  ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                  : "bg-surface text-ink-muted border-border-subtle hover:bg-hover"
              )}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Seniority */}
      <div className="mb-3">
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Seniority</label>
        <div className="flex flex-wrap gap-1.5">
          {allSeniorities.map((level) => (
            <button
              key={level}
              onClick={() => toggleSeniority(level)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border",
                persona.seniorityLevels.includes(level)
                  ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                  : "bg-surface text-ink-muted border-border-subtle hover:bg-hover"
              )}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Title Keywords */}
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Title Keywords</label>
        <input
          type="text"
          value={persona.titleKeywords.join(", ")}
          onChange={(e) => handleTitleKeywords(e.target.value)}
          placeholder="e.g. Head of, VP, Director..."
          className="w-full px-3 py-1.5 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30 placeholder:text-ink-faint"
        />
      </div>
    </div>
  );
}
