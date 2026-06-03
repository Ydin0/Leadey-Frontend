"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { FunnelStepsStep } from "@/components/funnels/wizard/funnel-steps-step";
import { updateFunnel } from "@/lib/api/funnels";
import type { Funnel, FunnelStep } from "@/lib/types/funnel";

interface EditCampaignModalProps {
  funnel: Funnel;
  onClose: () => void;
  onSaved?: (updated: Funnel) => void;
}

export function EditCampaignModal({ funnel, onClose, onSaved }: EditCampaignModalProps) {
  const [name, setName] = useState(funnel.name);
  const [description, setDescription] = useState(funnel.description ?? "");
  const [steps, setSteps] = useState<FunnelStep[]>(funnel.steps);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim().length > 0 && steps.length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateFunnel(funnel.id, {
        name: name.trim(),
        description,
        steps: steps.map((s) => ({
          channel: s.channel,
          label: s.label,
          dayOffset: s.dayOffset,
          subject: s.subject,
          emailBody: s.emailBody,
          action: s.action,
        })),
      });
      onSaved?.(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />

      <div className="relative bg-surface rounded-[14px] border border-border-subtle shadow-xl w-full max-w-2xl max-h-[88vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle sticky top-0 bg-surface rounded-t-[14px] z-10">
          <h2 className="text-[14px] font-semibold text-ink">Edit Campaign</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-hover transition-colors">
            <X size={16} strokeWidth={1.5} className="text-ink-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Name + description */}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium block mb-1">
                Campaign name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Campaign name"
                className="w-full px-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium block mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this campaign for?"
                className="w-full px-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default resize-none"
              />
            </div>
          </div>

          {/* Steps editor (reuses the wizard component) */}
          <div className="border-t border-border-subtle pt-4">
            <FunnelStepsStep steps={steps} onChange={setSteps} />
          </div>

          {/* Warning about progress clamping */}
          <p className="text-[10px] text-ink-faint">
            Changing steps re-numbers the sequence. Any lead currently past the new
            final step will be clamped to the last step.
          </p>

          {error && (
            <p className="text-[11px] text-signal-red-text">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-subtle sticky bottom-0 bg-surface rounded-b-[14px]">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
