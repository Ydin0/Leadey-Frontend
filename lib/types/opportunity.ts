// ─── Opportunity CRM types (wire shape from the backend) ────────────

export type StageType = "open" | "won" | "lost";

export interface PipelineStage {
  id: string;
  pipelineId: string;
  slug: string;
  label: string;
  sortOrder: number;
  type: StageType;
  defaultProbability: number;
  color: string | null;
}

export interface PipelineMember {
  id: string;
  userId: string;
  role: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  /** Number of opportunities in this pipeline (all stages). */
  opportunityCount?: number;
  stages: PipelineStage[];
  /** Users assigned to this pipeline (admins assign via the header panel). */
  members?: PipelineMember[];
}

export interface Opportunity {
  id: string;
  pipelineId: string;
  stageId: string;
  name: string;
  masterCompanyId: string | null;
  masterContactId: string | null;
  ownerId: string | null;
  sourceLeadId: string | null;
  /** Funnel (campaign) of the source lead, when converted from a campaign lead.
   *  Lets opportunity clicks deep-link into the Lead View. Null for manual opps. */
  funnelId: string | null;
  value: number;
  currency: string;
  probabilityOverride: number | null;
  expectedCloseDate: string | null; // YYYY-MM-DD
  closedAt: string | null;
  lostReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityCompany {
  id: string;
  name: string;
  domain: string | null;
  logo: string | null;
  industry: string | null;
}

export interface OpportunityContact {
  id: string;
  fullName: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string | null;
  phone: string | null;
  currentTitle: string | null;
  linkedinUrl?: string | null;
  role?: string | null;
}

export interface OpportunityDetail extends Opportunity {
  company: OpportunityCompany | null;
  primaryContact: OpportunityContact | null;
  additionalContacts: OpportunityContact[];
}

export type OpportunityEventType =
  | "created"
  | "stage_changed"
  | "owner_changed"
  | "value_changed"
  | "close_date_changed"
  | "note_added"
  | "won"
  | "lost"
  | "reopened"
  | "contact_added"
  | "contact_removed";

export interface OpportunityEvent {
  id: string;
  opportunityId: string;
  type: OpportunityEventType;
  meta: Record<string, unknown> | null;
  userId: string | null;
  userName: string | null;
  createdAt: string;
}

export interface OpportunitySummary {
  totalCount: number;
  openCount: number;
  totalValue: number;
  weightedValue: number;
  byStage: Array<{ stageId: string; count: number; totalValue: number }>;
  won: { count: number; totalValue: number };
  lost: { count: number; totalValue: number };
  wonThisMonth: { count: number; totalValue: number };
  avgDealSize: number;
  winRate: number;
}
