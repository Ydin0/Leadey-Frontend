"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { PipelineColumn } from "./pipeline-column";
import { OpportunityCard } from "./opportunity-card";
import type { Opportunity, Pipeline } from "@/lib/types/opportunity";

interface PipelineBoardProps {
  pipeline: Pipeline;
  opportunities: Opportunity[];
  /** Persist a stage column's order after a drop (move + reorder in one call).
   *  The parent does the optimistic update + rollback on error. */
  onReorder: (stageId: string, orderedIds: string[]) => Promise<void> | void;
  resolveCompanyName?: (opp: Opportunity) => string | null;
  resolveOwnerInitials?: (opp: Opportunity) => string | null;
  onEdit?: (oppId: string) => void;
}

const STAGE_PREFIX = "stage:";
type Containers = Record<string, string[]>;

/** Group opportunity ids into per-stage columns, ordered by sortOrder. */
function buildContainers(stages: Pipeline["stages"], opps: Opportunity[]): Containers {
  const map: Containers = {};
  for (const s of stages) map[s.id] = [];
  const sorted = [...opps].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  for (const o of sorted) (map[o.stageId] ||= []).push(o.id);
  return map;
}

function containerOf(containers: Containers, id: string): string | undefined {
  if (id.startsWith(STAGE_PREFIX)) return id.slice(STAGE_PREFIX.length);
  return Object.keys(containers).find((k) => containers[k].includes(id));
}

/** The kanban surface — one column per stage. Uses the dnd-kit multi-container
 *  pattern: cards move between columns live during the drag (onDragOver) and
 *  the final order is committed + persisted on drop (onDragEnd). Vertical
 *  reordering within a column is preserved via sortOrder.
 *
 *  Containers derive from props except while a drag is active, when a local
 *  override drives the live reordering (released back to props on drop). */
export function PipelineBoard({
  pipeline,
  opportunities,
  onReorder,
  resolveCompanyName,
  resolveOwnerInitials,
  onEdit,
}: PipelineBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragContainers, setDragContainers] = useState<Containers | null>(null);

  const oppById = useMemo(() => {
    const m = new Map<string, Opportunity>();
    for (const o of opportunities) m.set(o.id, o);
    return m;
  }, [opportunities]);

  const baseContainers = useMemo(
    () => buildContainers(pipeline.stages, opportunities),
    [pipeline.stages, opportunities],
  );
  const containers = dragContainers ?? baseContainers;

  // Cursor-accurate: the droppable under the pointer wins (fixes drops that
  // silently failed on full columns with corner-distance detection). Falls
  // back to rect intersection when the pointer is in a gap.
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const byPointer = pointerWithin(args);
    return byPointer.length ? byPointer : rectIntersection(args);
  }, []);

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
    setDragContainers(baseContainers); // snapshot to mutate during the drag
  }

  // Move the dragged card into the hovered column live (cross-column only —
  // within-column shuffling is handled visually by the sortable strategy and
  // committed on drop).
  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;
    setDragContainers((prev) => {
      const cur = prev ?? baseContainers;
      const from = containerOf(cur, activeIdStr);
      const to = overIdStr.startsWith(STAGE_PREFIX) ? overIdStr.slice(STAGE_PREFIX.length) : containerOf(cur, overIdStr);
      if (!from || !to || from === to) return cur;
      const fromItems = cur[from].filter((x) => x !== activeIdStr);
      const toItems = cur[to].filter((x) => x !== activeIdStr);
      const overIndex = overIdStr.startsWith(STAGE_PREFIX) ? toItems.length : toItems.indexOf(overIdStr);
      toItems.splice(overIndex < 0 ? toItems.length : overIndex, 0, activeIdStr);
      return { ...cur, [from]: fromItems, [to]: toItems };
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    const current = dragContainers ?? baseContainers;
    setActiveId(null);
    setDragContainers(null); // release back to props (parent updates them next)
    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;
    const to = overIdStr.startsWith(STAGE_PREFIX) ? overIdStr.slice(STAGE_PREFIX.length) : containerOf(current, overIdStr);
    if (!to) return;
    const items = current[to] || [];
    const oldIndex = items.indexOf(activeIdStr);
    let newIndex = overIdStr.startsWith(STAGE_PREFIX) ? items.length - 1 : items.indexOf(overIdStr);
    if (newIndex < 0) newIndex = items.length - 1;
    const finalItems = oldIndex >= 0 && oldIndex !== newIndex ? arrayMove(items, oldIndex, newIndex) : items;

    // Persist if the card changed stage (its props stageId differs from the
    // drop target) or changed position within the column.
    const opp = oppById.get(activeIdStr);
    const stageChanged = !!opp && opp.stageId !== to;
    if (stageChanged || oldIndex !== newIndex) {
      void onReorder(to, finalItems);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => { setActiveId(null); setDragContainers(null); }}
    >
      <div className="flex overflow-x-auto gap-3 pb-4">
        {pipeline.stages.map((stage) => {
          const ids = containers[stage.id] || [];
          const opps = ids.map((id) => oppById.get(id)).filter(Boolean) as Opportunity[];
          return (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              opportunities={opps}
              resolveCompanyName={resolveCompanyName}
              resolveOwnerInitials={resolveOwnerInitials}
              onEdit={onEdit}
            />
          );
        })}
      </div>
      <DragOverlay>
        {activeId && oppById.get(activeId) ? (
          <OpportunityCard
            opp={oppById.get(activeId)!}
            stage={pipeline.stages.find((s) => s.id === oppById.get(activeId)!.stageId)}
            companyName={resolveCompanyName?.(oppById.get(activeId)!)}
            ownerInitials={resolveOwnerInitials?.(oppById.get(activeId)!)}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
