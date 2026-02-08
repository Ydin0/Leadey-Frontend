import type {
  LiveSignal,
  EnrichmentJob,
  WebhookEndpoint,
  WebhookEvent,
  CSVImport,
  PipelineStats,
} from "../types/pipeline";

function minsAgo(m: number): Date {
  return new Date(Date.now() - m * 60 * 1000);
}

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000);
}

export const mockLiveSignals: LiveSignal[] = [
  { id: "ls_001", company: "Ramp", domain: "ramp.com", signal: "Posted 12 new sales positions including VP of Sales and 8 SDR roles", source: "linkedin", score: 95, time: minsAgo(3), status: "enriched" },
  { id: "ls_002", company: "Clerk", domain: "clerk.com", signal: "Raised $30M Series B led by Andreessen Horowitz", source: "twitter", score: 92, time: minsAgo(12), status: "enriched" },
  { id: "ls_003", company: "Webflow", domain: "webflow.com", signal: "Added Salesforce, Outreach, and Gong to their tech stack", source: "linkedin", score: 88, time: minsAgo(25), status: "enriching" },
  { id: "ls_004", company: "Postman", domain: "postman.com", signal: "High research activity around sales engagement platforms", source: "reddit", score: 85, time: minsAgo(40), status: "new" },
  { id: "ls_005", company: "Plaid", domain: "plaid.com", signal: "New CRO hired from Gong. Previously scaled outbound from $10M to $50M ARR", source: "linkedin", score: 90, time: hoursAgo(1), status: "in_funnel" },
  { id: "ls_006", company: "Retool", domain: "retool.com", signal: "Raised Series C, plans to triple go-to-market team", source: "twitter", score: 82, time: hoursAgo(2), status: "enriched" },
  { id: "ls_007", company: "Cal.com", domain: "cal.com", signal: "CTO posted about needing better sales tooling on LinkedIn", source: "linkedin", score: 70, time: hoursAgo(3), status: "new" },
  { id: "ls_008", company: "Neon", domain: "neon.tech", signal: "Opened new offices in London and Singapore for enterprise expansion", source: "indeed", score: 78, time: hoursAgo(4), status: "in_funnel" },
];

export const mockEnrichmentJobs: EnrichmentJob[] = [
  { id: "ej_001", company: "Webflow", contacts: 5, status: "processing", progress: 60, provider: "BetterContact", started: minsAgo(8), found: undefined },
  { id: "ej_002", company: "Ramp", contacts: 18, status: "completed", progress: 100, provider: "BetterContact", started: minsAgo(25), found: { emails: 16, phones: 8, linkedin: 18 } },
  { id: "ej_003", company: "Clerk", contacts: 5, status: "completed", progress: 100, provider: "Apollo", started: minsAgo(45), found: { emails: 5, phones: 2, linkedin: 5 } },
  { id: "ej_004", company: "Retool", contacts: 6, status: "processing", progress: 33, provider: "BetterContact", started: minsAgo(5), found: undefined },
  { id: "ej_005", company: "Notion", contacts: 16, status: "completed", progress: 100, provider: "Apollo", started: hoursAgo(1), found: { emails: 14, phones: 6, linkedin: 16 } },
];

export const mockWebhookEndpoints: WebhookEndpoint[] = [
  {
    id: "wh_001",
    funnel: "Enterprise Outbound",
    url: "https://hooks.leadey.com/v1/wh_a8f3k2m1",
    sources: ["Zapier \u2192 Facebook Ads", "n8n \u2192 Typeform"],
    totalReceived: 342,
    todayReceived: 12,
    lastHit: minsAgo(18),
    paused: false,
  },
  {
    id: "wh_002",
    funnel: "PLG Expansion",
    url: "https://hooks.leadey.com/v1/wh_b9g4l3n2",
    sources: ["Zapier \u2192 Webinar Platform"],
    totalReceived: 156,
    todayReceived: 5,
    lastHit: hoursAgo(2),
    paused: false,
  },
  {
    id: "wh_003",
    funnel: "Startup MVP",
    url: "https://hooks.leadey.com/v1/wh_c1h5m4o3",
    sources: [],
    totalReceived: 0,
    todayReceived: 0,
    lastHit: null,
    paused: true,
  },
];

export const mockWebhookEvents: WebhookEvent[] = [
  { id: "we_001", source: "Zapier \u2192 Facebook Ads", lead: "Sarah Miller", email: "s.miller@techco.io", company: "TechCo", funnel: "Enterprise Outbound", time: minsAgo(5), status: "entered_funnel" },
  { id: "we_002", source: "n8n \u2192 Typeform", lead: "John Davis", email: "j.davis@startup.dev", company: "Startup Dev", funnel: "Enterprise Outbound", time: minsAgo(12), status: "entered_funnel" },
  { id: "we_003", source: "Zapier \u2192 Facebook Ads", lead: "Emma Wilson", email: "e.wilson@bigcorp.com", company: "BigCorp", funnel: "Enterprise Outbound", time: minsAgo(28), status: "duplicate_skipped" },
  { id: "we_004", source: "Zapier \u2192 Webinar Platform", lead: "Michael Brown", email: "m.brown@saasify.io", company: "SaaSify", funnel: "PLG Expansion", time: hoursAgo(1), status: "entered_funnel" },
  { id: "we_005", source: "Zapier \u2192 Facebook Ads", lead: "Lisa Park", email: "l.park@growthco.com", company: "GrowthCo", funnel: "Enterprise Outbound", time: hoursAgo(3), status: "entered_funnel" },
];

export const mockCSVImports: CSVImport[] = [
  { id: "csv_001", file: "conference-leads-2025.csv", rows: 892, imported: 847, enrichNeeded: 45, dupes: 38, funnel: "Startup MVP", date: daysAgo(3), status: "completed" },
  { id: "csv_002", file: "webinar-attendees-jan.xlsx", rows: 234, imported: 220, enrichNeeded: 14, dupes: 8, funnel: "PLG Expansion", date: daysAgo(7), status: "completed" },
  { id: "csv_003", file: "linkedin-export-feb.csv", rows: 156, imported: 0, enrichNeeded: 0, dupes: 0, funnel: "Enterprise Outbound", date: minsAgo(30), status: "processing" },
];

export const mockPipelineStats: PipelineStats = {
  today: { scraped: 93, enriched: 67, addedToFunnel: 52, emailsFired: 147, webhookReceived: 17 },
  week: { scraped: 482, enriched: 312, addedToFunnel: 245, emailsFired: 890, webhookReceived: 78 },
  month: { scraped: 1840, enriched: 1120, addedToFunnel: 890, emailsFired: 3200, webhookReceived: 342 },
};
