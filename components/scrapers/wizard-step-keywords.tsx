"use client";

import { TagInput } from "@/components/shared/tag-input";
import type { JobSeniority, RemoteFilter } from "@/lib/types/scraper";

export interface WizardKeywordsData {
  keywords: string[];
  excludedKeywords: string[];
  keywordMatchMode: "any" | "all";
  countries: string[];
  languages: string[];
  jobSeniority: JobSeniority[];
  remoteFilter: RemoteFilter;
}

interface WizardStepKeywordsProps {
  data: WizardKeywordsData;
  onChange: (updates: Partial<WizardKeywordsData>) => void;
}

const SENIORITY_OPTIONS: { value: JobSeniority; label: string }[] = [
  { value: "intern", label: "Intern" },
  { value: "entry", label: "Entry" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "principal", label: "Principal" },
  { value: "staff", label: "Staff" },
  { value: "c_level", label: "C-Level" },
];

const REMOTE_OPTIONS: { value: RemoteFilter; label: string; description: string }[] = [
  { value: "include", label: "All jobs", description: "Both remote and on-site" },
  { value: "only", label: "Remote only", description: "Only remote positions" },
  { value: "exclude", label: "On-site only", description: "Exclude remote positions" },
];

const COUNTRY_SUGGESTIONS = [
  "US", "GB", "CA", "DE", "FR", "AU", "NL", "IE", "SE", "IN", "SG", "IL",
];

const COUNTRY_LABELS: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  DE: "Germany",
  FR: "France",
  AU: "Australia",
  NL: "Netherlands",
  IE: "Ireland",
  SE: "Sweden",
  IN: "India",
  SG: "Singapore",
  IL: "Israel",
  ES: "Spain",
  IT: "Italy",
  BR: "Brazil",
  JP: "Japan",
  KR: "South Korea",
  MX: "Mexico",
  AE: "UAE",
  CH: "Switzerland",
};

export function WizardStepKeywords({ data, onChange }: WizardStepKeywordsProps) {
  function toggleSeniority(level: JobSeniority) {
    const isSelected = data.jobSeniority.includes(level);
    onChange({
      jobSeniority: isSelected
        ? data.jobSeniority.filter((s) => s !== level)
        : [...data.jobSeniority, level],
    });
  }

  return (
    <div className="space-y-6">
      {/* Powered by TheirStack notice */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-signal-blue/5 border border-signal-blue-text/10">
        <span className="text-[10px] text-signal-blue-text font-medium">
          Powered by TheirStack — searches across all major job boards simultaneously
        </span>
      </div>

      {/* Job Titles */}
      <div>
        <TagInput
          label="Job Titles & Roles"
          tags={data.keywords}
          onChange={(keywords) => onChange({ keywords })}
          placeholder="e.g. SDR, Account Executive, Sales Engineer"
          suggestions={[
            "SDR", "BDR", "Account Executive", "Sales Engineer", "Sales Manager",
            "VP Sales", "Head of Sales", "CRO", "Revenue Operations",
            "Customer Success Manager", "Solutions Engineer", "Sales Development",
          ]}
        />
        <p className="text-[10px] text-ink-faint mt-1.5 leading-relaxed">
          The roles / titles you want to track hiring for. Each title becomes a separate search across all job boards.
        </p>
        {data.keywords.length === 0 && (
          <p className="text-[10px] text-signal-red-text mt-1">At least one job title is required.</p>
        )}
      </div>

      {/* Countries */}
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
          Countries
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {COUNTRY_SUGGESTIONS.map((code) => {
            const isSelected = data.countries.includes(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() =>
                  onChange({
                    countries: isSelected
                      ? data.countries.filter((c) => c !== code)
                      : [...data.countries, code],
                  })
                }
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border ${
                  isSelected
                    ? "bg-signal-blue-text/10 text-signal-blue-text border-signal-blue-text/30"
                    : "bg-section text-ink-secondary border-border-subtle hover:bg-hover"
                }`}
              >
                {COUNTRY_LABELS[code] || code}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-ink-faint leading-relaxed">
          Filter results to jobs in these countries. Uses ISO country codes.
        </p>
        {data.countries.length === 0 && (
          <p className="text-[10px] text-signal-red-text mt-1">Select at least one country.</p>
        )}
      </div>

      {/* Seniority */}
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
          Seniority level
        </label>
        <div className="flex flex-wrap gap-1.5">
          {SENIORITY_OPTIONS.map((opt) => {
            const isSelected = data.jobSeniority.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleSeniority(opt.value)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border ${
                  isSelected
                    ? "bg-signal-blue-text/10 text-signal-blue-text border-signal-blue-text/30"
                    : "bg-section text-ink-secondary border-border-subtle hover:bg-hover"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-ink-faint mt-1.5">
          {data.jobSeniority.length === 0
            ? "No filter applied — all seniority levels will be included."
            : `Filtering to: ${data.jobSeniority.join(", ")}`}
        </p>
      </div>

      {/* Remote Filter */}
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
          Remote preference
        </label>
        <div className="flex gap-1">
          {REMOTE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ remoteFilter: opt.value })}
              className={`px-3 py-1.5 rounded-[20px] text-[11px] font-medium transition-colors ${
                data.remoteFilter === opt.value
                  ? "bg-ink text-on-ink"
                  : "bg-section text-ink-secondary hover:bg-hover"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Excluded Titles */}
        <div>
          <TagInput
            label="Excluded Terms"
            tags={data.excludedKeywords}
            onChange={(excludedKeywords) => onChange({ excludedKeywords })}
            placeholder="e.g. intern, contract, part-time"
            suggestions={["intern", "internship", "contract", "part-time", "freelance", "volunteer", "temporary"]}
          />
        </div>

        {/* Keyword Match Mode */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
            Title match mode
          </label>
          <div className="flex gap-1">
            {(["any", "all"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onChange({ keywordMatchMode: mode })}
                className={`px-3 py-1.5 rounded-[20px] text-[11px] font-medium transition-colors ${
                  data.keywordMatchMode === mode
                    ? "bg-ink text-on-ink"
                    : "bg-section text-ink-secondary hover:bg-hover"
                }`}
              >
                Match {mode === "any" ? "Any" : "All"}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-ink-faint mt-1.5">
            {data.keywordMatchMode === "any"
              ? "Jobs matching any title will be included."
              : "Only jobs matching all titles will be included."}
          </p>
        </div>
      </div>

      {/* Languages */}
      <div>
        <TagInput
          label="Languages"
          tags={data.languages}
          onChange={(languages) => onChange({ languages })}
          placeholder="e.g. English"
          suggestions={["English", "Spanish", "French", "German", "Portuguese", "Dutch", "Italian"]}
        />
      </div>
    </div>
  );
}
