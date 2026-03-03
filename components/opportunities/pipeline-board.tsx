"use client";

import { PipelineColumn } from "./pipeline-column";
import { OPPORTUNITY_STAGES } from "@/lib/types/opportunity";
import type { Opportunity, OpportunityStage } from "@/lib/types/opportunity";

interface PipelineBoardProps {
  opportunities: Opportunity[];
  resolveOwnerName: (id: string) => string;
  onMove: (id: string, stage: OpportunityStage) => void;
}

export function PipelineBoard({ opportunities, resolveOwnerName, onMove }: PipelineBoardProps) {
  return (
    <div className="flex overflow-x-auto gap-3 pb-4">
      {OPPORTUNITY_STAGES.map((stageInfo) => {
        const stageOpps = opportunities.filter((o) => o.stage === stageInfo.value);
        return (
          <PipelineColumn
            key={stageInfo.value}
            stageInfo={stageInfo}
            opportunities={stageOpps}
            resolveOwnerName={resolveOwnerName}
            onMove={onMove}
          />
        );
      })}
    </div>
  );
}
