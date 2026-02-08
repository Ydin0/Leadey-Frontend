"use client";

import { Plus } from "lucide-react";
import { PersonaCard } from "./persona-card";
import { PersonaTemplatePicker } from "./persona-template-picker";
import type { ICP, PersonaFilter } from "@/lib/types/icp";

interface StepPersonaTargetingProps {
  data: Partial<ICP>;
  onChange: (data: Partial<ICP>) => void;
}

export function StepPersonaTargeting({ data, onChange }: StepPersonaTargetingProps) {
  const personas = data.personas || [];

  function addPersona(template?: Omit<PersonaFilter, "id">) {
    const newPersona: PersonaFilter = {
      id: `p_${Date.now()}`,
      name: template?.name || "",
      departments: template?.departments || [],
      seniorityLevels: template?.seniorityLevels || [],
      titleKeywords: template?.titleKeywords || [],
      excludeTitleKeywords: template?.excludeTitleKeywords || [],
    };
    onChange({ ...data, personas: [...personas, newPersona] });
  }

  function updatePersona(index: number, updated: PersonaFilter) {
    const next = [...personas];
    next[index] = updated;
    onChange({ ...data, personas: next });
  }

  function removePersona(index: number) {
    onChange({ ...data, personas: personas.filter((_, i) => i !== index) });
  }

  // Build summary line
  const summaryParts: string[] = [];
  if (personas.length > 0) {
    const allDepts = [...new Set(personas.flatMap((p) => p.departments))];
    const allSeniorities = [...new Set(personas.flatMap((p) => p.seniorityLevels))];
    if (allSeniorities.length > 0 && allDepts.length > 0) {
      summaryParts.push(
        `Targeting ${allSeniorities.join(", ")} in ${allDepts.join(", ")}`
      );
    }
    if (data.companyProfile) {
      summaryParts.push(
        `at companies with ${data.companyProfile.companySizeMin.toLocaleString()}\u2013${data.companyProfile.companySizeMax.toLocaleString()} employees`
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold text-ink mb-1">Who inside those companies?</h2>
        <p className="text-[12px] text-ink-muted">Define the personas you want to reach at each company</p>
      </div>

      {/* Templates */}
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">Quick Templates</label>
        <PersonaTemplatePicker onSelect={(t) => addPersona(t)} />
      </div>

      {/* Persona Cards */}
      <div className="space-y-3">
        {personas.map((persona, i) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            onChange={(updated) => updatePersona(i, updated)}
            onRemove={() => removePersona(i)}
          />
        ))}
      </div>

      {/* Add Button */}
      <button
        onClick={() => addPersona()}
        className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle"
      >
        <Plus size={14} strokeWidth={2} />
        Add Persona
      </button>

      {/* Summary */}
      {summaryParts.length > 0 && (
        <div className="bg-signal-blue/50 rounded-[10px] px-4 py-3">
          <p className="text-[12px] text-signal-blue-text">{summaryParts.join(" ")}</p>
        </div>
      )}
    </div>
  );
}
