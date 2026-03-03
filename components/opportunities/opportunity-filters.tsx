"use client";

import { cn } from "@/lib/utils";
import { OPPORTUNITY_STAGES } from "@/lib/types/opportunity";
import type { OpportunityStage, OpportunityPriority } from "@/lib/types/opportunity";
import { useTeamMembers } from "@/hooks/use-team-members";

interface OpportunityFiltersProps {
  stageFilter: OpportunityStage | "all";
  ownerFilter: string | "all";
  priorityFilter: OpportunityPriority | "all";
  onStageChange: (value: OpportunityStage | "all") => void;
  onOwnerChange: (value: string | "all") => void;
  onPriorityChange: (value: OpportunityPriority | "all") => void;
}

export function OpportunityFilters({
  stageFilter,
  ownerFilter,
  priorityFilter,
  onStageChange,
  onOwnerChange,
  onPriorityChange,
}: OpportunityFiltersProps) {
  const { members } = useTeamMembers();

  const pillClass = (active: boolean) =>
    cn(
      "px-3 py-1.5 rounded-[20px] text-[11px] font-medium transition-colors border",
      active
        ? "bg-ink text-on-ink border-ink"
        : "bg-section text-ink-secondary border-border-subtle hover:bg-hover"
    );

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Stage filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mr-1">Stage</span>
        <button className={pillClass(stageFilter === "all")} onClick={() => onStageChange("all")}>All</button>
        {OPPORTUNITY_STAGES.map((s) => (
          <button key={s.value} className={pillClass(stageFilter === s.value)} onClick={() => onStageChange(s.value)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Owner filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mr-1">Owner</span>
        <button className={pillClass(ownerFilter === "all")} onClick={() => onOwnerChange("all")}>All</button>
        {members
          .filter((m) => m.status === "active")
          .map((m) => (
            <button key={m.id} className={pillClass(ownerFilter === m.id)} onClick={() => onOwnerChange(m.id)}>
              {m.name.split(" ")[0]}
            </button>
          ))}
      </div>

      {/* Priority filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mr-1">Priority</span>
        <button className={pillClass(priorityFilter === "all")} onClick={() => onPriorityChange("all")}>All</button>
        {(["high", "medium", "low"] as const).map((p) => (
          <button key={p} className={pillClass(priorityFilter === p)} onClick={() => onPriorityChange(p)}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
