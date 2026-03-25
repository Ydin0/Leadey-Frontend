"use client";

import { Clock, Filter, Shield, Zap } from "lucide-react";
import type { ScraperFrequency, RemoteFilter, JobSeniority } from "@/lib/types/scraper";

export interface WizardFrequencyData {
  frequency: ScraperFrequency;
  lookbackDays: number;
  maxSignalsPerRun: number;
  minSignalScore: number;
  onlyDecisionMakers: boolean;
  dedupeCompanies: boolean;
  includeRemoteRoles: boolean;
  notifyOnHighIntent: boolean;
  // carried from previous step for summary
  keywords: string[];
  countries: string[];
  jobSeniority: JobSeniority[];
  remoteFilter: RemoteFilter;
}

interface WizardStepFrequencyProps {
  data: WizardFrequencyData;
  onChange: (updates: Partial<WizardFrequencyData>) => void;
}

const COUNTRY_LABELS: Record<string, string> = {
  US: "United States", GB: "United Kingdom", CA: "Canada", DE: "Germany",
  FR: "France", AU: "Australia", NL: "Netherlands", IE: "Ireland",
  SE: "Sweden", IN: "India", SG: "Singapore", IL: "Israel",
};

export function WizardStepFrequency({ data, onChange }: WizardStepFrequencyProps) {
  return (
    <div className="space-y-6">
      {/* Schedule */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} strokeWidth={1.5} className="text-ink-muted" />
          <span className="text-[12px] font-medium text-ink">Schedule</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
              Frequency
            </label>
            <div className="flex gap-1">
              {(["daily", "weekly"] as ScraperFrequency[]).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => onChange({ frequency: freq })}
                  className={`px-3 py-1.5 rounded-[20px] text-[11px] font-medium transition-colors capitalize ${
                    data.frequency === freq
                      ? "bg-ink text-on-ink"
                      : "bg-section text-ink-secondary hover:bg-hover"
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>
          <NumberField
            label="Lookback days"
            hint="How far back to search for job postings"
            value={data.lookbackDays}
            onChange={(v) => onChange({ lookbackDays: v })}
            min={1}
            max={90}
          />
        </div>
      </div>

      {/* Limits */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} strokeWidth={1.5} className="text-ink-muted" />
          <span className="text-[12px] font-medium text-ink">Limits & Filtering</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField
            label="Max results per run"
            hint="Cap total job listings returned per run"
            value={data.maxSignalsPerRun}
            onChange={(v) => onChange({ maxSignalsPerRun: v })}
            min={1}
            max={500}
          />
          <NumberField
            label="Min signal score (0-100)"
            hint="Only keep results scoring above this threshold"
            value={data.minSignalScore}
            onChange={(v) => onChange({ minSignalScore: v })}
            min={0}
            max={100}
          />
        </div>
      </div>

      {/* Guardrails */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={14} strokeWidth={1.5} className="text-ink-muted" />
          <span className="text-[12px] font-medium text-ink">Guardrails</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Toggle
            label="Only decision makers"
            description="Filter results to senior / decision-maker titles"
            checked={data.onlyDecisionMakers}
            onChange={(v) => onChange({ onlyDecisionMakers: v })}
          />
          <Toggle
            label="Dedupe companies"
            description="Keep only one result per company per run"
            checked={data.dedupeCompanies}
            onChange={(v) => onChange({ dedupeCompanies: v })}
          />
          <Toggle
            label="Include remote roles"
            description="Include roles tagged as remote or work-from-home"
            checked={data.includeRemoteRoles}
            onChange={(v) => onChange({ includeRemoteRoles: v })}
          />
          <Toggle
            label="Notify on high intent"
            description="Get notified when high-scoring signals are found"
            checked={data.notifyOnHighIntent}
            onChange={(v) => onChange({ notifyOnHighIntent: v })}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="bg-section rounded-[14px] border border-border-subtle p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} strokeWidth={1.5} className="text-signal-blue-text" />
          <span className="text-[12px] font-medium text-ink">Summary</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <SummaryStat label="Job titles" value={data.keywords.length} />
          <SummaryStat label="Countries" value={data.countries.length} />
          <SummaryStat label="Seniority" value={data.jobSeniority.length || "All"} />
          <SummaryStat label="Max results" value={data.maxSignalsPerRun} />
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {data.countries.map((c) => (
            <span key={c} className="text-[10px] text-ink-secondary bg-surface px-2 py-0.5 rounded-full border border-border-subtle">
              {COUNTRY_LABELS[c] || c}
            </span>
          ))}
        </div>
        <div className="text-[10px] text-ink-muted">
          Runs <span className="font-medium text-ink-secondary">{data.frequency}</span>
          {" "}&middot; searches for{" "}
          <span className="font-medium text-ink-secondary">
            {data.keywords.slice(0, 3).join(", ")}{data.keywords.length > 3 ? ` +${data.keywords.length - 3} more` : ""}
          </span>
          {data.countries.length > 0 && (
            <>
              {" "}in{" "}
              <span className="font-medium text-ink-secondary">
                {data.countries.slice(0, 2).map((c) => COUNTRY_LABELS[c] || c).join(", ")}
                {data.countries.length > 2 ? ` +${data.countries.length - 2} more` : ""}
              </span>
            </>
          )}
          {data.remoteFilter !== "include" && (
            <> &middot; <span className="font-medium text-ink-secondary">{data.remoteFilter === "only" ? "remote only" : "on-site only"}</span></>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function NumberField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
        {label}
      </label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
        className="w-24 px-2 py-1.5 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink text-center outline-none focus:border-signal-blue-text/30"
      />
      <p className="text-[10px] text-ink-faint mt-1">{hint}</p>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-[10px] hover:bg-hover/50 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-3.5 h-3.5 rounded border-border-subtle accent-signal-blue-text"
      />
      <div>
        <span className="text-[11px] font-medium text-ink block">{label}</span>
        <span className="text-[10px] text-ink-faint">{description}</span>
      </div>
    </label>
  );
}

function SummaryStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-[16px] font-semibold text-ink">{value}</div>
      <div className="text-[10px] text-ink-muted">{label}</div>
    </div>
  );
}
