export type ICPStatus = "active" | "paused" | "draft";

export type Department =
  | "Sales"
  | "Marketing"
  | "RevOps"
  | "Engineering"
  | "Product"
  | "C-Suite"
  | "Finance"
  | "HR"
  | "Operations"
  | "Customer Success";

export type SeniorityLevel = "C-Level" | "VP" | "Director" | "Manager" | "Senior IC";

export type FundingStage =
  | "Pre-Seed"
  | "Seed"
  | "Series A"
  | "Series B"
  | "Series C"
  | "Series D+"
  | "Public"
  | "Bootstrapped";

export type SignalType =
  | "hiring"
  | "funding"
  | "tech_adoption"
  | "news"
  | "job_change"
  | "expansion"
  | "intent"
  | "social";

export interface CompanyProfile {
  industries: string[];
  companySizeMin: number;
  companySizeMax: number;
  fundingStages: FundingStage[];
  geographies: string[];
  revenueMin?: number;
  revenueMax?: number;
  excludedDomains: string[];
}

export interface PersonaFilter {
  id: string;
  name: string;
  departments: Department[];
  seniorityLevels: SeniorityLevel[];
  titleKeywords: string[];
  excludeTitleKeywords: string[];
}

export interface SignalPreferences {
  enabledSignals: SignalType[];
  keywords: string[];
  technologies: string[];
}

export type EnrichmentMode = "auto" | "preview" | "manual";

export interface EnrichmentAction {
  mode: EnrichmentMode;
  maxLeadsPerCompany: number;
  onlyPersonas: boolean;
  prioritySeniority: SeniorityLevel[];
}

export interface EnrichmentCompanyRule {
  id: string;
  name: string;
  condition: string;
  conditionMin: number;
  conditionMax?: number;
  action: EnrichmentAction;
}

export interface EnrichmentRuleSet {
  globalBudget: number;
  companyRules: EnrichmentCompanyRule[];
  defaultRule: EnrichmentAction;
  safetyThreshold: number;
  notifyThreshold: number;
}

export interface ICPStats {
  companiesFound: number;
  companiesEnriched: number;
  leadsFound: number;
  leadsEnriched: number;
  creditsUsed: number;
  creditsRemaining: number;
  scrapersActive: number;
  emailsFired: number;
  webhooksReceived: number;
}

export interface ICP {
  id: string;
  name: string;
  status: ICPStatus;
  createdAt: Date;
  companyProfile: CompanyProfile;
  personas: PersonaFilter[];
  signalPreferences: SignalPreferences;
  enrichmentRules: EnrichmentRuleSet;
  stats: ICPStats;
}
