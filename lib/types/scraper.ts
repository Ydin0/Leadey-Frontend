import type { SignalType } from "./icp";

export type ScraperCategory = "jobs" | "funding" | "tech" | "intent" | "social" | "news" | "people" | "traffic";

export type ScraperFrequency = "hourly" | "daily" | "weekly";

export type ScraperStatus = "running" | "completed" | "idle" | "error";

export type ScraperSourceId =
  | "x"
  | "reddit"
  | "linkedin"
  | "indeed"
  | "glassdoor"
  | "greenhouse"
  | "lever"
  | "crunchbase"
  | "pitchbook"
  | "builtwith"
  | "wappalyzer"
  | "g2"
  | "google_news"
  | "techcrunch";

export type KeywordMatchMode = "any" | "all";

export interface ScraperDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: ScraperCategory;
  signalTypes: SignalType[];
  sourceIds: ScraperSourceId[];
  frequencyOptions: ScraperFrequency[];
  creditCostPerRun: number;
  tier: "basic" | "pro" | "enterprise";
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
  lookbackDays: number;
  maxSignalsPerRun: number;
  minSignalScore: number;
  onlyDecisionMakers: boolean;
  dedupeCompanies: boolean;
  includeRemoteRoles: boolean;
  notifyOnHighIntent: boolean;
}
