import type {
  Funnel,
  FunnelChannel,
  FunnelLead,
  FunnelLeadEvent,
  FunnelMember,
  LeadStatus,
  FunnelStatus,
  FunnelStep,
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
  if (normalized === "linkedin" || normalized === "call" || normalized === "whatsapp") {
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
    notes: notes && typeof notes === "object" && !Array.isArray(notes) ? notes : undefined,
    linkedinUrl: (raw as any).linkedinUrl || undefined,
    unipileProviderId: (raw as any).unipileProviderId || null,
    createdAt: (raw as any).createdAt ? parseDate((raw as any).createdAt) : undefined,
    events,
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
    createdAt: parseDate(raw.createdAt),
  };
}

export async function listFunnels(): Promise<Funnel[]> {
  const data = await apiRequest<ApiFunnel[]>("/funnels");
  return data.map(hydrateFunnel);
}

export async function getFunnelById(funnelId: string): Promise<Funnel> {
  const data = await apiRequest<ApiFunnel>(`/funnels/${encodeURIComponent(funnelId)}`);
  return hydrateFunnel(data);
}

export interface CreateFunnelPayload {
  name: string;
  description: string;
  status?: FunnelStatus;
  steps: Array<Pick<FunnelStep, "channel" | "label" | "dayOffset"> & { subject?: string; emailBody?: string; action?: string }>;
  sourceTypes?: Array<"csv" | "signals" | "webhook" | "companies">;
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
  steps?: Array<
    Pick<FunnelStep, "channel" | "label" | "dayOffset"> & {
      subject?: string;
      emailBody?: string;
      action?: string;
    }
  >;
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
