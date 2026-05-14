"use client";

import { cn } from "@/lib/utils";
import { TEMPLATE_VARIABLES } from "@/lib/types/template";

interface VariableInserterProps {
  onInsert: (variable: string) => void;
}

export function VariableInserter({ onInsert }: VariableInserterProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-[9px] uppercase tracking-wider text-ink-faint font-medium mr-1">Insert:</span>
      {TEMPLATE_VARIABLES.map((v) => (
        <button
          key={v.key}
          type="button"
          onClick={() => onInsert(`{{${v.key}}}`)}
          className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-signal-blue/10 text-signal-blue-text hover:bg-signal-blue/20 transition-colors"
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
