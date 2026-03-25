export type ContactStatus = "discovered" | "enriched" | "in_funnel" | "dismissed";
export type ContactEnrichmentStatus = "none" | "pending" | "enriched" | "failed";

export interface ScraperContactRow {
  id: string;
  organizationId: string;
  assignmentId: string;
  discoveryRunId: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  headline: string | null;
  linkedinUrl: string | null;
  location: string | null;
  profileImageUrl: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  currentCompanyLinkedinUrl: string | null;
  companyName: string | null;
  companyDomain: string | null;
  companyLinkedinUrl: string | null;
  email: string | null;
  emailStatus: string | null;
  phone: string | null;
  phoneStatus: string | null;
  enrichmentStatus: ContactEnrichmentStatus;
  bettercontactRequestId: string | null;
  enrichedAt: string | null;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DiscoveryRunRow {
  id: string;
  organizationId: string;
  assignmentId: string;
  apifyRunId: string | null;
  apifyDatasetId: string | null;
  targetRoles: string[];
  seniorityLevels: string[];
  maxPerCompany: number;
  maxTotal: number;
  companyLinkedinUrls: string[];
  status: string;
  error: string | null;
  companiesQueried: number;
  contactsFound: number;
  estimatedCost: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  apifyStatus?: string;
}

export interface DiscoveryConfig {
  targetRoles: string[];
  seniorityLevels: string[];
  maxPerCompany: number;
  maxTotal: number;
  companyLinkedinUrls?: string[];
}
