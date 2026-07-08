/** Single query-key registry. The funnel family is hierarchical —
 *  ["funnel", id] is the shared prefix of every variant (lite / full /
 *  fullLeadId), so one prefix invalidation or setQueriesData hits them all. */
export const qk = {
  funnels: ["funnels"] as const,
  funnel: (id: string, o?: { lite?: boolean; fullLeadId?: string | null }) =>
    ["funnel", id, { lite: !!o?.lite, fullLeadId: o?.fullLeadId ?? null }] as const,
  /** Prefix key for invalidate/setQueriesData across all of a funnel's variants. */
  funnelAll: (id: string) => ["funnel", id] as const,
  activityCounts: (id: string) => ["activity-counts", id] as const,
  /** Load-all org-wide leads for the /dashboard/leads table. */
  orgLeads: ["org-leads"] as const,
  orgActivityCounts: ["activity-counts", "org"] as const,
  /** Per-lead derived filter values (opp stage + AI call outcomes). Scope is
   *  a funnel id or "org". */
  leadFilterInsights: (scope: string) => ["lead-filter-insights", scope] as const,
  /** Lead ids whose call transcripts contain a keyword. */
  transcriptMatches: (scope: string, q: string) => ["transcript-matches", scope, q] as const,
  teamMembers: ["team-members"] as const,
  customFields: ["custom-fields"] as const,
  leadStatuses: ["lead-statuses"] as const,
  callOutcomes: ["call-outcomes"] as const,
  pipelines: ["pipelines"] as const,
  campaignTags: ["campaign-tags"] as const,
  /** The caller's own resolved permissions (from GET /team/me). */
  mePermissions: ["me-permissions"] as const,
  /** The caller's open tasks — polled for due-task reminders + the banner. */
  myOpenTasks: ["my-open-tasks"] as const,
  /** Built-in + custom org roles for the Team settings editor. */
  orgRoles: ["org-roles"] as const,
};
