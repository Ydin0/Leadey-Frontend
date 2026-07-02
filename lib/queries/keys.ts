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
  teamMembers: ["team-members"] as const,
  customFields: ["custom-fields"] as const,
  leadStatuses: ["lead-statuses"] as const,
  callOutcomes: ["call-outcomes"] as const,
  pipelines: ["pipelines"] as const,
};
