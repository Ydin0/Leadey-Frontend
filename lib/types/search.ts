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
}

export interface GlobalSearchResponse {
  query: string;
  results: SearchResult[];
}
