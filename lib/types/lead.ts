import type { Department, SeniorityLevel } from "./icp";

export type LeadStatus = "discovered" | "enriching" | "enriched" | "in_funnel";

export interface EnrichedLead {
  id: string;
  name: string;
  title: string;
  company: string;
  companyId: string;
  department: Department;
  seniority: SeniorityLevel;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  enrichedAt: Date;
  sourceSignal: string;
  icpId: string;
  location: string | null;
  status: LeadStatus;
  funnelId: string | null;
}
