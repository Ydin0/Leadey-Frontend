import { apiRequest } from "./client";
import type { GlobalSearchResponse } from "@/lib/types/search";

/** Org-scoped global search across campaigns, leads, opportunities,
 *  companies, contacts and team members. */
export async function globalSearch(
  query: string,
  signal?: AbortSignal,
): Promise<GlobalSearchResponse> {
  return apiRequest<GlobalSearchResponse>(
    `/search?q=${encodeURIComponent(query)}`,
    { signal },
  );
}
