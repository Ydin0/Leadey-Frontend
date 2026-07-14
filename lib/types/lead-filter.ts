// ─── Close-style lead filter spec ────────────────────────────────────────
// One shared definition used by the query-builder UI, the client-side
// evaluator (campaign leads) and (later) the server-side SQL engine + Smart
// Views, so all surfaces filter identically.

export type FilterOperator =
  | "is"
  | "is_not"
  | "contains"
  | "not_contains"
  | "is_empty"
  | "is_set"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "before"
  | "after";

export type FilterFieldType = "text" | "number" | "enum" | "boolean" | "date";

export interface FilterCondition {
  field: string;
  op: FilterOperator;
  /** Single value, range [min,max] for `between`, or multi-select for enum `is`. */
  value?: string | number | string[] | null;
}

export interface FilterGroup {
  match: "and" | "or";
  conditions: FilterCondition[];
}

export const EMPTY_FILTER: FilterGroup = { match: "and", conditions: [] };

export interface FilterFieldDef {
  key: string;
  label: string;
  group: "Lead" | "Company" | "Activity" | "Opportunity" | "Custom";
  type: FilterFieldType;
  operators: FilterOperator[];
  /** Static enum options (e.g. boolean); dynamic ones (status/company) are
   *  supplied at runtime via the builder's `dynamicOptions`. */
  options?: { value: string; label: string }[];
  /** For enum fields whose options are provided at runtime, keyed by this id. */
  dynamicOptionsKey?: string;
}

const TEXT_OPS: FilterOperator[] = ["contains", "not_contains", "is", "is_not", "is_set", "is_empty"];
const NUM_OPS: FilterOperator[] = ["gt", "gte", "lt", "lte", "between", "is", "is_set", "is_empty"];
const ENUM_OPS: FilterOperator[] = ["is", "is_not", "is_set", "is_empty"];
const BOOL_OPS: FilterOperator[] = ["is"];
const DATE_OPS: FilterOperator[] = ["before", "after", "between"];

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  is: "is",
  is_not: "is not",
  contains: "contains",
  not_contains: "doesn't contain",
  is_empty: "is empty",
  is_set: "is set",
  gt: "greater than",
  gte: "at least",
  lt: "less than",
  lte: "at most",
  between: "between",
  before: "before",
  after: "after",
};

/** Operators that take no value (just presence checks). */
export const NO_VALUE_OPS: ReadonlySet<FilterOperator> = new Set(["is_empty", "is_set"]);

