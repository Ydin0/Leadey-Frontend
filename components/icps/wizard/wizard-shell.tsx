"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { StepIndicator } from "@/components/shared/step-indicator";
import { StepCompanyProfile } from "./step-company-profile";
import { StepPersonaTargeting } from "./step-persona-targeting";
import { StepSignalsKeywords } from "./step-signals-keywords";
import { StepEnrichmentRules } from "./step-enrichment-rules";
import type { ICP } from "@/lib/types/icp";

const steps = [
  { label: "Company Profile" },
  { label: "Personas" },
  { label: "Signals" },
  { label: "Rules" },
];

export function WizardShell() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<Partial<ICP>>({
    name: "",
    companyProfile: {
      industries: [],
      companySizeMin: 1,
      companySizeMax: 50000,
      fundingStages: [],
      geographies: [],
      excludedDomains: [],
    },
    personas: [],
    signalPreferences: {
      enabledSignals: [],
      keywords: [],
      technologies: [],
    },
    enrichmentRules: {
      globalBudget: 2000,
      companyRules: [],
      defaultRule: {
        mode: "auto",
        maxLeadsPerCompany: 10,
        onlyPersonas: true,
        prioritySeniority: ["VP", "Director"],
      },
      safetyThreshold: 80,
      notifyThreshold: 1000,
    },
  });

  function handleCreate() {
    // In production this would POST to the API
    // For now, redirect to the first mock ICP dashboard
    router.push("/dashboard/icps/icp_001");
  }

  return (
    <div>
      {/* Sticky Step Indicator */}
      <div className="sticky top-14 z-20 bg-page pt-4 pb-4 -mx-6 px-6 border-b border-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => router.push("/dashboard/icps")}
            className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            Back to ICPs
          </button>
          <span className="text-[11px] text-ink-faint">Step {currentStep + 1} of {steps.length}</span>
        </div>
        <StepIndicator steps={steps} currentStep={currentStep} />
      </div>

      {/* Step Content */}
      <div className="max-w-2xl mt-6">
        {currentStep === 0 && <StepCompanyProfile data={data} onChange={setData} />}
        {currentStep === 1 && <StepPersonaTargeting data={data} onChange={setData} />}
        {currentStep === 2 && <StepSignalsKeywords data={data} onChange={setData} />}
        {currentStep === 3 && <StepEnrichmentRules data={data} onChange={setData} />}
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
            onClick={handleCreate}
            className="px-5 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
          >
            Create ICP
          </button>
        )}
      </div>
    </div>
  );
}
