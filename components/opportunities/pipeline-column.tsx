"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn, formatCurrency } from "@/lib/utils";
import { OpportunityCard } from "./opportunity-card";
import type { Opportunity, PipelineStage } from "@/lib/types/opportunity";

interface PipelineColumnProps {
  stage: PipelineStage;
  opportunities: Opportunity[];
  resolveCompanyName?: (opp: Opportunity) => string | null;
  resolveOwnerInitials?: (opp: Opportunity) => string | null;
}

/** Stage column on the kanban. Acts as a droppable surface; the cards
 *  inside live in a SortableContext so the user can drop the dragged
 *  card anywhere within the column (drop anywhere in the column → end). */
export function PipelineColumn({
  stage,
  opportunities,
  resolveCompanyName,
  resolveOwnerInitials,
}: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage:${stage.id}`,
    data: { type: "stage", stageId: stage.id },
  });

  const totalValue = opportunities.reduce((sum, o) => sum + Number(o.value), 0);

  const headerColor =
    stage.type === "won"
      ? "text-signal-green-text"
      : stage.type === "lost"
        ? "text-signal-red-text"
        : "text-ink";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-[280px] shrink-0 rounded-[14px] bg-section/40 border border-border-subtle transition-colors",
        isOver && "border-signal-blue-text/40 bg-signal-blue/10",
      )}
    >
      <header className="px-3 py-2.5 border-b border-border-subtle">
        <div className="flex items-center justify-between gap-2">
          <h3 className={cn("text-[12px] font-semibold uppercase tracking-wider", headerColor)}>
            {stage.label}
          </h3>
          <span className="text-[10px] text-ink-muted font-medium">
            {opportunities.length}
          </span>
        </div>
        <p className="text-[11px] text-ink-muted mt-0.5">
          {formatCurrency(totalValue, "USD", { compact: true })}
        </p>
      </header>

      <SortableContext
        items={opportunities.map((o) => o.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2 p-2 flex-1 min-h-[120px] overflow-y-auto">
          {opportunities.length === 0 ? (
            <div className="flex items-center justify-center min-h-[100px] text-[11px] text-ink-faint">
              Drop here
            </div>
          ) : (
            opportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opp={opp}
                stage={stage}
                companyName={resolveCompanyName?.(opp)}
                ownerInitials={resolveOwnerInitials?.(opp)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
