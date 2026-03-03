"use client";

import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { provisionPhoneLine, updatePhoneLine } from "@/lib/api/phone-lines";
import { StepIndicator } from "@/components/shared/step-indicator";
import { StepSelectCountry } from "./step-select-country";
import { StepSelectType } from "./step-select-type";
import { StepSelectBundle } from "./step-select-bundle";
import { StepSearchNumbers } from "./step-search-numbers";
import { StepReviewConfirm } from "./step-review-confirm";
import { StepAssignMember } from "./step-assign-member";
import type { ProvisionWizardData } from "@/lib/types/calling";

const steps = [
  { label: "Country" },
  { label: "Type" },
  { label: "Regulatory" },
  { label: "Search" },
  { label: "Review" },
  { label: "Assign" },
];

interface ProvisionWizardShellProps {
  onComplete: () => void;
}

export function ProvisionWizardShell({ onComplete }: ProvisionWizardShellProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState("");
  const [provisionedLineId, setProvisionedLineId] = useState<string | null>(null);
  const [data, setData] = useState<ProvisionWizardData>({
    country: null,
    type: null,
    bundleId: null,
    selectedNumber: null,
    assignedTo: null,
    friendlyName: "",
  });

  const canNext = (() => {
    switch (currentStep) {
      case 0: return data.country !== null;
      case 1: return data.type !== null;
      case 2: return data.bundleId !== null;
      case 3: return data.selectedNumber !== null;
      case 4: return true; // review is always valid
      case 5: return true; // assign is optional
      default: return false;
    }
  })();

  function handleNext() {
    if (!canNext) return;
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      // If going back from step after bundle and country doesn't need bundle, skip bundle step
      if (currentStep === 3 && data.country && !data.country.bundleRequired) {
        setCurrentStep(1);
      } else {
        setCurrentStep(currentStep - 1);
      }
    }
  }

  // Called by bundle step when country doesn't require it
  const handleBundleSkip = useCallback(() => {
    setData((prev) => ({ ...prev, bundleId: null }));
    setCurrentStep(3);
  }, []);

  async function handleConfirmAndProvision() {
    if (!data.selectedNumber || !data.country) return;

    setProvisioning(true);
    setProvisionError("");

    try {
      const line = await provisionPhoneLine({
        phoneNumber: data.selectedNumber.number,
        friendlyName: data.friendlyName || data.selectedNumber.number,
        country: data.country.name,
        countryCode: data.country.code,
        type: data.type || "local",
        monthlyCost: data.selectedNumber.monthlyCost,
        bundleId: data.bundleId,
      });

      setProvisionedLineId(line.id);
      // Provisioned successfully — move to assign step
      setCurrentStep(5);
    } catch (err) {
      setProvisionError(err instanceof Error ? err.message : "Provisioning failed.");
    } finally {
      setProvisioning(false);
    }
  }

  async function handleComplete() {
    // If a line was provisioned and assignment was made, update the line
    if (provisionedLineId && data.assignedTo) {
      try {
        await updatePhoneLine(provisionedLineId, {
          assignedTo: data.assignedTo,
          assignedToName: data.friendlyName || null,
        });
      } catch (err) {
        console.error("Failed to assign line:", err);
      }
    }
    onComplete();
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <StepIndicator steps={steps} currentStep={currentStep} />
      </div>

      {/* Step content */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-6">
        {currentStep === 0 && (
          <StepSelectCountry
            selected={data.country}
            onSelect={(country) => setData((prev) => ({ ...prev, country, type: null, bundleId: null, selectedNumber: null }))}
          />
        )}

        {currentStep === 1 && (
          <StepSelectType
            country={data.country}
            selected={data.type}
            onSelect={(type) => setData((prev) => ({ ...prev, type, selectedNumber: null }))}
          />
        )}

        {currentStep === 2 && (
          <StepSelectBundle
            country={data.country}
            selectedBundleId={data.bundleId}
            onSelect={(bundleId) => setData((prev) => ({ ...prev, bundleId }))}
            onSkip={handleBundleSkip}
          />
        )}

        {currentStep === 3 && (
          <StepSearchNumbers
            country={data.country}
            type={data.type}
            selected={data.selectedNumber}
            onSelect={(num) => setData((prev) => ({ ...prev, selectedNumber: num }))}
          />
        )}

        {currentStep === 4 && <StepReviewConfirm data={data} />}

        {currentStep === 5 && (
          <StepAssignMember
            assignedTo={data.assignedTo}
            friendlyName={data.friendlyName}
            onAssign={(id) => setData((prev) => ({ ...prev, assignedTo: id }))}
            onFriendlyNameChange={(name) => setData((prev) => ({ ...prev, friendlyName: name }))}
          />
        )}

        {provisionError && (
          <p className="text-[11px] text-signal-red-text text-center mt-4">{provisionError}</p>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 0 || provisioning}
          className="px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Back
        </button>

        <div className="flex items-center gap-2">
          {currentStep === 4 ? (
            <button
              type="button"
              onClick={handleConfirmAndProvision}
              disabled={provisioning}
              className="px-5 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {provisioning && <Loader2 size={13} className="animate-spin" />}
              Confirm &amp; Provision
            </button>
          ) : currentStep === 5 ? (
            <button
              type="button"
              onClick={handleComplete}
              className="px-5 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
            >
              Complete
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext}
              className="px-5 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
