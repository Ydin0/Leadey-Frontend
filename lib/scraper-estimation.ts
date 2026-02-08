import type {
  ScraperAssignment,
  ScraperCategory,
  ScraperFrequency,
  ScraperSourceId,
} from "./types/scraper";

const runsPerDayByFrequency: Record<ScraperFrequency, number> = {
  hourly: 24,
  daily: 1,
  weekly: 1 / 7,
};

const categorySignalCreditFactor: Record<ScraperCategory, number> = {
  jobs: 4.5,
  funding: 3.2,
  tech: 3.8,
  intent: 5.2,
  social: 5.8,
  news: 2.4,
  people: 4.1,
  traffic: 3.0,
};

const sourceWeight: Record<ScraperSourceId, number> = {
  x: 1.05,
  reddit: 1.1,
  linkedin: 1.35,
  indeed: 1.15,
  glassdoor: 1.15,
  greenhouse: 0.95,
  lever: 0.95,
  crunchbase: 1.2,
  pitchbook: 1.3,
  builtwith: 1.1,
  wappalyzer: 1.1,
  g2: 1.2,
  google_news: 0.9,
  techcrunch: 0.95,
};

function round(value: number) {
  return Math.max(0, Math.round(value));
}

export interface ScraperSourceEstimate {
  source: ScraperSourceId;
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
  category: ScraperCategory
): ScraperEstimate {
  const runsPerDay = runsPerDayByFrequency[assignment.frequency] ?? 1;
  const categoryFactor = categorySignalCreditFactor[category] ?? 3;

  const selectedSources = assignment.sourceIds.filter(
    (source) => (assignment.sourceSignalLimits[source] ?? 0) > 0
  );

  const requestedSignals = selectedSources.reduce(
    (sum, source) => sum + (assignment.sourceSignalLimits[source] ?? 0),
    0
  );

  const cappedSignalsPerRun =
    requestedSignals > 0
      ? Math.min(requestedSignals, assignment.maxSignalsPerRun)
      : 0;
  const scale = requestedSignals > 0 ? cappedSignalsPerRun / requestedSignals : 0;

  const sourceBreakdown = selectedSources.map((source) => {
    const rawSignals = assignment.sourceSignalLimits[source] ?? 0;
    const signalsPerRun = rawSignals * scale;
    const creditsPerRun = signalsPerRun * categoryFactor * sourceWeight[source];
    return {
      source,
      signalsPerRun: round(signalsPerRun),
      creditsPerRun: round(creditsPerRun),
      creditsPerDay: round(creditsPerRun * runsPerDay),
    };
  });

  const sourceCreditsPerRun = sourceBreakdown.reduce(
    (sum, item) => sum + item.creditsPerRun,
    0
  );
  const creditsPerRun = round(assignment.creditsPerRun + sourceCreditsPerRun);
  const signalsPerRun = round(cappedSignalsPerRun);

  return {
    runsPerDay,
    signalsPerRun,
    signalsPerDay: round(cappedSignalsPerRun * runsPerDay),
    creditsPerRun,
    creditsPerDay: round(creditsPerRun * runsPerDay),
    sourceBreakdown,
  };
}
