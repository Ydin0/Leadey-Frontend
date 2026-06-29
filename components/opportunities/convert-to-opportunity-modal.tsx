"use client";

import { useEffect, useState } from "react";
import { Loader2, X, Briefcase } from "lucide-react";
import { useTeamMembers } from "@/hooks/use-team-members";
import { convertLead, listPipelines } from "@/lib/api/opportunities";
import type { Pipeline } from "@/lib/types/opportunity";

interface ConvertToOpportunityModalProps {
  leadId: string;
  /** The opportunity name — fixed to the lead's name (shown read-only). */
  defaultName?: string;
  onClose: () => void;
  /** Called after a successful conversion with the new opportunity id. */
  onConverted?: (oppId: string) => void;
}

export function ConvertToOpportunityModal({
  leadId,
  defaultName = "",
  onClose,
  onConverted,
}: ConvertToOpportunityModalProps) {
  const { members } = useTeamMembers();

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [pipelineId, setPipelineId] = useState<string>("");
  const [stageId, setStageId] = useState<string>("");
  // The opportunity is always named after the lead — fixed, not editable.
  const name = defaultName;
  const [value, setValue] = useState<string>("");
  const [expectedCloseDate, setExpectedCloseDate] = useState<string>("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listPipelines();
        if (cancelled) return;
        setPipelines(list);
        const def = list.find((p) => p.isDefault) || list[0];
        if (def) {
          setPipelineId(def.id);
          const firstOpen = def.stages.find((s) => s.type === "open") || def.stages[0];
          if (firstOpen) setStageId(firstOpen.id);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load pipelines");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Switch the stage picker to the new pipeline's first open stage when
  // the rep changes pipelines.
  useEffect(() => {
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    if (!pipeline) return;
    const firstOpen = pipeline.stages.find((s) => s.type === "open") || pipeline.stages[0];
    if (firstOpen) setStageId(firstOpen.id);
  }, [pipelineId, pipelines]);

  const activePipeline = pipelines.find((p) => p.id === pipelineId);

  async function handleSubmit() {
    if (!pipelineId || !stageId) return;
    if (!name.trim()) {
      setError("Give the opportunity a name");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const opp = await convertLead(leadId, {
        pipelineId,
        stageId,
        name: name.trim(),
        value: value.trim() ? Number(value) : undefined,
        expectedCloseDate: expectedCloseDate || undefined,
        ownerId: ownerId || undefined,
        notes: notes.trim() || undefined,
      });
      // The dedicated opportunity page is gone — let the caller decide where to
      // go (the lead view refreshes in place / navigates to the lead).
      onConverted?.(opp.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to convert lead");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-[14px] border border-border-subtle w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-signal-blue/15 text-signal-blue-text flex items-center justify-center">
              <Briefcase size={13} strokeWidth={1.5} />
            </span>
            <div>
              <h2 className="text-[14px] font-semibold text-ink">Convert to Opportunity</h2>
              <p className="text-[11px] text-ink-muted">Lead stays in the campaign — this just adds a deal.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-hover text-ink-muted">
            <X size={14} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center px-5 py-10">
            <Loader2 size={18} className="animate-spin text-ink-muted" />
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            <Field label="Opportunity name">
              <div
                className={`${inputClass} flex items-center text-ink-muted cursor-not-allowed select-none`}
                title="The opportunity is named after the lead and can't be changed"
              >
                {name || "—"}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Pipeline">
                <select
                  value={pipelineId}
                  onChange={(e) => setPipelineId(e.target.value)}
                  className={inputClass}
                >
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Stage">
                <select
                  value={stageId}
                  onChange={(e) => setStageId(e.target.value)}
                  className={inputClass}
                >
                  {activePipeline?.stages
                    .filter((s) => s.type === "open")
                    .map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Value (USD)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                  className={inputClass}
                />
              </Field>
              <Field label="Expected close">
                <input
                  type="date"
                  value={expectedCloseDate}
                  onChange={(e) => setExpectedCloseDate(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Owner">
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className={inputClass}
              >
                <option value="">Assign to me</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Notes">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything important about this deal so far?"
                className={`${inputClass} resize-none`}
              />
            </Field>

            {error && (
              <p className="text-[11px] text-signal-red-text">{error}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-subtle">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || loading || !pipelineId || !stageId}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
          >
            {submitting && <Loader2 size={11} className="animate-spin" />}
            Convert
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink outline-none focus:border-border-default placeholder:text-ink-faint";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