// The filterable lead fields. `group` drives the optgroup labels in the picker.
export const LEAD_FILTER_FIELDS: FilterFieldDef[] = [
  // Lead
  { key: "name", label: "Name", group: "Lead", type: "text", operators: TEXT_OPS },
  { key: "firstName", label: "First name", group: "Lead", type: "text", operators: TEXT_OPS },
  { key: "lastName", label: "Last name", group: "Lead", type: "text", operators: TEXT_OPS },
  { key: "title", label: "Title", group: "Lead", type: "text", operators: TEXT_OPS },
  { key: "email", label: "Email", group: "Lead", type: "text", operators: TEXT_OPS },
  { key: "phone", label: "Phone", group: "Lead", type: "text", operators: TEXT_OPS },
  { key: "linkedinUrl", label: "LinkedIn URL", group: "Lead", type: "text", operators: TEXT_OPS },
  { key: "status", label: "Status", group: "Lead", type: "enum", operators: ENUM_OPS, dynamicOptionsKey: "status" },
  { key: "source", label: "Source", group: "Lead", type: "enum", operators: ENUM_OPS, dynamicOptionsKey: "source" },
  // Campaign membership — org all-leads page only (a person enrolled in N
  // campaigns is N lead rows, so "is any of" matches per enrollment). Hidden on
  // single-campaign pages via the side panel's excludeKeys.
  { key: "funnelId", label: "Campaign", group: "Lead", type: "enum", operators: ["is", "is_not"], dynamicOptionsKey: "campaign" },
  { key: "score", label: "Score", group: "Lead", type: "number", operators: NUM_OPS },
  { key: "doNotCall", label: "Do Not Contact", group: "Lead", type: "boolean", operators: BOOL_OPS, options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
  { key: "createdAt", label: "Added", group: "Lead", type: "date", operators: DATE_OPS },
  // Company
  { key: "company", label: "Company name", group: "Company", type: "text", operators: TEXT_OPS },
  { key: "companyDomain", label: "Domain", group: "Company", type: "text", operators: TEXT_OPS },
  { key: "companyIndustry", label: "Industry", group: "Company", type: "enum", operators: ENUM_OPS, dynamicOptionsKey: "industry" },
  { key: "companyLocation", label: "Location", group: "Company", type: "enum", operators: ENUM_OPS, dynamicOptionsKey: "location" },
  { key: "companyEmployeeCount", label: "Company size", group: "Company", type: "number", operators: NUM_OPS },
  { key: "companyAnnualRevenue", label: "Annual revenue", group: "Company", type: "text", operators: TEXT_OPS },
  { key: "companyHiringRoles", label: "Hiring roles", group: "Company", type: "text", operators: ["is_set", "is_empty", "contains"] },
  { key: "leadsInCompany", label: "Leads in company", group: "Company", type: "number", operators: ["gte", "lte", "is", "between"] },
  // Activity
  { key: "callCount", label: "Calls made", group: "Activity", type: "number", operators: ["gte", "lte", "is", "between"] },
  { key: "emailCount", label: "Emails sent", group: "Activity", type: "number", operators: ["gte", "lte", "is", "between"] },
  // AI call categorization (call_records.outcome — org-defined label set).
  { key: "callOutcome", label: "Call outcome (AI)", group: "Activity", type: "enum", operators: ENUM_OPS, dynamicOptionsKey: "callOutcome" },
  // Any call transcript containing a phrase (server-resolved match set).
  { key: "transcriptKeywords", label: "Call transcript", group: "Activity", type: "text", operators: ["contains", "not_contains"] },
  // Date a call was placed to the lead — "called between Mon and Fri" (server-resolved from call_records).
  { key: "callDate", label: "Call date", group: "Activity", type: "date", operators: ["between", "before", "after", "is_set", "is_empty"] },
  // Whether the lead has been called at all TODAY — power-dialer staple ("who
  // haven't I reached yet today?"). "No" includes never-called leads.
  { key: "calledToday", label: "Called today", group: "Activity", type: "boolean", operators: BOOL_OPS, options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
  // Opportunity
  { key: "hasOpportunity", label: "Has opportunity", group: "Opportunity", type: "boolean", operators: BOOL_OPS, options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
  { key: "oppStage", label: "Opportunity stage", group: "Opportunity", type: "enum", operators: ENUM_OPS, dynamicOptionsKey: "oppStage" },
];

export function fieldDef(key: string): FilterFieldDef | undefined {
  return LEAD_FILTER_FIELDS.find((f) => f.key === key);
}

/** Build filter fields for the org's custom lead fields (keyed `custom:<key>`).
 *  All treated as text so the client + server evaluators stay consistent. */
export function customFieldsToFilterFields(
  defs: { key: string; label: string }[],
): FilterFieldDef[] {
  return defs.map((d) => ({
    key: `custom:${d.key}`,
    label: d.label,
    group: "Custom" as const,
    type: "text" as const,
    operators: ["contains", "is", "is_not", "is_set", "is_empty"] as FilterOperator[],
  }));
}

/** Count of conditions that are "complete" enough to apply (used for the pill badge). */
export function activeConditionCount(group: FilterGroup | null | undefined): number {
  if (!group) return 0;
  return group.conditions.filter((c) => c.field && c.op && (NO_VALUE_OPS.has(c.op) || c.value != null && c.value !== "" && !(Array.isArray(c.value) && c.value.length === 0))).length;
}
