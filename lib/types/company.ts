import type { FundingStage, SignalType, SeniorityLevel } from "./icp";

export type EnrichmentStatus = "not_enriched" | "partial" | "full" | "pending_review";

export interface CompanySignal {
  id: string;
  type: SignalType;
  summary: string;
  timestamp: Date;
}

export interface ICPCompany {
  id: string;
  name: string;
  domain: string;
  industry: string;
  employeeCount: number;
  revenue?: string;
  fundingStage: FundingStage;
  signals: CompanySignal[];
  enrichmentStatus: EnrichmentStatus;
  leadsEnriched: number;
  leadsTotal: number;
  relevanceScore: number;
  discoveredAt: Date;
  icpId: string;
}

export interface DepartmentBreakdown {
  department: string;
  total: number;
  cLevel: number;
  vp: number;
  director: number;
  manager: number;
  seniorIC: number;
  matchesPersona: boolean;
}

export interface OrgChartPreview {
  companyId: string;
  companyName: string;
  totalEmployees: number;
  departmentBreakdown: DepartmentBreakdown[];
  matchingCount: number;
  estimatedCost: number;
}
