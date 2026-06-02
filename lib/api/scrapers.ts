import { apiRequest, apiRequestRaw } from "./client";
import type { TheirStackFilters, SearchResultRow, PaginatedResponse } from "../types/scraper";

// ─── Types ───────────────────────────────────────────────────────────

export interface ScraperAssignmentRow {
  id: string;
  organizationId: string;
  scraperId: string;
  scraperName: string;
  searchName: string;
  enabled: boolean;
  frequency: string;
  status: string;
  keywords: string[];
  excludedKeywords: string[];
  keywordMatchMode: string;
  countries: string[];
  languages: string[];
  sourceIds: string[];
  sourceSignalLimits: Record<string, number>;
  jobSeniority: string[];
  remoteFilter: string;
  lookbackDays: number;
  maxSignalsPerRun: number;
  minSignalScore: number;
  onlyDecisionMakers: boolean;
  dedupeCompanies: boolean;
  includeRemoteRoles: boolean;
  notifyOnHighIntent: boolean;
  signalsFound: number;
  companiesFound: number;
  creditsPerRun: number;
  totalResults: number;
  lastRunResultCount: number;
  filters: TheirStackFilters;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScraperRunRow {
  id: string;
  assignmentId: string;
  sourceId: string;
  status: string;
  error: string | null;
  itemsScraped: number;
  signalsCreated: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ScraperSignalRow {
  id: string;
  assignmentId: string;
  runId: string | null;
  sourceId: string;
  jobTitle: string;
  company: string;
  companyDomain: string | null;
  location: string | null;
  jobUrl: string | null;
  description: string | null;
  salary: string | null;
  postedAt: string | null;
  jobType: string | null;
  isRemote: boolean;
  score: number;
  signalType: string;
  status: string;
  createdAt: string;
}

export interface RunResult {
  assignmentId: string;
  runId: string;
  totalResults: number;
  itemsReturned: number;
  signalsCreated: number;
  companiesFound: number;
}

// ─── Assignments ─────────────────────────────────────────────────────

export async function getScraperAssignments(): Promise<ScraperAssignmentRow[]> {
  return apiRequest<ScraperAssignmentRow[]>("/scrapers/assignments");
}

export async function createScraperAssignment(
  body: Partial<ScraperAssignmentRow>,
): Promise<ScraperAssignmentRow> {
  return apiRequest<ScraperAssignmentRow>("/scrapers/assignments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateScraperAssignment(
  id: string,
  body: Partial<ScraperAssignmentRow>,
): Promise<ScraperAssignmentRow> {
  return apiRequest<ScraperAssignmentRow>(`/scrapers/assignments/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteScraperAssignment(id: string): Promise<void> {
  await apiRequest<{ deleted: boolean }>(`/scrapers/assignments/${id}`, {
    method: "DELETE",
  });
}

// ─── Runs ────────────────────────────────────────────────────────────

export async function triggerScraperRun(
  assignmentId: string,
  signal?: AbortSignal,
): Promise<RunResult> {
  return apiRequest<RunResult>(
    `/scrapers/assignments/${assignmentId}/run`,
    { method: "POST", signal },
  );
}

export async function getScraperRuns(
  assignmentId?: string,
): Promise<ScraperRunRow[]> {
  const qs = assignmentId ? `?assignmentId=${assignmentId}` : "";
  return apiRequest<ScraperRunRow[]>(`/scrapers/runs${qs}`);
}

// ─── Signals ─────────────────────────────────────────────────────────

export async function getScraperSignals(filters?: {
  assignmentId?: string;
  sourceId?: string;
  status?: string;
}): Promise<ScraperSignalRow[]> {
  const params = new URLSearchParams();
  if (filters?.assignmentId) params.set("assignmentId", filters.assignmentId);
  if (filters?.sourceId) params.set("sourceId", filters.sourceId);
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();
  return apiRequest<ScraperSignalRow[]>(`/scrapers/signals${qs ? `?${qs}` : ""}`);
}

export async function updateSignalStatus(
  id: string,
  status: string,
): Promise<{ id: string; status: string }> {
  return apiRequest<{ id: string; status: string }>(
    `/scrapers/signals/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

// ─── Saved Searches ─────────────────────────────────────────────────

export async function createSavedSearch(body: {
  searchName: string;
  filters: TheirStackFilters;
  frequency?: string;
  enabled?: boolean;
  maxSignalsPerRun?: number;
  minSignalScore?: number;
  lookbackDays?: number;
}): Promise<ScraperAssignmentRow> {
  return apiRequest<ScraperAssignmentRow>("/scrapers/assignments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateSavedSearch(
  id: string,
  body: {
    searchName?: string;
    filters?: TheirStackFilters;
    frequency?: string;
    enabled?: boolean;
    maxSignalsPerRun?: number;
    minSignalScore?: number;
  },
): Promise<ScraperAssignmentRow> {
  return apiRequest<ScraperAssignmentRow>(`/scrapers/assignments/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function getSearchResults(
  assignmentId: string,
  opts?: { page?: number; pageSize?: number; sortBy?: string; sortOrder?: string },
): Promise<PaginatedResponse<SearchResultRow>> {
  const params = new URLSearchParams();
  params.set("assignmentId", assignmentId);
  if (opts?.page) params.set("page", String(opts.page));
  if (opts?.pageSize) params.set("pageSize", String(opts.pageSize));
  if (opts?.sortBy) params.set("sortBy", opts.sortBy);
  if (opts?.sortOrder) params.set("sortOrder", opts.sortOrder);
  // This endpoint returns { data, meta } — use apiRequestRaw to get full payload
  return apiRequestRaw<PaginatedResponse<SearchResultRow>>(`/scrapers/signals?${params}`);
}

export async function previewSearch(
  assignmentId: string,
  filters?: TheirStackFilters,
): Promise<{ data: unknown[]; meta: { totalResults: number; totalCompanies: number; returned: number } }> {
  return apiRequest(`/scrapers/assignments/${assignmentId}/preview`, {
    method: "POST",
    body: JSON.stringify({ filters }),
  });
}

export async function bulkUpdateSignalStatus(
  signalIds: string[],
  status: string,
): Promise<{ updated: number; status: string }> {
  return apiRequest<{ updated: number; status: string }>(
    "/scrapers/signals/bulk-status",
    {
      method: "POST",
      body: JSON.stringify({ signalIds, status }),
    },
  );
}
