import type { LeadStatus } from "./funnel-focus";

export type { LeadStatus };

export type FunnelStatus = "active" | "paused" | "draft";

export type FunnelChannel = "email" | "linkedin" | "call" | "whatsapp" | "sms" | "task";

export type CampaignVisibility = "public" | "private";

/** A single dynamic-audience filter row (e.g. Lead owner is Alex). */
export interface CampaignAudienceCondition {
  id: string;
  field: string;
  value: string;
}

export interface CampaignAudience {
  mode: "dynamic" | "static";
  matchAll: boolean;
  conditions: CampaignAudienceCondition[];
  autoEnroll: boolean;
  /** Estimated leads matching the filters at create time. */
  matchEstimate?: number;
}

export interface CampaignExitConditions {
  reply: boolean;
  meeting: boolean;
  opp: boolean;
}

export interface CampaignEmailAutomation {
  enabled: boolean;
  mailboxIds: string[];
  perMailboxLimits?: Record<string, number>;
  dailyCap: number;
  ramp: boolean;
  days: Record<string, boolean>;
  sendStart: string;
  sendEnd: string;
  tracking: { opens: boolean; clicks: boolean; unsub: boolean };
}

/** Builder config persisted in `funnels.config` (round-trips the wizard). */
export interface CampaignConfig {
  audience?: CampaignAudience;
  exit?: CampaignExitConditions;
  emailAutomation?: CampaignEmailAutomation;
  /** Shared per-campaign lead filters (the Leads tab filter bar). Persisted so
   *  the filtered view is the same for every rep and survives a refresh. */
  leadFilters?: Record<string, unknown>;
  /** Shared per-campaign column layout ("save for everyone") — order + hidden
   *  keys every rep sees unless they've saved their own personal layout. */
  columnPrefs?: { order: string[]; hidden: string[] };
  /** Department names with live access to this campaign — anyone whose team
   *  department matches gets access (dynamic membership), alongside individuals. */
  departmentAccess?: string[];
}

export interface FunnelStep {
  id: string;
  channel: FunnelChannel;
  label: string;
  dayOffset: number;
  subject?: string;
  emailBody?: string;
  action?: string;
}

export interface FunnelSource {
  type: "csv" | "signals" | "webhook" | "companies";
  label: string;
  count: number;
}

export interface FunnelMetrics {
  total: number;
  active: number;
  replied: number;
  replyRate: number;
  bounced: number;
  completed: number;
}

export interface FunnelLeadEvent {
  id: string;
  type: string;
  outcome: string | null;
  stepIndex: number;
  meta: Record<string, unknown> | null;
  timestamp: Date;
}

/** An additional labeled email or phone on a contact, e.g.
 *  { label: "Personal", value: "x@y.com" }. */
export interface ContactExtra {
  label: string;
  value: string;
}

export interface FunnelLead {
  id: string;
  /** Which campaign this lead row belongs to — set on org-wide rows (the
   *  /dashboard/leads table spans campaigns); absent inside a single
   *  campaign's payload where the funnel id is ambient. */
  funnelId?: string;
  funnelName?: string | null;
  /** Canonical person id (master contact) — the same across every campaign
   *  this person is enrolled in. Null for legacy rows with no identity. */
  personId?: string | null;
  name: string;
  /** Explicit first/last name (from CSV import / scraper) for email merge
   *  variables; falls back to splitting `name` when absent. */
  firstName?: string | null;
  lastName?: string | null;
  company: string;
  title: string;
  email: string;
  /** Additional labeled emails/phones (work, personal, …) beyond the primary
   *  email/phone — the primary values stay what dialing/sending use. */
  extraEmails?: ContactExtra[];
  extraPhones?: ContactExtra[];
  currentStep: number;
  totalSteps: number;
  /** Built-in status key or a custom org-defined status. */
  status: string;
  nextAction: string;
  nextDate: Date;
  source: string;
  score: number;
  phone?: string | null;
  /** When the lead was added to the campaign — used for "recently added" sort. */
  createdAt?: Date;
  companyDomain?: string;
  companyIndustry?: string;
  companyEmployeeCount?: number;
  companyLocation?: string;
  companyDescription?: string;
  companyLinkedin?: string;
  companyAnnualRevenue?: string;
  /** Roles the company is actively hiring for (from a job scraper / CSV). */
  companyHiringRoles?: string[];
  /** Per-person Do-Not-Contact flag (compliance). Shown in red; calls confirm. */
  doNotCall?: boolean;
  notes?: Record<string, string>;
  linkedinUrl?: string;
  unipileProviderId?: string | null;
  /** Set once the lead has been converted to an Opportunity. Drives the
   *  "→ Opp" badge on the lead row and the "Open Opportunity" CTA in the
   *  focus view. */
  opportunityId?: string | null;
  /** Org-defined custom field values (label/value/isLink), from the backend. */
  customFields?: { key: string; label: string; value: string; isLink: boolean }[];
  events?: FunnelLeadEvent[];
  /** Server-computed activity totals — present even on the lite leads payload
   *  (which omits per-lead events), so the table shows real call/email counts. */
  callCount?: number;
  emailCount?: number;
}

