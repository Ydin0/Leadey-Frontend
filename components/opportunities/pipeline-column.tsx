"use client";

import { cn } from "@/lib/utils";
import { OpportunityCard } from "./opportunity-card";
import type { Opportunity, OpportunityStage, OpportunityStageInfo } from "@/lib/types/opportunity";

interface PipelineColumnProps {
  stageInfo: OpportunityStageInfo;
  opportunities: Opportunity[];
  resolveOwnerName: (id: string) => string;
  onMove: (id: string, stage: OpportunityStage) => void;
}

export function PipelineColumn({ stageInfo, opportunities, resolveOwnerName, onMove }: PipelineColumnProps) {
  const totalAnnual = opportunities.reduce((sum, o) => sum + o.annualValue, 0);

  return (
    <div
      className={cn(
        "min-w-[280px] w-[280px] shrink-0 rounded-[14px] p-2 flex flex-col",
        stageInfo.value === "won" && "bg-signal-green/20",
        stageInfo.value === "lost" && "bg-signal-red/20",
        stageInfo.value !== "won" && stageInfo.value !== "lost" && "bg-section/50"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[12px] font-semibold text-ink">{stageInfo.label}</h3>
          <span className="text-[10px] font-medium bg-surface text-ink-secondary rounded-full px-1.5 py-0.5">
            {opportunities.length}
          </span>
        </div>
        {totalAnnual > 0 && (
          <span className="text-[10px] text-ink-muted font-medium">
            ${(totalAnnual / 1000).toFixed(0)}k/yr
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
        {opportunities.map((opp) => (
          <OpportunityCard
            key={opp.id}
            opportunity={opp}
            ownerName={resolveOwnerName(opp.ownerId)}
            onMove={onMove}
          />
        ))}
        {opportunities.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <p className="text-[11px] text-ink-muted">No opportunities</p>
          </div>
        )}
      </div>
    </div>
  );
}
