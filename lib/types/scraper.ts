import type { SignalType } from "./icp";

export type ScraperCategory = "jobs" | "funding" | "tech" | "intent" | "social" | "news" | "people" | "traffic";

export type ScraperFrequency = "hourly" | "daily" | "weekly";

export type ScraperStatus = "running" | "completed" | "idle" | "error";

export type ScraperSourceId =
  | "theirstack"
  | "linkedin"
  | "indeed"
  | "glassdoor"
  | "greenhouse"
  | "lever";

export type KeywordMatchMode = "any" | "all";

export type RemoteFilter = "include" | "only" | "exclude";

export type JobSeniority = "intern" | "entry" | "mid" | "senior" | "principal" | "staff" | "c_level";

export interface ScraperDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: ScraperCategory;
  signalTypes: SignalType[];
  frequencyOptions: ScraperFrequency[];
  tier: "basic" | "pro" | "enterprise";
}

// ─── TheirStack Filters (comprehensive filter payload) ─────────────
export interface TheirStackFilters {
  // Job title
  job_title_or?: string[];
  job_title_not?: string[];
  job_title_pattern_and?: string[];
  job_title_pattern_or?: string[];
  job_title_pattern_not?: string[];
  // Location
  job_country_code_or?: string[];
  job_country_code_not?: string[];
  job_location_pattern_or?: string[];
  job_location_pattern_not?: string[];
  // Date
  posted_at_max_age_days?: number;
  posted_at_gte?: string;
  posted_at_lte?: string;
  discovered_at_max_age_days?: number;
  // Description
  job_description_pattern_or?: string[];
  job_description_pattern_not?: string[];
  job_description_contains_or?: string[];
  // Job attrs
  remote?: boolean | null;
  job_seniority_or?: string[];
  min_salary_usd?: number;
  max_salary_usd?: number;
  job_technology_slug_or?: string[];
  job_technology_slug_not?: string[];
  easy_apply?: boolean;
  employment_statuses_or?: string[];
  // Company
  company_name_or?: string[];
  company_domain_or?: string[];
  min_employee_count?: number;
  max_employee_count?: number;
  min_revenue_usd?: number;
  max_revenue_usd?: number;
  min_funding_usd?: number;
  max_funding_usd?: number;
  funding_stage_or?: string[];
  industry_or?: string[];
  industry_not?: string[];
  company_type?: string;
  company_country_code_or?: string[];
  company_technology_slug_or?: string[];
  only_yc_companies?: boolean;
  investors_or?: string[];
  // Source
  url_domain_or?: string[];
  url_domain_not?: string[];
  // Pagination
  limit?: number;
}

// ─── Saved Search ──────────────────────────────────────────────────
export interface SavedSearch {
  id: string;
  searchName: string;
  filters: TheirStackFilters;
  enabled: boolean;
  frequency: ScraperFrequency;
  status: ScraperStatus;
  totalResults: number;
  lastRunResultCount: number;
  signalsFound: number;
  companiesFound: number;
  lastRunAt: string | null;
  createdAt: string;
}

// ─── Search Result Row (enriched signal) ───────────────────────────
export interface SearchResultRow {
  id: string;
  assignmentId: string;
  runId: string | null;
  sourceId: string;
  jobTitle: string;
  company: string;
  companyDomain: string | null;
  location: string | null;
  jobUrl: string | null;
  description: string | null;
  salary: string | null;
  postedAt: string | null;
  jobType: string | null;
  isRemote: boolean;
  score: number;
  signalType: string;
  status: string;
  createdAt: string;
  companyLogo: string | null;
  companyIndustry: string | null;
  companyEmployeeCount: number | null;
  companyRevenue: number | null;
  companyFunding: number | null;
  companyFundingStage: string | null;
  companyCountry: string | null;
  companyCity: string | null;
  companyLinkedinUrl: string | null;
  hiringTeam: Array<{ name: string; role: string; linkedinUrl: string; imageUrl: string }>;
  seniority: string | null;
  technologySlugs: string[];
  minSalaryUsd: number | null;
  maxSalaryUsd: number | null;
  employmentStatus: string | null;
  enrichmentStatus: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface ScraperAssignment {
  id: string;
  scraperId: string;
  scraperName: string;
  icpId: string;
  enabled: boolean;
  frequency: ScraperFrequency;
  configuredAt: Date;
  lastRun: Date | null;
  creditsPerRun: number;
  status: ScraperStatus;
  signalsFound: number;
  companiesFound: number;
  keywords: string[];
  excludedKeywords: string[];
  keywordMatchMode: KeywordMatchMode;
  countries: string[];
  languages: string[];
  sourceIds: ScraperSourceId[];
  sourceSignalLimits: Partial<Record<ScraperSourceId, number>>;
  jobSeniority: JobSeniority[];
  remoteFilter: RemoteFilter;
  lookbackDays: number;
  maxSignalsPerRun: number;
  minSignalScore: number;
  onlyDecisionMakers: boolean;
  dedupeCompanies: boolean;
  includeRemoteRoles: boolean;
  notifyOnHighIntent: boolean;
}
