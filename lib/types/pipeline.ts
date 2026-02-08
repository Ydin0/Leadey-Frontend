export type SignalStatus = "new" | "enriching" | "enriched" | "in_funnel";

export type SignalSource = "linkedin" | "indeed" | "twitter" | "reddit" | "instagram";

export interface LiveSignal {
  id: string;
  company: string;
  domain: string;
  signal: string;
  source: SignalSource;
  score: number;
  time: Date;
  status: SignalStatus;
}

export type EnrichmentJobStatus = "queued" | "processing" | "completed" | "failed";

export interface EnrichmentJob {
  id: string;
  company: string;
  contacts: number;
  status: EnrichmentJobStatus;
  progress: number;
  provider: string;
  started: Date;
  found?: {
    emails: number;
    phones: number;
    linkedin: number;
  };
}

export interface WebhookEndpoint {
  id: string;
  funnel: string;
  url: string;
  sources: string[];
  totalReceived: number;
  todayReceived: number;
  lastHit: Date | null;
  paused: boolean;
}

export type WebhookEventStatus = "entered_funnel" | "duplicate_skipped";

export interface WebhookEvent {
  id: string;
  source: string;
  lead: string;
  email: string;
  company: string;
  funnel: string;
  time: Date;
  status: WebhookEventStatus;
}

export type CSVImportStatus = "processing" | "completed" | "failed";

export interface CSVImport {
  id: string;
  file: string;
  rows: number;
  imported: number;
  enrichNeeded: number;
  dupes: number;
  funnel: string;
  date: Date;
  status: CSVImportStatus;
}

export interface PeriodStats {
  scraped: number;
  enriched: number;
  addedToFunnel: number;
  emailsFired: number;
  webhookReceived: number;
}

export interface PipelineStats {
  today: PeriodStats;
  week: PeriodStats;
  month: PeriodStats;
}
