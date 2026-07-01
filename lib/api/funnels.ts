import type {
  Funnel,
  FunnelChannel,
  FunnelLead,
  FunnelLeadEvent,
  FunnelMember,
  LeadStatus,
  FunnelStatus,
  FunnelStep,
  CampaignVisibility,
  CampaignAudience,
  CampaignExitConditions,
  CampaignEmailAutomation,
} from "@/lib/types/funnel";
import { apiRequest } from "./client";

type ApiFunnelLead = Omit<FunnelLead, "nextDate"> & {
  nextDate: string;
};

type ApiFunnel = Omit<Funnel, "createdAt" | "leads"> & {
  createdAt: string;
  leads: ApiFunnelLead[];
};

function parseDate(value: unknown): Date {
  const candidate = new Date(typeof value === "string" ? value : "");
  if (Number.isNaN(candidate.getTime())) {
    return new Date();
  }
  return candidate;
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asFunnelStatus(value: unknown): FunnelStatus {
  const normalized = asString(value).toLowerCase();
  if (normalized === "active" || normalized === "paused") {
    return normalized;
  }
  return "draft";
}

function asChannel(value: unknown): FunnelChannel {
  const normalized = asString(value).toLowerCase();
  if (
    normalized === "linkedin" ||
    normalized === "call" ||
    normalized === "whatsapp" ||
    normalized === "sms" ||
    normalized === "task"
  ) {
    return normalized;
  }
  return "email";
}

function asLeadStatus(value: unknown): string {
  const normalized = asString(value).toLowerCase();
  // "pending" is the DB default for in-progress leads — surface it as "new".
  if (!normalized || normalized === "pending") return "new";
  // Preserve any other value (built-in or custom org status) verbatim.
  return normalized;
}

function hydrateLead(raw: ApiFunnelLead): FunnelLead {
  const notes = (raw as any).notes;
  const rawEvents = (raw as any).events;
  const events: FunnelLeadEvent[] = Array.isArray(rawEvents)
    ? rawEvents.map((e: any) => ({
        id: asString(e.id),
        type: asString(e.type),
        outcome: e.outcome ? asString(e.outcome) : null,
        stepIndex: asNumber(e.stepIndex),
        meta: e.meta && typeof e.meta === "object" ? e.meta : null,
        timestamp: parseDate(e.timestamp),
      }))
    : [];

  return {
    id: asString(raw.id),
    name: asString(raw.name),
    firstName: (raw as { firstName?: string | null }).firstName ?? null,
    lastName: (raw as { lastName?: string | null }).lastName ?? null,
    company: asString(raw.company),
    title: asString(raw.title),
    email: asString(raw.email),
    currentStep: asNumber(raw.currentStep),
    totalSteps: asNumber(raw.totalSteps),
    status: asLeadStatus(raw.status),
    nextAction: asString(raw.nextAction),
    nextDate: parseDate(raw.nextDate),
    source: asString(raw.source),
    score: asNumber(raw.score),
    phone: (raw as any).phone || null,
    companyDomain: (raw as any).companyDomain || undefined,
    companyIndustry: (raw as any).companyIndustry || undefined,
    companyEmployeeCount: (raw as any).companyEmployeeCount ? asNumber((raw as any).companyEmployeeCount) : undefined,
    companyLocation: (raw as any).companyLocation || undefined,
    companyDescription: (raw as any).companyDescription || undefined,
    companyLinkedin: (raw as any).companyLinkedin || undefined,
    companyAnnualRevenue: (raw as any).companyAnnualRevenue || undefined,
    companyHiringRoles: Array.isArray((raw as any).companyHiringRoles) ? (raw as any).companyHiringRoles : undefined,
    doNotCall: !!(raw as any).doNotCall,
    opportunityId: (raw as any).opportunityId || null,
    customFields: Array.isArray((raw as any).customFields)
      ? (raw as any).customFields.map((f: any) => ({
          key: asString(f.key),
          label: asString(f.label),
          value: asString(f.value),
          isLink: !!f.isLink,
        }))
      : undefined,
    notes: notes && typeof notes === "object" && !Array.isArray(notes) ? notes : undefined,
    linkedinUrl: (raw as any).linkedinUrl || undefined,
    unipileProviderId: (raw as any).unipileProviderId || null,
    createdAt: (raw as any).createdAt ? parseDate((raw as any).createdAt) : undefined,
    events,
    // Server-computed activity totals (calls by phone / emails by address across
    // the whole org) — must be carried through or the table falls back to
    // counting the lite payload's empty events array and shows 0.
    callCount: (raw as any).callCount != null ? asNumber((raw as any).callCount) : undefined,
    emailCount: (raw as any).emailCount != null ? asNumber((raw as any).emailCount) : undefined,
  };
}

function hydrateFunnel(raw: ApiFunnel): Funnel {
  const steps: FunnelStep[] = Array.isArray(raw.steps)
    ? raw.steps.map((step) => ({
        id: asString(step.id),
        channel: asChannel(step.channel),
        label: asString(step.label),
        dayOffset: asNumber(step.dayOffset),
        subject: (step as any).subject ? asString((step as any).subject) : undefined,
        emailBody: (step as any).emailBody ? asString((step as any).emailBody) : undefined,
        action: (step as any).action ? asString((step as any).action) : undefined,
      }))
    : [];

  const leads = Array.isArray(raw.leads)
    ? raw.leads.map(hydrateLead)
    : [];

  return {
    id: asString(raw.id),
    name: asString(raw.name),
    description: asString(raw.description),
    status: asFunnelStatus(raw.status),
    visibility: (raw as any).visibility === "public" ? "public" : "private",
    config: (raw as any).config && typeof (raw as any).config === "object" ? (raw as any).config : {},
    steps,
    metrics: {
      total: asNumber(raw.metrics?.total),
      active: asNumber(raw.metrics?.active),
      replied: asNumber(raw.metrics?.replied),
      replyRate: asNumber(raw.metrics?.replyRate),
      bounced: asNumber(raw.metrics?.bounced),
      completed: asNumber(raw.metrics?.completed),
    },
    sources: Array.isArray(raw.sources)
      ? raw.sources.map((source) => ({
          type:
            source.type === "signals" ||
            source.type === "webhook" ||
            source.type === "companies"
              ? source.type
              : "csv",
          label: asString(source.label),
          count: asNumber(source.count),
        }))
      : [],
    leads,
    cockpit: raw.cockpit
      ? {
          ...raw.cockpit,
          linkedin: Array.isArray(raw.cockpit.linkedin)
            ? raw.cockpit.linkedin.map((item: any) => ({
                ...item,
                leadId: item.leadId || "",
              }))
            : [],
          linkedinProgress: (raw.cockpit as any).linkedinProgress || {},
          whatsapp: (raw.cockpit as any).whatsapp || [],
        }
      : {
          linkedin: [],
          linkedinProgress: {},
          calls: [],
          whatsapp: [],
          email: { sentToday: 0, scheduled: 0, opened: 0, openRate: 0, replied: 0, replyRate: 0 },
        },
    analyticsSteps: Array.isArray(raw.analyticsSteps)
      ? raw.analyticsSteps.map((step) => ({
          label: asString(step.label),
          channel: asChannel(step.channel),
          sent: asNumber(step.sent),
          opened: asNumber(step.opened),
          replied: asNumber(step.replied),
          openRate: asNumber(step.openRate),
          replyRate: asNumber(step.replyRate),
        }))
      : [],
    members: Array.isArray((raw as any).members)
      ? ((raw as any).members as any[]).map((m): FunnelMember => ({
          teamMemberId: asString(m.teamMemberId),
          role: m.role === "owner" || m.role === "contributor" ? m.role : "viewer",
          addedAt: parseDate(m.addedAt),
        }))
      : [],
    webhookToken: (raw as any).webhookToken ?? null,
    webhookEnabled: !!(raw as any).webhookEnabled,
    webhookFieldMap:
      (raw as any).webhookFieldMap && typeof (raw as any).webhookFieldMap === "object"
        ? (raw as any).webhookFieldMap
        : {},
    webhookUrl: (raw as any).webhookUrl ?? null,
    createdAt: parseDate(raw.createdAt),
  };
}

export async function listFunnels(): Promise<Funnel[]> {
  const data = await apiRequest<ApiFunnel[]>("/funnels");
  return data.map(hydrateFunnel);
}

/** Fetch a campaign. Pass `{ lite: true, fullLeadId }` to skip the heavy
 *  per-lead events/description/custom-fields for every lead except the one being
 *  viewed — a big speed-up for campaigns with thousands of leads. */
export async function getFunnelById(
  funnelId: string,
  opts?: { lite?: boolean; fullLeadId?: string | null },
): Promise<Funnel> {
  const params = new URLSearchParams();
  if (opts?.lite) params.set("lite", "1");
  if (opts?.fullLeadId) params.set("fullLeadId", opts.fullLeadId);
  const qs = params.toString();
  const data = await apiRequest<ApiFunnel>(
    `/funnels/${encodeURIComponent(funnelId)}${qs ? `?${qs}` : ""}`,
  );
  return hydrateFunnel(data);
}

export interface UpdateFunnelWebhookPayload {
  enabled?: boolean;
  rotateToken?: boolean;
  fieldMap?: Record<string, string>;
}

/** PATCH /funnels/:id/webhook — manage the inbound lead-ingestion webhook. */
export async function updateFunnelWebhook(
  funnelId: string,
  payload: UpdateFunnelWebhookPayload,
): Promise<Funnel> {
  const data = await apiRequest<ApiFunnel>(
    `/funnels/${encodeURIComponent(funnelId)}/webhook`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
  return hydrateFunnel(data);
}

export interface CreateFunnelPayload {
  name: string;
  description: string;
  status?: FunnelStatus;
  steps: Array<Pick<FunnelStep, "channel" | "label" | "dayOffset"> & { subject?: string; emailBody?: string; action?: string }>;
  sourceTypes?: Array<"csv" | "signals" | "webhook" | "companies">;
  visibility?: CampaignVisibility;
  audience?: CampaignAudience;
  exit?: CampaignExitConditions;
  emailAutomation?: CampaignEmailAutomation;
  /** Assigned team-member ids (besides the creator, who becomes owner). */
  members?: string[];
}

export async function createFunnel(payload: CreateFunnelPayload): Promise<Funnel> {
  const data = await apiRequest<ApiFunnel>("/funnels", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return hydrateFunnel(data);
}

export interface CsvColumnMapping {
  csvColumn: string;
  mappedField: string;
  autoMapped?: boolean;
}

export type CsvGroupBy = "domain" | "name" | "linkedin";

export interface ImportCsvPayload {
  fileName: string;
  mappings: CsvColumnMapping[];
  rows: Record<string, string>[];
  /** How leads are grouped into companies (default: domain). */
  groupBy?: CsvGroupBy;
  /** When true, validate + return the review preview without writing. */
  dryRun?: boolean;
  /** When true, a row identified only by email is valid (name/company are
   *  derived from the email domain and filled by company enrichment). */
  enrichCompanies?: boolean;
}

export interface EnrichCompaniesResult {
  domainsQueried: number;
  companiesEnriched: number;
  leadsUpdated: number;
  creditsCharged: number;
  capped: boolean;
}

/** Enrich company data (name + firmographics) for leads by their email/company
 *  domain via TheirStack. Charges credits per company resolved. */
export async function enrichCampaignCompanies(
  funnelId: string,
  leadIds?: string[],
): Promise<EnrichCompaniesResult> {
  return apiRequest<EnrichCompaniesResult>(
    `/funnels/${encodeURIComponent(funnelId)}/enrich-companies`,
    { method: "POST", body: JSON.stringify({ leadIds }) },
  );
}

export interface ImportCsvResult {
  importId?: string;
  funnelId?: string;
  fileName?: string;
  dryRun?: boolean;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  duplicateLeads: number;
  invalidRows: number;
  companiesTotal: number;
  existingCompanies: number;
  newCompanies: number;
  groupBy: CsvGroupBy;
  errors: Array<{ row: number; reason: string }>;
  addedLeadIds?: string[];
}

export async function importCsvLeads(
  funnelId: string,
  payload: ImportCsvPayload
): Promise<ImportCsvResult> {
  return apiRequest<ImportCsvResult>(`/funnels/${encodeURIComponent(funnelId)}/imports/csv`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function advanceLead(
  funnelId: string,
  leadId: string,
  outcome: string
): Promise<{ lead: FunnelLead; funnel: Funnel }> {
  const raw = await apiRequest<{ lead: ApiFunnelLead; funnel: ApiFunnel }>(
    `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/advance`,
    {
      method: "POST",
      body: JSON.stringify({ outcome }),
    }
  );
  return {
    lead: hydrateLead(raw.lead),
    funnel: hydrateFunnel(raw.funnel),
  };
}

/** Edit a contact's details (name / title / email / phone / LinkedIn) from the
 *  lead profile view. Campaign contacts (a real funnelId) hit the lead endpoint;
 *  standalone discovered contacts (no funnelId) hit the contacts endpoint. */
export interface ContactEditPatch {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
}

export async function updateLeadContact(
  funnelId: string,
  contactId: string,
  patch: ContactEditPatch,
): Promise<{ id: string; name: string; title: string; email: string; phone: string; linkedinUrl: string }> {
  const path = funnelId
    ? `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(contactId)}/contact`
    : `/contacts/${encodeURIComponent(contactId)}`;
  return apiRequest(path, { method: "PATCH", body: JSON.stringify(patch) });
}

/** Create a single lead in a campaign (the "Individual contact" / "Add contact"
 *  flow). Only name + company are required; the rest is filled on the profile.
 *  Returns the new lead id so the caller can open its profile. */
export async function createLeadInFunnel(
  funnelId: string,
  data: { name: string; company: string; title?: string; email?: string; phone?: string; linkedinUrl?: string },
): Promise<{ leadId: string }> {
  return apiRequest(`/funnels/${encodeURIComponent(funnelId)}/leads`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Edit a lead's company/About info (fans out to all contacts at that company). */
export async function updateLeadCompanyInfo(
  funnelId: string,
  leadId: string,
  patch: Partial<{
    company: string;
    companyDomain: string;
    companyIndustry: string;
    companyEmployeeCount: number | string;
    companyLocation: string;
    companyDescription: string;
    companyLinkedin: string;
    companyAnnualRevenue: string;
  }>,
): Promise<void> {
  await apiRequest(`/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/company`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/** Set a lead's custom-field values (keyed by field key; "" clears the value). */
export async function setLeadCustomFieldValues(
  funnelId: string,
  leadId: string,
  values: Record<string, string>,
): Promise<void> {
  await apiRequest(`/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/custom-fields`, {
    method: "PATCH",
    body: JSON.stringify({ values }),
  });
}

/** Persist the campaign's shared lead filters (stored in funnels.config so the
 *  filtered view is the same for every rep and survives a refresh). */
export async function saveLeadFilters(
  funnelId: string,
  leadFilters: Record<string, unknown>,
): Promise<void> {
  await apiRequest(`/funnels/${encodeURIComponent(funnelId)}`, {
    method: "PATCH",
    body: JSON.stringify({ leadFilters }),
  });
}

/** Magic Enrich → "Find job posts": search TheirStack for each company's recent
 *  open jobs and add them as hiring roles on every lead at that company in this
 *  campaign. Idempotent (dedupes by role title per lead). */
export async function enrichJobPosts(
  funnelId: string,
  companies: { name: string; domain?: string | null; linkedinUrl?: string | null }[],
): Promise<{ companiesSearched: number; companiesRequested: number; capped: boolean; jobsFound: number; rolesCreated: number; leadsEnriched: number }> {
  return apiRequest(
    `/funnels/${encodeURIComponent(funnelId)}/enrich-job-posts`,
    {
      method: "POST",
      body: JSON.stringify({ companies }),
    },
  );
}

/** Logs a real phone call against a lead. Always counts as a call touch; ticks
 *  the step forward only when the lead's current step is a call step. */
export async function logLeadCall(
  funnelId: string,
  leadId: string,
  outcome: string = "completed",
): Promise<{ lead: FunnelLead; funnel: Funnel }> {
  const raw = await apiRequest<{ lead: ApiFunnelLead; funnel: ApiFunnel }>(
    `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/log-call`,
    {
      method: "POST",
      body: JSON.stringify({ outcome }),
    },
  );
  return {
    lead: hydrateLead(raw.lead),
    funnel: hydrateFunnel(raw.funnel),
  };
}

/** Persists a free-text note as a lead event so it survives reloads and shows
 *  in the lead's activity timeline. */
export async function logLeadNote(
  funnelId: string,
  leadId: string,
  text: string,
): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(
    `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/notes`,
    { method: "POST", body: JSON.stringify({ text }) },
  );
}

/** Edits a previously-saved note (lead event of type "note"). */
export async function updateLeadNote(
  funnelId: string,
  leadId: string,
  eventId: string,
  text: string,
): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(
    `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/notes/${encodeURIComponent(eventId)}`,
    { method: "PATCH", body: JSON.stringify({ text }) },
  );
}

/** Deletes a previously-saved note. */
export async function deleteLeadNote(
  funnelId: string,
  leadId: string,
  eventId: string,
): Promise<void> {
  await apiRequest(
    `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/notes/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
  );
}

/** Toggles a single person's Do-Not-Contact flag (compliance). Non-destructive:
 *  the person stays in every campaign but is shown in red and calls confirm.
 *  Returns the refreshed funnel. */
export async function markLeadDnc(
  funnelId: string,
  leadId: string,
  value = true,
): Promise<{ name: string; doNotCall: boolean; funnel: Funnel }> {
  const raw = await apiRequest<{ name: string; doNotCall: boolean; funnel: ApiFunnel }>(
    `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/dnc`,
    { method: "POST", body: JSON.stringify({ value }) },
  );
  return {
    name: raw.name,
    doNotCall: raw.doNotCall,
    funnel: hydrateFunnel(raw.funnel),
  };
}

/** Manually set a lead's status (built-in or custom) and persist it. */
export async function updateLeadStatus(
  funnelId: string,
  leadId: string,
  status: string
): Promise<{ id: string; status: string }> {
  return apiRequest<{ id: string; status: string }>(
    `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
}

export async function deleteFunnel(funnelId: string): Promise<void> {
  await apiRequest<{ id: string; deleted: boolean }>(
    `/funnels/${encodeURIComponent(funnelId)}`,
    { method: "DELETE" }
  );
}

export async function backfillCompanyData(): Promise<{ total: number; updated: number }> {
  return apiRequest<{ total: number; updated: number }>("/funnels/backfill-company-data", {
    method: "POST",
  });
}

// ─── Funnel Members ─────────────────────────────────────────────────

export interface FunnelMemberData {
  id: string;
  userId: string;
  role: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl?: string | null;
  createdAt: string;
}

export async function getFunnelMembers(funnelId: string): Promise<FunnelMemberData[]> {
  return apiRequest<FunnelMemberData[]>(`/funnels/${encodeURIComponent(funnelId)}/members`);
}

export async function addFunnelMember(
  funnelId: string,
  userId: string,
  role: string,
): Promise<FunnelMemberData> {
  return apiRequest<FunnelMemberData>(`/funnels/${encodeURIComponent(funnelId)}/members`, {
    method: "POST",
    body: JSON.stringify({ userId, role }),
  });
}

export async function updateFunnelMemberRole(
  funnelId: string,
  userId: string,
  role: string,
): Promise<{ id: string; userId: string; role: string }> {
  return apiRequest(`/funnels/${encodeURIComponent(funnelId)}/members/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function removeFunnelMember(
  funnelId: string,
  userId: string,
): Promise<void> {
  await apiRequest(`/funnels/${encodeURIComponent(funnelId)}/members/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

export async function updateFunnelStatus(
  funnelId: string,
  status: FunnelStatus
): Promise<Funnel> {
  const data = await apiRequest<ApiFunnel>(
    `/funnels/${encodeURIComponent(funnelId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
  return hydrateFunnel(data);
}

export interface UpdateFunnelPayload {
  name?: string;
  description?: string;
  status?: FunnelStatus;
  steps?: Array<
    Pick<FunnelStep, "channel" | "label" | "dayOffset"> & {
      subject?: string;
      emailBody?: string;
      action?: string;
    }
  >;
  visibility?: CampaignVisibility;
  audience?: CampaignAudience;
  exit?: CampaignExitConditions;
  emailAutomation?: CampaignEmailAutomation;
  /** Full set of assigned member ids (besides the owner) — synced on the backend. */
  members?: string[];
}

/** Edit a campaign's name / description / steps. Replacing steps clamps each
 *  lead's progress to the new step count on the backend. */
export async function updateFunnel(
  funnelId: string,
  payload: UpdateFunnelPayload,
): Promise<Funnel> {
  const data = await apiRequest<ApiFunnel>(
    `/funnels/${encodeURIComponent(funnelId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return hydrateFunnel(data);
}
