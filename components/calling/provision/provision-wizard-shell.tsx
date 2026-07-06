"use client";

import { useState } from "react";
import { Loader2, AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { autoAllocatePhoneLine, updatePhoneLine } from "@/lib/api/phone-lines";
import { StepIndicator } from "@/components/shared/step-indicator";
import { StepSelectCountry } from "./step-select-country";
import { StepSelectType } from "./step-select-type";
import { StepAssignMember } from "./step-assign-member";
import type {
  CountryOption,
  PhoneLineType,
  PhoneLine,
} from "@/lib/types/calling";

const steps = [
  { label: "Country" },
  { label: "Type" },
  { label: "Provision" },
  { label: "Assign" },
];

interface ProvisionWizardShellProps {
  onComplete: () => void;
}

export function ProvisionWizardShell({ onComplete }: ProvisionWizardShellProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [country, setCountry] = useState<CountryOption | null>(null);
  const [type, setType] = useState<PhoneLineType | null>(null);
  const [allocating, setAllocating] = useState(false);
  const [allocateError, setAllocateError] = useState<string | null>(null);
  const [line, setLine] = useState<PhoneLine | null>(null);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [friendlyName, setFriendlyName] = useState("");

  const canNext =
    (currentStep === 0 && country !== null) ||
    (currentStep === 1 && type !== null);

  async function handleAutoAllocate() {
    if (!country || !type) return;
    setAllocating(true);
    setAllocateError(null);
    try {
      const newLine = await autoAllocatePhoneLine({
        countryCode: country.code,
        country: country.name,
        type,
      });
      setLine(newLine);
      setCurrentStep(3);
    } catch (err: any) {
      setAllocateError(err?.message || "Failed to allocate a number.");
    } finally {
      setAllocating(false);
    }
  }

  async function handleComplete() {
    if (line) {
      // The typed name is the line's friendlyName (shown in the table);
      // assignment is a separate field. The server resolves assignedToName
      // from the user id, so we only send assignedTo here.
      const patch: { friendlyName?: string; assignedTo?: string } = {};
      if (friendlyName.trim()) patch.friendlyName = friendlyName.trim();
      if (assignedTo) patch.assignedTo = assignedTo;
      if (Object.keys(patch).length > 0) {
        try {
          await updatePhoneLine(line.id, patch);
        } catch (err) {
          console.error("Failed to finalize line:", err);
        }
      }
    }
    onComplete();
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <StepIndicator steps={steps} currentStep={currentStep} />
      </div>

      <div className="bg-surface rounded-[14px] border border-border-subtle p-6">
        {currentStep === 0 && (
          <StepSelectCountry
            selected={country}
            onSelect={(c) => {
              setCountry(c);
              setType(null);
            }}
          />
        )}

        {currentStep === 1 && (
          <StepSelectType
            country={country}
            selected={type}
            onSelect={(t) => setType(t)}
          />
        )}

        {currentStep === 2 && (
          <div className="flex flex-col items-center gap-5 py-6 text-center">
            {allocating ? (
              <>
                <Loader2 size={24} className="animate-spin text-ink-muted" />
                <div>
                  <p className="text-[14px] font-medium text-ink">
                    Reserving your number...
                  </p>
                  <p className="text-[12px] text-ink-muted mt-1">
                    Asking Twilio for an available {type} number in {country?.name}.
                  </p>
                </div>
              </>
            ) : allocateError ? (
              <>
                <div className="w-12 h-12 rounded-full bg-signal-red/10 flex items-center justify-center">
                  <AlertCircle size={20} className="text-signal-red-text" />
                </div>
                <div className="max-w-md">
                  <p className="text-[14px] font-medium text-signal-red-text mb-1">
                    Couldn&apos;t allocate a number
                  </p>
                  <p className="text-[12px] text-ink-secondary leading-relaxed">
                    {allocateError}
                  </p>
                  {/bundle/i.test(allocateError) && (
                    <Link
                      href="/dashboard/settings?tab=phone-lines"
                      className="inline-flex items-center gap-1 mt-3 text-[12px] text-accent hover:underline"
                    >
                      Go to Regulatory Bundles
                      <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-signal-blue/10 flex items-center justify-center">
                  <Sparkles size={20} className="text-signal-blue-text" />
                </div>
                <div className="max-w-md">
                  <p className="text-[14px] font-medium text-ink mb-1">
                    Ready to allocate
                  </p>
                  <p className="text-[12px] text-ink-secondary leading-relaxed">
                    We&apos;ll pick a random available {type} number in{" "}
                    <strong className="text-ink">{country?.name}</strong> and
                    provision it to your account. You can&apos;t pick a specific
                    number — Twilio reserves whatever&apos;s currently in inventory.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {currentStep === 3 && line && (
          <div className="space-y-5">
            <div className="bg-signal-green/10 rounded-[10px] border border-signal-green-text/20 p-4 text-center">
              <p className="text-[13px] font-semibold text-signal-green-text">
                {line.number} is yours
              </p>
              <p className="text-[12px] text-ink-secondary mt-0.5">
                Provisioned to {country?.name} · {type}
              </p>
            </div>
            <StepAssignMember
              assignedTo={assignedTo}
              friendlyName={friendlyName}
              onAssign={(id) => setAssignedTo(id)}
              onFriendlyNameChange={setFriendlyName}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0 || allocating || currentStep === 3}
          className="px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Back
        </button>

        <div className="flex items-center gap-2">
          {currentStep === 2 ? (
            <button
              type="button"
              onClick={handleAutoAllocate}
              disabled={allocating || !!line}
              className="px-5 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {allocating && <Loader2 size={13} className="animate-spin" />}
              {allocateError ? "Try again" : "Allocate a number"}
            </button>
          ) : currentStep === 3 ? (
            <button
              type="button"
              onClick={handleComplete}
              className="px-5 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
            >
              {assignedTo ? "Assign & finish" : "Finish (unassigned)"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => s + 1)}
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
