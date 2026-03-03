import type {
  Funnel,
  FunnelChannel,
  FunnelLead,
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

function asLeadStatus(value: unknown): LeadStatus {
  const normalized = asString(value).toLowerCase();
  if (normalized === "contacted") return "contacted";
  if (normalized === "no_answer") return "no_answer";
  if (normalized === "interested") return "interested";
  if (normalized === "not_interested") return "not_interested";
  if (normalized === "callback") return "callback";
  if (normalized === "competitor") return "competitor";
  if (normalized === "dnc") return "dnc";
  if (normalized === "other_contact") return "other_contact";
  if (normalized === "qualified") return "qualified";
  if (normalized === "bounced") return "bounced";
  if (normalized === "completed") return "completed";
  return "new";
}

function hydrateLead(raw: ApiFunnelLead): FunnelLead {
  const notes = (raw as any).notes;
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
    notes: notes && typeof notes === "object" && !Array.isArray(notes) ? notes : undefined,
    unipileProviderId: (raw as any).unipileProviderId || null,
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

export interface ImportCsvPayload {
  fileName: string;
  mappings: CsvColumnMapping[];
  rows: Record<string, string>[];
}

export interface ImportCsvResult {
  importId: string;
  funnelId: string;
  fileName: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: Array<{ row: number; reason: string }>;
  addedLeadIds: string[];
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

export async function deleteFunnel(funnelId: string): Promise<void> {
  await apiRequest<{ id: string; deleted: boolean }>(
    `/funnels/${encodeURIComponent(funnelId)}`,
    { method: "DELETE" }
  );
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
