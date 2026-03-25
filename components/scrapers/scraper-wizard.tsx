"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { StepIndicator } from "@/components/shared/step-indicator";
import { WizardStepKeywords } from "./wizard-step-keywords";
import { WizardStepFrequency } from "./wizard-step-frequency";
import type { ScraperFrequency, JobSeniority, RemoteFilter } from "@/lib/types/scraper";
import type { ScraperAssignmentRow } from "@/lib/api/scrapers";

const STEPS = [
  { label: "Job Titles & Filters" },
  { label: "Schedule & Limits" },
];

export interface WizardData {
  scraperId: string;
  scraperName: string;
  keywords: string[];
  excludedKeywords: string[];
  keywordMatchMode: "any" | "all";
  countries: string[];
  languages: string[];
  jobSeniority: JobSeniority[];
  remoteFilter: RemoteFilter;
  frequency: ScraperFrequency;
  lookbackDays: number;
  maxSignalsPerRun: number;
  minSignalScore: number;
  onlyDecisionMakers: boolean;
  dedupeCompanies: boolean;
  includeRemoteRoles: boolean;
  notifyOnHighIntent: boolean;
}

function buildInitialData(): WizardData {
  return {
    scraperId: "scraper_job_board",
    scraperName: "Job Board Monitor",
    keywords: [],
    excludedKeywords: [],
    keywordMatchMode: "any",
    countries: [],
    languages: ["English"],
    jobSeniority: [],
    remoteFilter: "include",
    frequency: "daily",
    lookbackDays: 7,
    maxSignalsPerRun: 100,
    minSignalScore: 50,
    onlyDecisionMakers: false,
    dedupeCompanies: true,
    includeRemoteRoles: true,
    notifyOnHighIntent: true,
  };
}

interface ScraperWizardProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: Partial<ScraperAssignmentRow>) => Promise<void>;
}

export function ScraperWizard({ open, onClose, onCreate }: ScraperWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<WizardData>(buildInitialData);
  const [creating, setCreating] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setData(buildInitialData());
      setCreating(false);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const updateData = useCallback(
    (updates: Partial<WizardData>) => setData((prev) => ({ ...prev, ...updates })),
    []
  );

  const canNext =
    currentStep === 0
      ? data.keywords.length > 0 && data.countries.length > 0
      : true;

  async function handleCreate() {
    setCreating(true);
    try {
      await onCreate({
        scraperId: data.scraperId,
        scraperName: data.scraperName,
        keywords: data.keywords,
        excludedKeywords: data.excludedKeywords,
        keywordMatchMode: data.keywordMatchMode,
        countries: data.countries,
        languages: data.languages,
        jobSeniority: data.jobSeniority,
        remoteFilter: data.remoteFilter,
        frequency: data.frequency,
        lookbackDays: data.lookbackDays,
        maxSignalsPerRun: data.maxSignalsPerRun,
        minSignalScore: data.minSignalScore,
        onlyDecisionMakers: data.onlyDecisionMakers,
        dedupeCompanies: data.dedupeCompanies,
        includeRemoteRoles: data.includeRemoteRoles,
        notifyOnHighIntent: data.notifyOnHighIntent,
      });
      onClose();
    } catch {
      setCreating(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] bg-surface rounded-[14px] border border-border-subtle shadow-xl flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border-subtle">
          <StepIndicator steps={STEPS} currentStep={currentStep} />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-hover transition-colors text-ink-muted"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {currentStep === 0 && (
            <WizardStepKeywords
              data={data}
              onChange={updateData}
            />
          )}
          {currentStep === 1 && (
            <WizardStepFrequency
              data={data}
              onChange={updateData}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle">
          <button
            onClick={() => (currentStep === 0 ? onClose() : setCurrentStep((s) => s - 1))}
            className="px-4 py-2 rounded-[20px] text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors"
          >
            {currentStep === 0 ? "Cancel" : "Back"}
          </button>
          {currentStep < 1 ? (
            <button
              disabled={!canNext}
              onClick={() => setCurrentStep((s) => s + 1)}
              className="px-5 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              disabled={creating}
              onClick={handleCreate}
              className="px-5 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {creating ? "Creating..." : "Create Scraper"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
