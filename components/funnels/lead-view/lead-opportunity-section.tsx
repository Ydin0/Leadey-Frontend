"use client";

import { useCallback, useEffect, useState } from "react";
import { Briefcase, Plus, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getOpportunity, listPipelines } from "@/lib/api/opportunities";
import { EditOpportunityModal } from "@/components/opportunities/edit-opportunity-modal";
import type { OpportunityDetail, PipelineStage } from "@/lib/types/opportunity";
import { Section } from "./lead-section";

interface LeadOpportunitySectionProps {
  opportunityId: string | null;
  onConvert: () => void;
  /** Refresh the lead after the opportunity is deleted (clears the link). */
  onChanged?: () => void;
}

/** The "Opportunities" panel — shows the converted deal (value + probability
 *  ring + pipeline/stage, with edit/delete) or a Convert CTA when unconverted. */
export function LeadOpportunitySection({ opportunityId, onConvert, onChanged }: LeadOpportunitySectionProps) {
  const isAuthReady = useAuthReady();
  const [opp, setOpp] = useState<OpportunityDetail | null>(null);
  const [stage, setStage] = useState<PipelineStage | null>(null);
  const [pipelineName, setPipelineName] = useState<string>("");
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    if (!opportunityId) {
      setOpp(null);
      return;
    }
    try {
      const [detail, pipelines] = await Promise.all([getOpportunity(opportunityId), listPipelines()]);
      setOpp(detail);
      const pipeline = pipelines.find((p) => p.id === detail.pipelineId);
      setPipelineName(pipeline?.name || "");
      setStage(pipeline?.stages.find((s) => s.id === detail.stageId) || null);
    } catch (err) {
      console.error("Failed to load opportunity:", err);
    }
  }, [opportunityId]);

  useEffect(() => {
    if (!isAuthReady) return;
    void load();
  }, [isAuthReady, load]);

  const prob = opp ? opp.probabilityOverride ?? stage?.defaultProbability ?? 0 : 0;
  const dash = (prob / 100) * 94.2;

  return (
    <Section icon={Briefcase} title="Opportunities" count={opportunityId ? 1 : 0}>
      {opportunityId && opp ? (
        <div className="group relative rounded-xl border border-border-subtle bg-section/40 p-3">
          <button
            onClick={() => setEditing(true)}
            title="Edit opportunity"
            className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-md text-ink-muted hover:bg-hover hover:text-ink opacity-0 group-hover:opacity-100 transition-all"
          >
            <Pencil size={12} />
          </button>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[15px] font-semibold text-ink">
                {formatCurrency(opp.value, opp.currency, { compact: true })}
              </div>
              <div className="text-[10.5px] text-ink-muted mt-0.5">
                {prob}% · {opp.name}
              </div>
            </div>
            <svg width="30" height="30" viewBox="0 0 36 36" className="-rotate-90 mr-7">
              <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-section)" strokeWidth="4" />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${dash} 94.2`}
              />
            </svg>
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            {pipelineName && (
              <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-section text-ink-muted">
                {pipelineName}
              </span>
            )}
            {stage && (
              <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-signal-blue text-signal-blue-text">
                {stage.label}
              </span>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={onConvert}
          className="flex items-center gap-2 w-full justify-center py-2.5 rounded-xl border border-dashed border-border-default text-[12px] text-ink-muted hover:text-ink-secondary hover:border-ink-muted transition-colors"
        >
          <Plus size={13} />
          Convert to opportunity
        </button>
      )}

      {editing && opportunityId && (
        <EditOpportunityModal
          opportunityId={opportunityId}
          onClose={() => setEditing(false)}
          onSaved={() => void load()}
          onDeleted={() => onChanged?.()}
        />
      )}
    </Section>
  );
}
