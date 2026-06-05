"use client";

import { useEffect, useState } from "react";
import { Loader2, X, Briefcase, Trash2 } from "lucide-react";
import { useTeamMembers } from "@/hooks/use-team-members";
import {
  getOpportunity,
  listPipelines,
  updateOpportunity,
  deleteOpportunity,
} from "@/lib/api/opportunities";
import type { Pipeline } from "@/lib/types/opportunity";

interface EditOpportunityModalProps {
  opportunityId: string;
  onClose: () => void;
  /** Called after a successful save. */
  onSaved?: () => void;
  /** Called after the opportunity is deleted. */
  onDeleted?: () => void;
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

export function EditOpportunityModal({
  opportunityId,
  onClose,
  onSaved,
  onDeleted,
}: EditOpportunityModalProps) {
  const { members } = useTeamMembers();

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineId, setPipelineId] = useState("");
  const [pipelineName, setPipelineName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState("");
  const [stageId, setStageId] = useState("");
  const [value, setValue] = useState("");
  const [probability, setProbability] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [opp, list] = await Promise.all([getOpportunity(opportunityId), listPipelines()]);
        if (cancelled) return;
        setPipelines(list);
        setPipelineId(opp.pipelineId);
        setPipelineName(list.find((p) => p.id === opp.pipelineId)?.name || "");
        setName(opp.name);
        setStageId(opp.stageId);
        setValue(opp.value ? String(opp.value) : "");
        setProbability(opp.probabilityOverride != null ? String(opp.probabilityOverride) : "");
        setExpectedCloseDate(opp.expectedCloseDate || "");
        setOwnerId(opp.ownerId || "");
        setNotes(opp.notes || "");
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load opportunity");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  const activePipeline = pipelines.find((p) => p.id === pipelineId);

  async function handleSave() {
    if (!name.trim()) {
      setError("Give the opportunity a name");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateOpportunity(opportunityId, {
        name: name.trim(),
        stageId,
        value: value.trim() ? Number(value) : 0,
        probabilityOverride: probability.trim() ? Number(probability) : null,
        expectedCloseDate: expectedCloseDate || null,
        ownerId: ownerId || null,
        notes: notes.trim() || null,
      });
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save opportunity");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteOpportunity(opportunityId);
      onDeleted?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete opportunity");
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
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
              <h2 className="text-[14px] font-semibold text-ink">Edit opportunity</h2>
              <p className="text-[11px] text-ink-muted">{pipelineName || "Update the deal details"}</p>
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
            <Field label="Name *">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </Field>

            <Field label="Stage">
              <select value={stageId} onChange={(e) => setStageId(e.target.value)} className={inputClass}>
                {activePipeline?.stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                    {s.type !== "open" ? ` (${s.type})` : ""}
                  </option>
                ))}
              </select>
            </Field>

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
              <Field label="Probability %">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={probability}
                  onChange={(e) => setProbability(e.target.value)}
                  placeholder="Stage default"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Expected close">
                <input
                  type="date"
                  value={expectedCloseDate}
                  onChange={(e) => setExpectedCloseDate(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Owner">
                <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputClass}>
                  <option value="">Assign to me</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Notes">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${inputClass} resize-none`}
              />
            </Field>

            {error && <p className="text-[11px] text-signal-red-text">{error}</p>}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border-subtle">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-signal-red-text">Delete this opportunity?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] bg-signal-red-text text-on-ink text-[11px] font-medium hover:bg-signal-red-text/90 disabled:opacity-50"
              >
                {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="px-3 py-1.5 rounded-[20px] text-[11px] text-ink-muted hover:bg-hover"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={loading || submitting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-signal-red-text text-[11px] font-medium hover:bg-signal-red/10 transition-colors disabled:opacity-50"
            >
              <Trash2 size={12} />
              Delete
            </button>
          )}

          <div className="flex items-center gap-2">
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
              onClick={handleSave}
              disabled={submitting || loading || !stageId}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 size={11} className="animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
