import { apiRequest, apiRequestRaw } from "./client";
import type { ScraperContactRow, DiscoveryRunRow, DiscoveryConfig } from "../types/contact";

// ─── Discovery ──────────────────────────────────────────────────────

export async function startDiscovery(
  assignmentId: string,
  config: DiscoveryConfig,
): Promise<{ runId: string; apifyRunId: string; companiesQueried: number; estimatedCost: number }> {
  return apiRequest(`/contacts/discover/${assignmentId}`, {
    method: "POST",
    body: JSON.stringify(config),
  });
}

export async function getDiscoveryRuns(
  assignmentId: string,
): Promise<DiscoveryRunRow[]> {
  return apiRequest<DiscoveryRunRow[]>(
    `/contacts/discovery-runs?assignmentId=${assignmentId}`,
  );
}

export async function pollDiscoveryRun(
  runId: string,
): Promise<DiscoveryRunRow> {
  return apiRequest<DiscoveryRunRow>(
    `/contacts/discovery-runs/${runId}/poll`,
    { method: "POST" },
  );
}

export async function cancelDiscoveryRun(
  runId: string,
): Promise<DiscoveryRunRow> {
  return apiRequest<DiscoveryRunRow>(
    `/contacts/discovery-runs/${runId}/cancel`,
    { method: "POST" },
  );
}

// ─── Company Counts ─────────────────────────────────────────────────

export async function getContactCompanyCounts(
  assignmentId: string,
): Promise<{ companyLinkedinUrl: string | null; companyName: string | null; count: number }[]> {
  const result = await apiRequest<{ companyLinkedinUrl: string | null; companyName: string | null; count: number }[]>(
    `/contacts/company-counts?assignmentId=${assignmentId}`,
  );
  return result;
}

// ─── Contacts ───────────────────────────────────────────────────────

export async function getContacts(opts: {
  assignmentId: string;
  page?: number;
  pageSize?: number;
  status?: string;
  enrichmentStatus?: string;
  company?: string;
  title?: string;
  location?: string;
  hasEmail?: string;
  hasPhone?: string;
}): Promise<{ data: ScraperContactRow[]; meta: { page: number; pageSize: number; totalCount: number; totalPages: number } }> {
  const params = new URLSearchParams();
  params.set("assignmentId", opts.assignmentId);
  if (opts.page) params.set("page", String(opts.page));
  if (opts.pageSize) params.set("pageSize", String(opts.pageSize));
  if (opts.status) params.set("status", opts.status);
  if (opts.enrichmentStatus) params.set("enrichmentStatus", opts.enrichmentStatus);
  if (opts.company) params.set("company", opts.company);
  if (opts.title) params.set("title", opts.title);
  if (opts.location) params.set("location", opts.location);
  if (opts.hasEmail) params.set("hasEmail", opts.hasEmail);
  if (opts.hasPhone) params.set("hasPhone", opts.hasPhone);
  return apiRequestRaw(`/contacts?${params}`);
}

// ─── Enrichment ─────────────────────────────────────────────────────

export async function enrichContacts(
  contactIds: string[],
): Promise<{ requestIds: string[]; contactCount: number }> {
  return apiRequest(`/contacts/enrich`, {
    method: "POST",
    body: JSON.stringify({ contactIds }),
  });
}

export async function pollEnrichment(
  requestId: string,
): Promise<{ status: string; enrichedCount?: number }> {
  return apiRequest(`/contacts/enrich/${requestId}/poll`, {
    method: "POST",
  });
}

export async function pollEnrichmentAll(
  requestIds: string[],
): Promise<{ status: string; enrichedCount?: number }> {
  return apiRequest(`/contacts/enrich/poll-all`, {
    method: "POST",
    body: JSON.stringify({ requestIds }),
  });
}

// ─── Status ─────────────────────────────────────────────────────────

export async function updateContactStatus(
  id: string,
  status: string,
): Promise<{ id: string; status: string }> {
  return apiRequest(`/contacts/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function bulkUpdateContactStatus(
  contactIds: string[],
  status: string,
): Promise<{ updated: number; status: string }> {
  return apiRequest(`/contacts/bulk-status`, {
    method: "POST",
    body: JSON.stringify({ contactIds, status }),
  });
}

// ─── Send to Funnel ─────────────────────────────────────────────────

/** Filter set mirroring the contacts list query — used to send every
 *  contact matching the current filters ("Select all matching"). */
export interface ContactFilterPayload {
  assignmentId?: string;
  status?: string;
  enrichmentStatus?: string;
  company?: string;
  title?: string;
  location?: string;
  hasEmail?: string;
  hasPhone?: string;
}

export type ContactSelection =
  | { contactIds: string[] }
  | { allMatching: true; filters: ContactFilterPayload };

export async function sendContactsToFunnel(
  funnelId: string,
  selection: ContactSelection,
): Promise<{ created: number; skipped: number; funnelId: string; funnelName: string }> {
  return apiRequest(`/contacts/send-to-funnel`, {
    method: "POST",
    body: JSON.stringify({ funnelId, ...selection }),
  });
}

// ─── Reset Enrichment ───────────────────────────────────────────────

export async function resetEnrichment(
  contactIds: string[],
): Promise<{ reset: number }> {
  return apiRequest(`/contacts/reset-enrichment`, {
    method: "POST",
    body: JSON.stringify({ contactIds }),
  });
}

export async function resetStuckEnrichments(
  assignmentId: string,
): Promise<{ reset: number }> {
  return apiRequest(`/contacts/reset-stuck`, {
    method: "POST",
    body: JSON.stringify({ assignmentId }),
  });
}
