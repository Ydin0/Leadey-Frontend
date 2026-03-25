import type {
  ScraperAssignment,
  ScraperCategory,
  ScraperFrequency,
} from "./types/scraper";

const runsPerDayByFrequency: Record<ScraperFrequency, number> = {
  hourly: 24,
  daily: 1,
  weekly: 1 / 7,
};

function round(value: number) {
  return Math.max(0, Math.round(value));
}

export interface ScraperSourceEstimate {
  source: string;
  signalsPerRun: number;
  creditsPerRun: number;
  creditsPerDay: number;
}

export interface ScraperEstimate {
  runsPerDay: number;
  signalsPerRun: number;
  signalsPerDay: number;
  creditsPerRun: number;
  creditsPerDay: number;
  sourceBreakdown: ScraperSourceEstimate[];
}

export function estimateScraperDailyUsage(
  assignment: ScraperAssignment,
  _category: ScraperCategory
): ScraperEstimate {
  const runsPerDay = runsPerDayByFrequency[assignment.frequency] ?? 1;
  const signalsPerRun = assignment.maxSignalsPerRun;

  // TheirStack charges 1 credit per job returned
  const creditsPerRun = signalsPerRun;

  return {
    runsPerDay,
    signalsPerRun,
    signalsPerDay: round(signalsPerRun * runsPerDay),
    creditsPerRun,
    creditsPerDay: round(creditsPerRun * runsPerDay),
    sourceBreakdown: [{
      source: "theirstack",
      signalsPerRun,
      creditsPerRun,
      creditsPerDay: round(creditsPerRun * runsPerDay),
    }],
  };
}
