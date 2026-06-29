"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, Building2, Pencil } from "lucide-react";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { cn, formatCurrency, formatRelativeTime } from "@/lib/utils";
import type { Opportunity, PipelineStage } from "@/lib/types/opportunity";

interface OpportunityCardProps {
  opp: Opportunity;
  stage: PipelineStage | undefined;
  /** Optional company label (we don't always join on the kanban). */
  companyName?: string | null;
  /** Optional owner initials, when ownerId resolves to a known user. */
  ownerInitials?: string | null;
  /** Render flag used by the DragOverlay clone so it can drop its
   *  pointer-events / animation hooks. */
  isOverlay?: boolean;
  /** Open the full edit modal for this opportunity (hover affordance). */
  onEdit?: (oppId: string) => void;
}

export function OpportunityCard({
  opp,
  stage,
  companyName,
  ownerInitials,
  isOverlay,
  onEdit,
}: OpportunityCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: opp.id, data: { type: "opportunity", opp } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isOverlay ? 0.3 : 1,
  };

  const probability = opp.probabilityOverride ?? stage?.defaultProbability ?? 50;
  const closeDate = opp.expectedCloseDate
    ? new Date(opp.expectedCloseDate + "T00:00:00")
    : null;
  // Opportunities open their source lead in the Lead View (there's no longer a
  // dedicated opportunity page). Fall back to the pipeline if the lead is gone.
  const href =
    opp.sourceLeadId && opp.funnelId
      ? `/dashboard/funnels/${opp.funnelId}/leads/${opp.sourceLeadId}`
      : `/dashboard/opportunities`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative card-brand bg-surface rounded-[10px] p-3 cursor-grab active:cursor-grabbing select-none",
        isOverlay && "shadow-xl rotate-[1.5deg]",
      )}
    >
      {onEdit && !isOverlay && (
        <button
          type="button"
          // Stop the pointerdown from starting a drag, and the click from
          // following the card's Link — just open the edit modal in place.
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit(opp.id);
          }}
          title="Edit opportunity"
          className="absolute top-1.5 right-1.5 z-10 flex items-center justify-center w-6 h-6 rounded-md bg-surface border border-border-subtle text-ink-muted opacity-0 group-hover:opacity-100 hover:text-ink hover:bg-hover transition-opacity shadow-sm"
        >
          <Pencil size={11} />
        </button>
      )}
      <Link
        href={href}
        className="block"
        onClick={(e) => {
          if (isDragging) e.preventDefault();
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-[12px] font-medium text-ink leading-snug line-clamp-2 flex-1">
            {opp.name}
          </p>
          {ownerInitials && (
            <MemberAvatar
              id={opp.ownerId ?? ownerInitials}
              initials={ownerInitials}
              className="w-6 h-6 text-[9px]"
            />
          )}
        </div>

        {companyName && (
          <div className="flex items-center gap-1 text-[10px] text-ink-muted mb-2 truncate">
            <Building2 size={10} className="shrink-0" />
            <span className="truncate">{companyName}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-ink">
            {formatCurrency(opp.value, opp.currency, { compact: true })}
          </p>
          <span className="text-[10px] text-ink-muted">{probability}%</span>
        </div>

        {closeDate && (
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-ink-muted">
            <Calendar size={10} />
            <span>
              {closeDate.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="text-ink-faint">·</span>
            <span>{formatRelativeTime(opp.updatedAt)}</span>
          </div>
        )}
      </Link>
    </div>
  );
}
