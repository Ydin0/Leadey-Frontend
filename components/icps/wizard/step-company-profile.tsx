"use client";

import { useState } from "react";
import { MultiSelectPills } from "@/components/shared/multi-select-pills";
import { RangeWithPresets } from "@/components/shared/range-slider";
import type { ICP, FundingStage } from "@/lib/types/icp";
import { cn } from "@/lib/utils";

const industryGroups: Record<string, string[]> = {
  Technology: ["SaaS", "DevTools", "FinTech", "AI/ML", "Cybersecurity", "Infrastructure"],
  Healthcare: ["HealthTech", "BioTech", "MedTech", "Digital Health"],
  Finance: ["Banking", "Insurance", "Wealth Management", "Payments"],
  Services: ["Consulting", "Recruiting", "Legal Tech", "MarTech"],
};

const companySizePresets = [
  { label: "Startup (1-50)", min: 1, max: 50 },
  { label: "SMB (51-200)", min: 51, max: 200 },
  { label: "Mid-Market (201-1000)", min: 201, max: 1000 },
  { label: "Enterprise (1000+)", min: 1000, max: 50000 },
];

const allFundingStages: FundingStage[] = [
  "Pre-Seed", "Seed", "Series A", "Series B", "Series C", "Series D+", "Public", "Bootstrapped",
];

const regionGroups: Record<string, string[]> = {
  Americas: ["United States", "Canada", "Brazil", "Mexico"],
  EMEA: ["United Kingdom", "Germany", "France", "Netherlands", "Israel"],
  APAC: ["Australia", "Japan", "Singapore", "India", "South Korea"],
};

interface StepCompanyProfileProps {
  data: Partial<ICP>;
  onChange: (data: Partial<ICP>) => void;
}

export function StepCompanyProfile({ data, onChange }: StepCompanyProfileProps) {
  const [showRevenue, setShowRevenue] = useState(
    !!(data.companyProfile?.revenueMin || data.companyProfile?.revenueMax)
  );

  const profile = data.companyProfile || {
    industries: [],
    companySizeMin: 1,
    companySizeMax: 50000,
    fundingStages: [],
    geographies: [],
    excludedDomains: [],
  };

  function updateProfile(partial: Partial<typeof profile>) {
    onChange({ ...data, companyProfile: { ...profile, ...partial } });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold text-ink mb-1">Who are you targeting?</h2>
        <p className="text-[12px] text-ink-muted">Define the company profile for your ideal customer</p>
      </div>

      {/* ICP Name */}
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">ICP Name</label>
        <input
          type="text"
          value={data.name || ""}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="e.g. Mid-Market SaaS RevOps"
          className="w-full px-3 py-2 rounded-[10px] bg-section text-[13px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30 placeholder:text-ink-faint"
        />
      </div>

      {/* Industry */}
      <MultiSelectPills
        label="Industry"
        options={[]}
        grouped={industryGroups}
        selected={profile.industries}
        onChange={(industries) => updateProfile({ industries })}
        placeholder="Search industries..."
      />

      {/* Company Size */}
      <RangeWithPresets
        label="Company Size"
        presets={companySizePresets}
        selectedMin={profile.companySizeMin}
        selectedMax={profile.companySizeMax}
        onChangeMin={(companySizeMin) => updateProfile({ companySizeMin })}
        onChangeMax={(companySizeMax) => updateProfile({ companySizeMax })}
      />

      {/* Funding Stage */}
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">Funding Stage</label>
        <div className="flex flex-wrap gap-1.5">
          {allFundingStages.map((stage) => (
            <button
              key={stage}
              onClick={() => {
                const next = profile.fundingStages.includes(stage)
                  ? profile.fundingStages.filter((s) => s !== stage)
                  : [...profile.fundingStages, stage];
                updateProfile({ fundingStages: next });
              }}
              className={cn(
                "px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors border",
                profile.fundingStages.includes(stage)
                  ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                  : "bg-surface text-ink-secondary border-border-subtle hover:bg-hover"
              )}
            >
              {stage}
            </button>
          ))}
        </div>
      </div>

      {/* Geography */}
      <MultiSelectPills
        label="Geography"
        options={[]}
        grouped={regionGroups}
        selected={profile.geographies}
        onChange={(geographies) => updateProfile({ geographies })}
        placeholder="Search countries..."
      />

      {/* Revenue Range (optional) */}
      <div>
        <button
          onClick={() => setShowRevenue(!showRevenue)}
          className="flex items-center gap-2 text-[11px] text-ink-muted hover:text-ink transition-colors"
        >
          <div className={cn("w-8 h-4 rounded-full transition-colors relative", showRevenue ? "bg-signal-blue-text" : "bg-section")}>
            <div className={cn("w-3 h-3 rounded-full bg-surface absolute top-0.5 transition-all", showRevenue ? "left-4.5" : "left-0.5")} />
          </div>
          Revenue range (optional)
        </button>
        {showRevenue && (
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1">
              <label className="text-[10px] text-ink-faint mb-1 block">Min ARR</label>
              <input
                type="text"
                value={profile.revenueMin || ""}
                onChange={(e) => updateProfile({ revenueMin: Number(e.target.value) || undefined })}
                placeholder="$0"
                className="w-full px-3 py-1.5 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle"
              />
            </div>
            <span className="text-ink-faint mt-4">&ndash;</span>
            <div className="flex-1">
              <label className="text-[10px] text-ink-faint mb-1 block">Max ARR</label>
              <input
                type="text"
                value={profile.revenueMax || ""}
                onChange={(e) => updateProfile({ revenueMax: Number(e.target.value) || undefined })}
                placeholder="No limit"
                className="w-full px-3 py-1.5 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle"
              />
            </div>
          </div>
        )}
      </div>

      {/* Excluded Companies */}
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">Excluded Companies</label>
        <textarea
          value={profile.excludedDomains.join("\n")}
          onChange={(e) => updateProfile({ excludedDomains: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
          placeholder="Paste domains to skip, one per line..."
          rows={3}
          className="w-full px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30 placeholder:text-ink-faint resize-none"
        />
      </div>
    </div>
  );
}