export interface FunnelAnalyticsStep {
  label: string;
  channel: FunnelChannel;
  sent: number;
  opened: number;
  replied: number;
  openRate: number;
  replyRate: number;
}

export interface LinkedInActionProgress {
  completed: number;
  limit: number;
  totalPending: number;
}

export interface CockpitLinkedInItem {
  id: string;
  leadId: string;
  name: string;
  title: string;
  company: string;
  type: "view" | "connect" | "message";
  action?: string;
  message: string;
  profileUrl: string;
}

export interface CockpitWhatsAppItem {
  id: string;
  name: string;
  title: string;
  company: string;
  phone: string;
  message: string;
}

export interface CockpitCallItem {
  id: string;
  name: string;
  title: string;
  company: string;
  phone: string;
  script: {
    hook: string;
    talkingPoints: string[];
    objectionHandlers: string[];
  };
}

export interface CockpitEmailSummary {
  sentToday: number;
  scheduled: number;
  opened: number;
  openRate: number;
  replied: number;
  replyRate: number;
}

export interface FunnelCockpit {
  linkedin: CockpitLinkedInItem[];
  linkedinProgress: Record<string, LinkedInActionProgress>;
  calls: CockpitCallItem[];
  whatsapp: CockpitWhatsAppItem[];
  email: CockpitEmailSummary;
}

export interface FunnelMember {
  teamMemberId: string;
  role: "owner" | "contributor" | "viewer";
  addedAt: Date;
}

/** Named palette key for campaign tags — rendered theme-aware via the
 *  signal token pairs (bg-signal-X / text-signal-X-text). */
export type CampaignTagColor =
  | "blue"
  | "green"
  | "red"
  | "slate"
  | "amber"
  | "violet"
  | "pink"
  | "cyan";

/** A tag as it appears ON a campaign. */
export interface CampaignTag {
  id: string;
  name: string;
  color: CampaignTagColor;
}

/** A tag row in the org-level manager (settings). */
export interface CampaignTagWithCount extends CampaignTag {
  sortOrder: number;
  campaignCount: number;
}

export interface Funnel {
  id: string;
  name: string;
  description: string;
  status: FunnelStatus;
  visibility?: CampaignVisibility;
  config?: CampaignConfig;
  steps: FunnelStep[];
  metrics: FunnelMetrics;
  sources: FunnelSource[];
  leads: FunnelLead[];
  cockpit: FunnelCockpit;
  analyticsSteps: FunnelAnalyticsStep[];
  members: FunnelMember[];
  /** Org-level colored tags used to organise/filter campaigns. */
  tags: CampaignTag[];
  /** Inbound lead-ingestion webhook config. */
  webhookToken?: string | null;
  webhookEnabled?: boolean;
  /** Maps incoming payload key → target ("email", "custom:<key>", …). */
  webhookFieldMap?: Record<string, string>;
  /** Full public webhook URL (built server-side from WEBHOOK_BASE_URL). */
  webhookUrl?: string | null;
  createdAt: Date;
}
