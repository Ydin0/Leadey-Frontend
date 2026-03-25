import type { ScraperDefinition, ScraperAssignment } from "../types/scraper";

export const scraperCatalog: ScraperDefinition[] = [
  {
    id: "scraper_job_board",
    name: "Job Board Monitor",
    description: "Searches across all major job boards via TheirStack for hiring signals that indicate company growth",
    icon: "Briefcase",
    category: "jobs",
    signalTypes: ["hiring"],
    frequencyOptions: ["daily", "weekly"],
    tier: "basic",
  },
];

function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000);
}

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

export const mockScraperAssignments: ScraperAssignment[] = [
  {
    id: "sa_001",
    scraperId: "scraper_job_board",
    scraperName: "Job Board Monitor",
    icpId: "icp_001",
    enabled: true,
    frequency: "daily",
    configuredAt: daysAgo(12),
    lastRun: hoursAgo(3),
    creditsPerRun: 0,
    status: "completed",
    signalsFound: 34,
    companiesFound: 18,
    keywords: ["SDR", "Account Executive", "Sales Engineer"],
    excludedKeywords: ["intern", "contract"],
    keywordMatchMode: "any",
    countries: ["US", "CA"],
    languages: ["English"],
    sourceIds: [],
    sourceSignalLimits: {},
    jobSeniority: ["mid", "senior"],
    remoteFilter: "include",
    lookbackDays: 7,
    maxSignalsPerRun: 120,
    minSignalScore: 72,
    onlyDecisionMakers: false,
    dedupeCompanies: true,
    includeRemoteRoles: true,
    notifyOnHighIntent: true,
  },
];
