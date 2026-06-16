import type { SearchResultRow } from "@/lib/types/scraper";

// ─── Shared Option Constants ─────────────────────────────────────────

export const SENIORITY_OPTIONS = ["intern", "entry", "mid", "senior", "principal", "staff", "c_level"];
export const EMPLOYMENT_OPTIONS = ["full_time", "part_time", "contract", "internship"];
export const FUNDING_STAGE_OPTIONS = ["seed", "series_a", "series_b", "series_c", "series_d", "ipo"];
export const SOURCE_OPTIONS = ["linkedin.com", "indeed.com", "glassdoor.com", "greenhouse.io", "lever.co", "wellfound.com", "dice.com"];

export const INDUSTRY_OPTIONS = [
  "Technology", "Software", "SaaS", "Financial Services", "Healthcare", "Biotechnology",
  "E-Commerce", "Marketing", "Advertising", "Education", "Real Estate", "Manufacturing",
  "Logistics", "Telecommunications", "Energy", "Retail", "Media", "Entertainment",
  "Insurance", "Legal", "Consulting", "Automotive", "Food & Beverage", "Travel",
];

export const EMPLOYEE_PRESETS = [
  { label: "1-10", min: 1, max: 10 },
  { label: "11-50", min: 11, max: 50 },
  { label: "51-200", min: 51, max: 200 },
  { label: "201-1000", min: 201, max: 1000 },
  { label: "1000+", min: 1000, max: 100000 },
];

export const SALARY_PRESETS = [
  { label: "$50-80k", min: 50000, max: 80000 },
  { label: "$80-120k", min: 80000, max: 120000 },
  { label: "$120-180k", min: 120000, max: 180000 },
  { label: "$180k+", min: 180000, max: 1000000 },
];

export const REVENUE_PRESETS = [
  { label: "$1-10M", min: 1000000, max: 10000000 },
  { label: "$10-50M", min: 10000000, max: 50000000 },
  { label: "$50-200M", min: 50000000, max: 200000000 },
  { label: "$200M+", min: 200000000, max: 10000000000 },
];

export const FUNDING_PRESETS = [
  { label: "$1-5M", min: 1000000, max: 5000000 },
  { label: "$5-20M", min: 5000000, max: 20000000 },
  { label: "$20-100M", min: 20000000, max: 100000000 },
  { label: "$100M+", min: 100000000, max: 10000000000 },
];

export const COUNTRY_PRESETS = [
  { code: "US", flag: "\u{1F1FA}\u{1F1F8}" }, { code: "GB", flag: "\u{1F1EC}\u{1F1E7}" }, { code: "CA", flag: "\u{1F1E8}\u{1F1E6}" },
  { code: "DE", flag: "\u{1F1E9}\u{1F1EA}" }, { code: "FR", flag: "\u{1F1EB}\u{1F1F7}" }, { code: "AU", flag: "\u{1F1E6}\u{1F1FA}" },
  { code: "NL", flag: "\u{1F1F3}\u{1F1F1}" }, { code: "IE", flag: "\u{1F1EE}\u{1F1EA}" }, { code: "SE", flag: "\u{1F1F8}\u{1F1EA}" },
  { code: "IN", flag: "\u{1F1EE}\u{1F1F3}" }, { code: "SG", flag: "\u{1F1F8}\u{1F1EC}" }, { code: "AE", flag: "\u{1F1E6}\u{1F1EA}" },
];

export const POSTED_WITHIN_OPTIONS = [
  { label: "1 day", value: 1 },
  { label: "3 days", value: 3 },
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

export const SCORE_PRESETS = [
  { label: "70+", min: 70 },
  { label: "80+", min: 80 },
  { label: "90+", min: 90 },
];

// ─── Inline Filter State Types ───────────────────────────────────────

export interface JobsFilterState {
  seniority: string[];
  remote: "all" | "remote" | "onsite";
  employmentType: string[];
  salaryRanges: string[];
  scoreMin: number | null;
  scoreMax: number | null;
  enrichmentStatus: string[];
  location: string;
  technologySlugs: string[];
  sourceId: string[];
  postedWithinDays: number | null;
  companyIndustry: string[];
  companySizeRanges: string[];
  companyFundingStage: string[];
}

export interface CompaniesFilterState {
  industry: string[];
  country: string[];
  employeeSizeRanges: string[];
  /** Custom employee headcount bounds (independent of the preset ranges). */
  minEmployees: number | null;
  maxEmployees: number | null;
  /** When a size filter is set, also keep companies whose employee count is
   *  unknown (the scraper didn't return one) instead of excluding them. */
  includeUnknownSize: boolean;
  fundingStage: string[];
  minJobCount: number | null;
  /** Filter by how many leads have been discovered for the company — e.g. set
   *  max=0 to find companies not yet enriched, or min=1 for already-enriched. */
  minLeadCount: number | null;
  maxLeadCount: number | null;
}

export const DEFAULT_JOBS_FILTER: JobsFilterState = {
  seniority: [],
  remote: "all",
  employmentType: [],
  salaryRanges: [],
  scoreMin: null,
  scoreMax: null,
  enrichmentStatus: [],
  location: "",
  technologySlugs: [],
  sourceId: [],
  postedWithinDays: null,
  companyIndustry: [],
  companySizeRanges: [],
  companyFundingStage: [],
};

export const DEFAULT_COMPANIES_FILTER: CompaniesFilterState = {
  industry: [],
  country: [],
  employeeSizeRanges: [],
  minEmployees: null,
  maxEmployees: null,
  includeUnknownSize: false,
  fundingStage: [],
  minJobCount: null,
  minLeadCount: null,
  maxLeadCount: null,
};

// ─── Unique Company (re-exported for convenience) ────────────────────

export interface UniqueCompany {
  name: string;
  domain: string | null;
  industry: string | null;
  logo: string | null;
  country: string | null;
  city: string | null;
  employeeCount: number | null;
  fundingStage: string | null;
  linkedinUrl: string | null;
  jobCount: number;
  leadCount: number;
}

// ─── Active Filter Pill ──────────────────────────────────────────────

export interface ActiveFilterPill {
  key: string;
  label: string;
}

// ─── Helper ──────────────────────────────────────────────────────────

export function formatOptionLabel(opt: string): string {
  return opt
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Preset Range Matcher ────────────────────────────────────────────

export interface RangePreset {
  label: string;
  min: number;
  max: number;
}

export function matchesAnyPresetRange(
  value: number | null,
  selectedLabels: string[],
  presets: RangePreset[],
): boolean {
  if (selectedLabels.length === 0) return true;
  if (value === null) return false;
  return selectedLabels.some((label) => {
    const preset = presets.find((p) => p.label === label);
    if (!preset) return false;
    return value >= preset.min && value <= preset.max;
  });
}
