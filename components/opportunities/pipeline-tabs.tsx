"use client";

import { cn } from "@/lib/utils";
import type { Pipeline } from "@/lib/types/opportunity";

interface PipelineTabsProps {
  pipelines: Pipeline[];
  activePipelineId: string | null;
  onSelect: (pipelineId: string) => void;
}

/** Horizontal tab bar above the kanban — switches the active pipeline.
 *  Hidden when only one pipeline exists (most orgs in v1). */
export function PipelineTabs({ pipelines, activePipelineId, onSelect }: PipelineTabsProps) {
  if (pipelines.length <= 1) return null;
  return (
    <div className="flex items-center gap-1 border-b border-border-subtle mb-4">
      {pipelines.map((p) => {
        const active = p.id === activePipelineId;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={cn(
              "px-3 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors",
              active
                ? "border-ink text-ink"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {p.name}
            {p.isDefault && (
              <span className="ml-1.5 text-[9px] text-ink-faint uppercase tracking-wider">
                default
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
