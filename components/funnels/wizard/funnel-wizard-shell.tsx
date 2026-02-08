"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { StepIndicator } from "@/components/shared/step-indicator";
import { FunnelBasicsStep } from "./funnel-basics-step";
import { FunnelStepsStep } from "./funnel-steps-step";
import { FunnelSourcesStep } from "./funnel-sources-step";
import type { FunnelStep } from "@/lib/types/funnel";
import { createFunnel } from "@/lib/api/funnels";

const steps = [
  { label: "Basics" },
  { label: "Steps" },
  { label: "Sources" },
];

export function FunnelWizardShell() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [funnelSteps, setFunnelSteps] = useState<FunnelStep[]>([
    { id: "default_1", channel: "email", label: "Intro Email", dayOffset: 0 },
    { id: "default_2", channel: "linkedin", label: "LinkedIn Connect", dayOffset: 2 },
    { id: "default_3", channel: "email", label: "Follow-up Email", dayOffset: 5 },
  ]);
  const [selectedSources, setSelectedSources] = useState<("csv" | "signals" | "webhook" | "companies")[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (isCreating) return;
    if (!name.trim()) {
      setError("Funnel name is required.");
      return;
    }
    if (funnelSteps.length === 0) {
      setError("Add at least one sequence step.");
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      const funnel = await createFunnel({
        name: name.trim(),
        description: description.trim(),
        status: "draft",
        steps: funnelSteps.map((step) => ({
          channel: step.channel,
          label: step.label,
          dayOffset: step.dayOffset,
        })),
        sourceTypes: selectedSources,
      });

      router.push(`/dashboard/funnels/${funnel.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create funnel";
      setError(message);
      setIsCreating(false);
    }
  }

  return (
    <div>
      {/* Sticky Step Indicator */}
      <div className="sticky top-14 z-20 bg-page pt-4 pb-4 -mx-6 px-6 border-b border-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => router.push("/dashboard/funnels")}
            className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            Back to Funnels
          </button>
          <span className="text-[11px] text-ink-faint">Step {currentStep + 1} of {steps.length}</span>
        </div>
        <StepIndicator steps={steps} currentStep={currentStep} />
      </div>

      {/* Step Content */}
      <div className="max-w-2xl mt-6">
        {currentStep === 0 && (
          <FunnelBasicsStep
            name={name}
            description={description}
            onChange={(d) => { setName(d.name); setDescription(d.description); }}
          />
        )}
        {currentStep === 1 && (
          <FunnelStepsStep steps={funnelSteps} onChange={setFunnelSteps} />
        )}
        {currentStep === 2 && (
          <FunnelSourcesStep selectedSources={selectedSources} onChange={setSelectedSources} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 max-w-2xl">
        <button
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Back
        </button>
        {currentStep < steps.length - 1 ? (
          <button
            onClick={() => setCurrentStep((s) => Math.min(steps.length - 1, s + 1))}
            className="flex items-center gap-1.5 px-5 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
          >
            Next
            <ArrowRight size={14} strokeWidth={1.5} />
          </button>
        ) : (
          <button
            onClick={() => void handleCreate()}
            disabled={isCreating}
            className="px-5 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? "Creating..." : "Create Funnel"}
          </button>
        )}
      </div>
      {error && (
        <p className="max-w-2xl mt-3 text-[11px] text-signal-red-text">{error}</p>
      )}
    </div>
  );
}
