import type { PersonaFilter } from "@/lib/types/icp";

interface PersonaTemplate {
  label: string;
  persona: Omit<PersonaFilter, "id">;
}

const templates: PersonaTemplate[] = [
  {
    label: "Sales Leadership",
    persona: {
      name: "Sales Leadership",
      departments: ["Sales"],
      seniorityLevels: ["C-Level", "VP", "Director"],
      titleKeywords: ["Head of Sales", "VP Sales", "CRO"],
      excludeTitleKeywords: [],
    },
  },
  {
    label: "RevOps",
    persona: {
      name: "RevOps",
      departments: ["RevOps", "Operations"],
      seniorityLevels: ["VP", "Director", "Manager"],
      titleKeywords: ["RevOps", "Revenue Operations", "Sales Ops"],
      excludeTitleKeywords: [],
    },
  },
  {
    label: "C-Suite",
    persona: {
      name: "C-Suite",
      departments: ["C-Suite"],
      seniorityLevels: ["C-Level"],
      titleKeywords: ["CEO", "CRO", "CTO", "CMO", "COO"],
      excludeTitleKeywords: [],
    },
  },
  {
    label: "Marketing Leadership",
    persona: {
      name: "Marketing Leadership",
      departments: ["Marketing"],
      seniorityLevels: ["C-Level", "VP", "Director"],
      titleKeywords: ["Head of Marketing", "VP Marketing", "CMO"],
      excludeTitleKeywords: [],
    },
  },
];

interface PersonaTemplatePickerProps {
  onSelect: (persona: Omit<PersonaFilter, "id">) => void;
}

export function PersonaTemplatePicker({ onSelect }: PersonaTemplatePickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {templates.map((t) => (
        <button
          key={t.label}
          onClick={() => onSelect(t.persona)}
          className="px-3 py-1.5 rounded-full bg-section text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors border border-border-subtle"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
