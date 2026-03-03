"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { PipelineBoard } from "@/components/opportunities/pipeline-board";
import { PipelineStatsBar } from "@/components/opportunities/pipeline-stats-bar";
import { OpportunityFilters } from "@/components/opportunities/opportunity-filters";
import { useTeamMembers } from "@/hooks/use-team-members";
import { mockOpportunities } from "@/lib/mock-data/opportunities";
import type { Opportunity, OpportunityStage, OpportunityPriority } from "@/lib/types/opportunity";

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(mockOpportunities);
  const [stageFilter, setStageFilter] = useState<OpportunityStage | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState<string | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<OpportunityPriority | "all">("all");
  const { resolveMember } = useTeamMembers();

  const resolveOwnerName = useCallback(
    (id: string) => resolveMember(id)?.name ?? "Unknown",
    [resolveMember]
  );

  const handleMove = useCallback((id: string, newStage: OpportunityStage) => {
    setOpportunities((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const probability = newStage === "won" ? 100 : newStage === "lost" ? 0 : o.probability;
        return { ...o, stage: newStage, probability, updatedAt: new Date() };
      })
    );
  }, []);

  const filtered = opportunities.filter((o) => {
    if (stageFilter !== "all" && o.stage !== stageFilter) return false;
    if (ownerFilter !== "all" && o.ownerId !== ownerFilter) return false;
    if (priorityFilter !== "all" && o.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[18px] font-semibold text-ink">Opportunities</h1>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors">
          <Plus size={13} strokeWidth={2} />
          New Opportunity
        </button>
      </div>

      {/* Stats Bar */}
      <div className="mb-4">
        <PipelineStatsBar opportunities={opportunities} />
      </div>

      {/* Filters */}
      <div className="mb-4">
        <OpportunityFilters
          stageFilter={stageFilter}
          ownerFilter={ownerFilter}
          priorityFilter={priorityFilter}
          onStageChange={setStageFilter}
          onOwnerChange={setOwnerFilter}
          onPriorityChange={setPriorityFilter}
        />
      </div>

      {/* Kanban Board */}
      <PipelineBoard
        opportunities={filtered}
        resolveOwnerName={resolveOwnerName}
        onMove={handleMove}
      />
    </div>
  );
}
