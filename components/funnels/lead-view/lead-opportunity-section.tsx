"use client";

import { useEffect, useState } from "react";
import { Briefcase, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getOpportunity, listPipelines } from "@/lib/api/opportunities";
import type { OpportunityDetail, PipelineStage } from "@/lib/types/opportunity";
import { Section } from "./lead-section";

interface LeadOpportunitySectionProps {
  opportunityId: string | null;
  onConvert: () => void;
}

/** The "Opportunities" panel — shows the converted deal (value + probability
 *  ring + pipeline/stage) or a Convert CTA when the lead isn't converted yet. */
export function LeadOpportunitySection({ opportunityId, onConvert }: LeadOpportunitySectionProps) {
  const isAuthReady = useAuthReady();
  const [opp, setOpp] = useState<OpportunityDetail | null>(null);
  const [stage, setStage] = useState<PipelineStage | null>(null);
  const [pipelineName, setPipelineName] = useState<string>("");

  useEffect(() => {
    if (!isAuthReady || !opportunityId) {
      setOpp(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [detail, pipelines] = await Promise.all([getOpportunity(opportunityId), listPipelines()]);
        if (cancelled) return;
        setOpp(detail);
        const pipeline = pipelines.find((p) => p.id === detail.pipelineId);
        setPipelineName(pipeline?.name || "");
        setStage(pipeline?.stages.find((s) => s.id === detail.stageId) || null);
      } catch (err) {
        console.error("Failed to load opportunity:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthReady, opportunityId]);

  const prob = opp ? opp.probabilityOverride ?? stage?.defaultProbability ?? 0 : 0;
  const dash = (prob / 100) * 94.2;

  return (
    <Section icon={Briefcase} title="Opportunities" count={opportunityId ? 1 : 0}>
      {opportunityId && opp ? (
        <div className="rounded-xl border border-border-subtle bg-section/40 p-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[15px] font-semibold text-ink">
                {formatCurrency(opp.value, opp.currency, { compact: true })}
              </div>
              <div className="text-[10.5px] text-ink-muted mt-0.5">
                {prob}% · {opp.name}
              </div>
            </div>
            <svg width="30" height="30" viewBox="0 0 36 36" className="-rotate-90">
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
    </Section>
  );
}
