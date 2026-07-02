/** staleTime tiers per data class. While data is fresh, React Query serves it
 *  from cache with NO network request — the knob that makes navigation
 *  instant. gcTime (set globally in QueryProvider) controls how long unused
 *  data survives for back-navigation. */
export const STALE = {
  /** Org configuration (team members, custom fields, statuses, outcomes,
   *  pipelines) — changes rarely; a manual invalidate covers edits. */
  ORG_CONFIG: 5 * 60_000,
  /** A campaign + its leads — revalidates in the background after 15s. */
  FUNNEL: 15_000,
  /** List surfaces (campaign list, sidebar). */
  LIST: 30_000,
  /** Activity-count badges — matches the backend's 60s server-side cache. */
  COUNTS: 60_000,
} as const;
