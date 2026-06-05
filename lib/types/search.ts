export type SearchResultType =
  | "campaign"
  | "lead"
  | "opportunity"
  | "company"
  | "contact"
  | "member";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  imageUrl?: string | null;
  /** Company domain — its favicon is shown as the result icon (with the
   *  group's lucide icon as a fallback). */
  domain?: string | null;
}

export interface GlobalSearchResponse {
  query: string;
  results: SearchResult[];
}
