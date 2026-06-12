import { apiRequest, apiRequestRaw } from "./client";

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

export async function getOrgLeadCompanies(
  filters: LeadFilters & { page?: number; pageSize?: number },
): Promise<Paged<LeadCompanyRow>> {
  return apiRequestRaw<Paged<LeadCompanyRow>>(`/leads/companies${qs(filters)}`);
}

export async function getLeadsFacets(): Promise<LeadsFacets> {
  return apiRequest<LeadsFacets>(`/leads/facets`);
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
