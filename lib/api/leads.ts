import { apiRequest, apiRequestRaw, getAuthToken } from "./client";
import { hydrateLead } from "./funnels";
import type { FunnelLead } from "@/lib/types/funnel";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3001";

export interface OrgLead {
  id: string;
  funnelId: string;
  funnelName: string | null;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  status: string;
  source: string;
  sourceType: string;
  score: number;
  companyDomain: string | null;
  companyIndustry: string | null;
  companyEmployeeCount: number | null;
  companyLocation: string | null;
  doNotCall: boolean;
  opportunityId: string | null;
  createdAt: string;
}

export interface LeadCompanyRow {
  company: string;
  leadCount: number;
  campaigns: number;
  withEmail: number;
  withPhone: number;
  domain: string | null;
  industry: string | null;
  location: string | null;
  employees: number | null;
  status: string;
  callCount: number;
  emailCount: number;
  /** Canonical company id — deep-links to the universal company profile.
   *  Null until the company backfill has linked this company's leads. */
  masterCompanyId: string | null;
}

export interface LeadsFacets {
  total: number;
  companies: number;
  withEmail: number;
  withPhone: number;
  doNotCall: number;
  campaigns: { id: string; name: string }[];
  sources: string[];
  statuses: string[];
}

export interface LeadFilters {
  search?: string;
  company?: string;
  title?: string;
  location?: string;
  industry?: string;
  status?: string;
  sourceType?: string;
  funnelId?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasLinkedin?: boolean;
  doNotCall?: boolean;
  minEmployees?: number;
  maxEmployees?: number;
  /** Base64-encoded query-builder FilterGroup (Smart Views). */
  filter?: string;
}

interface Paged<T> {
  data: T[];
  meta: { page: number; pageSize: number; totalCount: number; totalPages: number };
}

function qs(params: Record<string, unknown> | (LeadFilters & { page?: number; pageSize?: number })): string {
  const p = params as Record<string, unknown>;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    sp.set(k, v === true ? "1" : String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function getOrgLeads(filters: LeadFilters & { page?: number; pageSize?: number }): Promise<Paged<OrgLead>> {
  return apiRequestRaw<Paged<OrgLead>>(`/leads${qs(filters)}`);
}

/** Load-all mode feeding the org-wide leads TABLE — full campaign-table lead
 *  shape (hydrated to FunnelLead), newest first, server-capped at 20k. */
export async function getAllOrgLeads(): Promise<{
  leads: FunnelLead[];
  totalCount: number;
  truncated: boolean;
}> {
  const res = await apiRequestRaw<{
    data: Record<string, unknown>[];
    meta: { totalCount: number; truncated: boolean };
  }>(`/leads?all=1`);
  const rows = Array.isArray(res.data) ? res.data : [];
  return {
    leads: rows.map((raw) => hydrateLead(raw as Parameters<typeof hydrateLead>[0])),
    totalCount: res.meta?.totalCount ?? rows.length,
    truncated: !!res.meta?.truncated,
  };
}

/** Deferred org-wide per-lead call/email totals (mirrors the per-funnel
 *  activity-counts endpoint; 60s server cache). */
export async function getOrgActivityCounts(): Promise<Record<string, { calls: number; emails: number }>> {
  const data = await apiRequest<{ counts: Record<string, { calls: number; emails: number }> }>(
    "/leads/activity-counts",
  );
  return data.counts ?? {};
}

export async function getOrgLeadCompanies(
  filters: LeadFilters & { page?: number; pageSize?: number },
): Promise<Paged<LeadCompanyRow>> {
  return apiRequestRaw<Paged<LeadCompanyRow>>(`/leads/companies${qs(filters)}`);
}

/** Fetch the filtered leads as CSV text (server applies the same filter). */
export async function exportOrgLeads(filters: LeadFilters): Promise<string> {
  const res = await fetch(`${API_BASE}/api/leads/export${qs(filters)}`, {
    headers: { Authorization: `Bearer ${getAuthToken() ?? ""}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Export failed");
  return res.text();
}

export async function getLeadsFacets(): Promise<LeadsFacets> {
  return apiRequest<LeadsFacets>(`/leads/facets`);
}

/** Resolve which campaign owns a lead — used to open its standalone profile
 *  when the funnel id isn't already known from the row. */
export async function getOrgLeadFunnel(id: string): Promise<{ funnelId: string }> {
  return apiRequest<{ funnelId: string }>(`/leads/${id}/funnel`);
}

/** Per-lead derived filter values (opportunity stage, AI call outcomes) —
 *  sparse map fetched only while a filter uses those fields. */
export async function getLeadFilterInsights(funnelId?: string): Promise<
  Record<string, { oppStage: string | null; callOutcomes: string[]; callDates: string[] }>
> {
  const params = funnelId ? `?funnelId=${encodeURIComponent(funnelId)}` : "";
  const res = await apiRequest<{ insights: Record<string, { oppStage: string | null; callOutcomes: string[]; callDates: string[] }> }>(
    `/leads/filter-insights${params}`,
  );
  return res.insights;
}

/** Lead ids whose call transcripts contain the phrase. */
export async function getTranscriptMatches(q: string, funnelId?: string): Promise<string[]> {
  const params = new URLSearchParams({ q });
  if (funnelId) params.set("funnelId", funnelId);
  const res = await apiRequest<{ leadIds: string[] }>(`/leads/transcript-matches?${params}`);
  return res.leadIds;
}

/** Permanently delete lead rows across the org (events/tasks/docs cascade). */
export async function bulkDeleteOrgLeads(leadIds: string[]): Promise<{ deleted: number }> {
  return apiRequest<{ deleted: number }>(`/leads/bulk-delete`, {
    method: "POST",
    body: JSON.stringify({ leadIds }),
  });
}

export async function createCampaignFromLeads(payload: {
  name: string;
  description?: string;
  status?: "draft" | "active";
  leadIds?: string[];
  filters?: LeadFilters;
}): Promise<{ funnelId: string; leadsAdded: number }> {
  return apiRequest<{ funnelId: string; leadsAdded: number }>(`/leads/campaign-from-filter`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
