"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { PipelineColumn } from "./pipeline-column";
import { OpportunityCard } from "./opportunity-card";
import type { Opportunity, Pipeline } from "@/lib/types/opportunity";

interface PipelineBoardProps {
  pipeline: Pipeline;
  opportunities: Opportunity[];
  /** Called when a card is dropped on a new stage. The parent does the
   *  optimistic update + rollback on error. */
  onMove: (oppId: string, toStageId: string) => Promise<void> | void;
  resolveCompanyName?: (opp: Opportunity) => string | null;
  resolveOwnerInitials?: (opp: Opportunity) => string | null;
}

/** The kanban surface. One column per stage, opportunities grouped by
 *  stage. Drag-drop wired with dnd-kit; the parent owns the source-of-
 *  truth and handles optimistic update / rollback. */
export function PipelineBoard({
  pipeline,
  opportunities,
  onMove,
  resolveCompanyName,
  resolveOwnerInitials,
}: PipelineBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const [activeOpp, setActiveOpp] = useState<Opportunity | null>(null);

  const byStage = useMemo(() => {
    const map = new Map<string, Opportunity[]>();
    for (const s of pipeline.stages) map.set(s.id, []);
    for (const o of opportunities) {
      const list = map.get(o.stageId);
      if (list) list.push(o);
    }
    return map;
  }, [pipeline.stages, opportunities]);

  const oppById = useMemo(() => {
    const m = new Map<string, Opportunity>();
    for (const o of opportunities) m.set(o.id, o);
    return m;
  }, [opportunities]);

  function handleDragStart(e: DragStartEvent) {
    const id = e.active.id as string;
    const opp = oppById.get(id);
    setActiveOpp(opp || null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveOpp(null);
    const { active, over } = e;
    if (!over) return;
    const opp = oppById.get(active.id as string);
    if (!opp) return;

    // The drop target is either a column (id = "stage:<stageId>") or
    // another card (in which case we look up the card's stage).
    let toStageId: string | null = null;
    const overData = over.data.current as { type?: string; stageId?: string; opp?: Opportunity } | undefined;
    if (overData?.type === "stage" && overData.stageId) {
      toStageId = overData.stageId;
    } else if (overData?.type === "opportunity" && overData.opp) {
      toStageId = overData.opp.stageId;
    }
    if (!toStageId || toStageId === opp.stageId) return;
    void onMove(opp.id, toStageId);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex overflow-x-auto gap-3 pb-4">
        {pipeline.stages.map((stage) => (
          <PipelineColumn
            key={stage.id}
            stage={stage}
            opportunities={byStage.get(stage.id) || []}
            resolveCompanyName={resolveCompanyName}
            resolveOwnerInitials={resolveOwnerInitials}
          />
        ))}
      </div>
      <DragOverlay>
        {activeOpp ? (
          <OpportunityCard
            opp={activeOpp}
            stage={pipeline.stages.find((s) => s.id === activeOpp.stageId)}
            companyName={resolveCompanyName?.(activeOpp)}
            ownerInitials={resolveOwnerInitials?.(activeOpp)}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
