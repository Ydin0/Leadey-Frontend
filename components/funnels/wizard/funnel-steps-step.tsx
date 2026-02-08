"use client";

import { Plus, X, Mail, Linkedin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FunnelStep, FunnelChannel } from "@/lib/types/funnel";

const channels: { value: FunnelChannel; icon: typeof Mail; label: string }[] = [
  { value: "email", icon: Mail, label: "Email" },
  { value: "linkedin", icon: Linkedin, label: "LinkedIn" },
  { value: "call", icon: Phone, label: "Call" },
];

interface FunnelStepsStepProps {
  steps: FunnelStep[];
  onChange: (steps: FunnelStep[]) => void;
}

export function FunnelStepsStep({ steps, onChange }: FunnelStepsStepProps) {
  function addStep() {
    const newStep: FunnelStep = {
      id: `new_${Date.now()}`,
      channel: "email",
      label: "",
      dayOffset: steps.length > 0 ? steps[steps.length - 1].dayOffset + 3 : 0,
    };
    onChange([...steps, newStep]);
  }

  function removeStep(index: number) {
    onChange(steps.filter((_, i) => i !== index));
  }

  function updateStep(index: number, updates: Partial<FunnelStep>) {
    onChange(steps.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  }

  return (
    <div>
      <h2 className="text-[16px] font-semibold text-ink mb-1">Sequence Steps</h2>
      <p className="text-[12px] text-ink-muted mb-6">Build your outreach sequence step by step</p>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="bg-surface rounded-[14px] border border-border-subtle p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Step {index + 1}</span>
              <button
                onClick={() => removeStep(index)}
                className="p-1 rounded-full hover:bg-hover transition-colors"
              >
                <X size={12} strokeWidth={1.5} className="text-ink-faint" />
              </button>
            </div>

            {/* Channel Toggle */}
            <div className="flex items-center gap-1 mb-3">
              {channels.map((ch) => (
                <button
                  key={ch.value}
                  onClick={() => updateStep(index, { channel: ch.value })}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium transition-colors",
                    step.channel === ch.value
                      ? "bg-ink text-on-ink"
                      : "bg-section text-ink-muted hover:text-ink-secondary"
                  )}
                >
                  <ch.icon size={11} strokeWidth={1.5} />
                  {ch.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              {/* Label */}
              <div>
                <label className="text-[10px] text-ink-muted block mb-1">Label</label>
                <input
                  type="text"
                  value={step.label}
                  onChange={(e) => updateStep(index, { label: e.target.value })}
                  placeholder="e.g. Intro Email"
                  className="w-full px-3 py-1.5 rounded-[8px] bg-section border border-border-subtle text-[11px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
                />
              </div>
              {/* Day Offset */}
              <div>
                <label className="text-[10px] text-ink-muted block mb-1">Day</label>
                <input
                  type="number"
                  min={0}
                  value={step.dayOffset}
                  onChange={(e) => updateStep(index, { dayOffset: parseInt(e.target.value) || 0 })}
                  className="w-16 px-2 py-1.5 rounded-[8px] bg-section border border-border-subtle text-[11px] text-ink text-center focus:outline-none focus:border-border-default"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addStep}
        className="flex items-center gap-1.5 mt-3 px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle"
      >
        <Plus size={13} strokeWidth={2} />
        Add Step
      </button>
    </div>
  );
}
