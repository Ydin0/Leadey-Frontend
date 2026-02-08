import type {
  Funnel,
  FunnelChannel,
  FunnelLead,
  FunnelLeadStatus,
  FunnelStatus,
  FunnelStep,
} from "@/lib/types/funnel";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3001";

interface ApiEnvelope<T> {
  data: T;
}

interface ApiErrorEnvelope {
  error?: {
    message?: string;
  };
}

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
  if (normalized === "linkedin" || normalized === "call") {
    return normalized;
  }
  return "email";
}

function asLeadStatus(value: unknown): FunnelLeadStatus {
  const normalized = asString(value).toLowerCase();
  if (normalized === "sent") return "sent";
  if (normalized === "opened") return "opened";
  if (normalized === "clicked") return "clicked";
  if (normalized === "replied") return "replied";
  if (normalized === "bounced") return "bounced";
  if (normalized === "completed") return "completed";
  return "pending";
}

function hydrateLead(raw: ApiFunnelLead): FunnelLead {
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
  };
}

function hydrateFunnel(raw: ApiFunnel): Funnel {
  const steps: FunnelStep[] = Array.isArray(raw.steps)
    ? raw.steps.map((step) => ({
        id: asString(step.id),
        channel: asChannel(step.channel),
        label: asString(step.label),
        dayOffset: asNumber(step.dayOffset),
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
    cockpit: raw.cockpit || {
      linkedin: [],
      calls: [],
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
    createdAt: parseDate(raw.createdAt),
  };
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | ApiErrorEnvelope
    | null;

  if (!response.ok) {
    const message = payload && "error" in payload ? payload.error?.message : null;
    throw new Error(message || `API request failed (${response.status})`);
  }

  if (!payload || !("data" in payload)) {
    throw new Error("Malformed API response");
  }

  return payload.data;
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
  steps: Array<Pick<FunnelStep, "channel" | "label" | "dayOffset">>;
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
