import type { EnrichmentStatus } from "./company";
import type { FundingStage, SignalType } from "./icp";

export type CompanyLifecycleStage =
  | "new"
  | "monitoring"
  | "engaging"
  | "in_funnel"
  | "customer";

export type CompanyRiskLevel = "healthy" | "watch" | "at_risk";

export type CompanyActionPriority = "high" | "medium" | "low";

export interface CompanyOwnerDirectoryEntry {
  id: string;
  name: string;
  role: "manager" | "rep";
  team: string;
  avatarSeed: string;
  responseSlaHours: number;
  capacityTarget: number;
}

export interface CompanyCommandSignal {
  id: string;
  type: SignalType;
  summary: string;
  timestamp: Date;
}

export interface CompanyCommandAccount {
  id: string;
  name: string;
  domain: string;
  industry: string;
  employeeCount: number;
  fundingStage: FundingStage;
  icpId: string;
  icpName: string;
  enrichmentStatus: EnrichmentStatus;
  relevanceScore: number;
  healthScore: number;
  healthDelta: number;
  riskLevel: CompanyRiskLevel;
  stage: CompanyLifecycleStage;
  ownerId: string | null;
  ownerName: string | null;
  ownerTeam: string | null;
  signalsLast7d: number;
  totalSignals: number;
  lastSignalAt: Date;
  leadCoveragePct: number;
  leadsEnriched: number;
  leadTarget: number;
  discoveredLeads: number;
  inFunnelLeads: number;
  activeFunnelNames: string[];
  estimatedPipelineUsd: number;
  lastTouchAt: Date | null;
  nextAction: string;
  nextActionPriority: CompanyActionPriority;
  nextActionDueAt: Date;
  topSignals: CompanyCommandSignal[];
}

export interface CompanyOwnerPerformance {
  ownerId: string;
  ownerName: string;
  role: "manager" | "rep";
  team: string;
  managedCompanies: number;
  atRiskCompanies: number;
  avgHealthScore: number;
  avgCoveragePct: number;
  openActions: number;
  signalsLast7d: number;
  inFunnelLeads: number;
  responseSlaHours: number;
  capacityTarget: number;
}

export interface CompanyPriorityQueueItem {
  id: string;
  companyId: string;
  companyName: string;
  ownerName: string;
  reason: string;
  action: string;
  priority: CompanyActionPriority;
  dueAt: Date;
  estimatedCredits: number;
}

export interface CompanyCommandOverview {
  totalCompanies: number;
  monitoredCompanies: number;
  atRiskCompanies: number;
  unassignedCompanies: number;
  avgHealthScore: number;
  avgCoveragePct: number;
  totalSignalsLast7d: number;
  dueTodayActions: number;
}

export interface CompaniesCommandCenterSnapshot {
  generatedAt: Date;
  overview: CompanyCommandOverview;
  owners: CompanyOwnerDirectoryEntry[];
  ownerPerformance: CompanyOwnerPerformance[];
  queue: CompanyPriorityQueueItem[];
  accounts: CompanyCommandAccount[];
}
