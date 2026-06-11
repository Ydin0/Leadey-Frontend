import { apiRequest, apiRequestRaw } from "./client";

export interface ImportRecord {
  id: string;
  funnelId: string;
  funnelName: string;
  fileName: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  /** ISO timestamp set when the import was rolled back, else null. */
  rolledBackAt: string | null;
  createdAt: string;
  /** How many of the import's leads still exist (0 after a rollback). */
  liveLeadCount: number;
}

export interface ImportLead {
  id: string;
  funnelId: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; totalCount: number; totalPages: number };
}

/** Every CSV import for the org, newest first. */
export async function listImports(page = 1, pageSize = 25): Promise<Paginated<ImportRecord>> {
  return apiRequestRaw<Paginated<ImportRecord>>(`/imports?page=${page}&pageSize=${pageSize}`);
}

/** The still-existing leads from one import. */
export async function getImportLeads(
  importId: string,
  page = 1,
  pageSize = 50,
): Promise<Paginated<ImportLead>> {
  return apiRequestRaw<Paginated<ImportLead>>(
    `/imports/${encodeURIComponent(importId)}/leads?page=${page}&pageSize=${pageSize}`,
  );
}

/** Delete the campaign leads this import created (master contacts preserved).
 *  Keeps the import row marked "Rolled back". */
export async function rollbackImport(importId: string): Promise<{ deleted: number; rolledBack: boolean }> {
  return apiRequest<{ deleted: number; rolledBack: boolean }>(
    `/imports/${encodeURIComponent(importId)}/rollback`,
    { method: "POST" },
  );
}
