import { mockCompanies } from "./companies";
import { mockFunnels } from "./funnels";
import { mockICPs } from "./icps";
import { mockLeads } from "./leads";
import type { ICPCompany } from "../types/company";
import type {
  CompaniesCommandCenterSnapshot,
  CompanyActionPriority,
  CompanyCommandAccount,
  CompanyCommandOverview,
  CompanyOwnerDirectoryEntry,
  CompanyOwnerPerformance,
  CompanyPriorityQueueItem,
  CompanyRiskLevel,
} from "../types/companies-command-center";
import type { EnrichedLead } from "../types/lead";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const ownerDirectory: CompanyOwnerDirectoryEntry[] = [
  {
    id: "owner_001",
    name: "Amira Johnson",
    role: "manager",
    team: "Enterprise",
    avatarSeed: "AJ",
    responseSlaHours: 4,
    capacityTarget: 6,
  },
  {
    id: "owner_002",
    name: "Lucas Park",
    role: "rep",
    team: "Enterprise",
    avatarSeed: "LP",
    responseSlaHours: 6,
    capacityTarget: 5,
  },
  {
    id: "owner_003",
    name: "Nora Chen",
    role: "rep",
    team: "Mid-Market",
    avatarSeed: "NC",
    responseSlaHours: 5,
    capacityTarget: 5,
  },
  {
    id: "owner_004",
    name: "Daniel Brown",
    role: "manager",
    team: "Mid-Market",
    avatarSeed: "DB",
    responseSlaHours: 8,
    capacityTarget: 7,
  },
  {
    id: "owner_005",
    name: "Sophie Lee",
    role: "rep",
    team: "Strategic",
    avatarSeed: "SL",
    responseSlaHours: 6,
    capacityTarget: 4,
  },
];

const ownerAssignmentByCompanyId: Record<string, string | null> = {
  co_001: "owner_001",
  co_002: "owner_003",
  co_003: "owner_004",
  co_004: null,
  co_005: "owner_001",
  co_006: "owner_002",
  co_007: "owner_003",
  co_008: null,
  co_009: "owner_005",
  co_010: "owner_002",
  co_011: "owner_003",
  co_012: "owner_004",
  co_013: "owner_001",
  co_014: null,
  co_015: "owner_005",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function daysSince(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / DAY_MS);
}

function mapLeadsByCompany(leads: EnrichedLead[]) {
  const map = new Map<string, EnrichedLead[]>();
  for (const lead of leads) {
    const bucket = map.get(lead.companyId);
    if (bucket) {
      bucket.push(lead);
    } else {
      map.set(lead.companyId, [lead]);
    }
  }
  return map;
}

function latestTouch(leads: EnrichedLead[]) {
  if (leads.length === 0) return null;
  return leads.reduce(
    (latest, lead) =>
      lead.enrichedAt.getTime() > latest.getTime() ? lead.enrichedAt : latest,
    leads[0].enrichedAt
  );
}

function detectStage(params: {
  inFunnelLeads: number;
  leadsEnriched: number;
  signalsLast7d: number;
  discoveredDaysAgo: number;
}) {
  if (params.inFunnelLeads >= 8) return "customer" as const;
  if (params.inFunnelLeads > 0) return "in_funnel" as const;
  if (params.leadsEnriched >= 8) return "engaging" as const;
  if (params.signalsLast7d > 0) return "monitoring" as const;
  if (params.discoveredDaysAgo <= 4) return "monitoring" as const;
  return "new" as const;
}

function detectRisk(params: {
  healthScore: number;
  signalFreshnessDays: number;
  coveragePct: number;
  signalsLast7d: number;
}) {
  if (
    params.healthScore < 62 ||
    params.signalFreshnessDays >= 7 ||
    (params.coveragePct < 20 && params.signalsLast7d > 0)
  ) {
    return "at_risk" as const;
  }
  if (
    params.healthScore < 78 ||
    params.signalFreshnessDays >= 4 ||
    params.coveragePct < 35
  ) {
    return "watch" as const;
  }
  return "healthy" as const;
}

function decideNextAction(params: {
  hasOwner: boolean;
  riskLevel: CompanyRiskLevel;
  coveragePct: number;
  inFunnelLeads: number;
  signalsLast7d: number;
  signalFreshnessDays: number;
}) {
  if (!params.hasOwner) {
    return {
      action: "Assign owner and kick off account plan",
      priority: "high" as const,
      dueAt: new Date(Date.now() + 4 * HOUR_MS),
      reason: "No owner assigned while active signals are coming in.",
      estimatedCredits: 40,
    };
  }

  if (params.coveragePct < 20) {
    return {
      action: "Run enrichment pass on sales and RevOps personas",
      priority: "high" as const,
      dueAt: new Date(Date.now() + 6 * HOUR_MS),
      reason: "Lead coverage is below 20%, causing missed outreach opportunities.",
      estimatedCredits: 180,
    };
  }

  if (params.inFunnelLeads === 0 && params.signalsLast7d > 0) {
    return {
      action: "Move highest-fit contacts into active funnel",
      priority: "medium" as const,
      dueAt: new Date(Date.now() + 20 * HOUR_MS),
      reason: "Fresh signals are present, but no leads are enrolled in funnel execution.",
      estimatedCredits: 120,
    };
  }

  if (params.riskLevel === "at_risk") {
    return {
      action: "Refresh source rules and re-score account fit",
      priority: "medium" as const,
      dueAt: new Date(Date.now() + 24 * HOUR_MS),
      reason: "Health score degraded and needs requalification.",
      estimatedCredits: 90,
    };
  }

  if (params.signalFreshnessDays > 4) {
    return {
      action: "Review scraper coverage and refresh signal feed",
      priority: "medium" as const,
      dueAt: new Date(Date.now() + 36 * HOUR_MS),
      reason: "Signal recency is dropping and may impact timing quality.",
      estimatedCredits: 70,
    };
  }

  return {
    action: "Monitor and respond to new buying triggers",
    priority: "low" as const,
    dueAt: new Date(Date.now() + 60 * HOUR_MS),
    reason: "Account is healthy and currently under control.",
    estimatedCredits: 25,
  };
}

function overviewFromAccounts(accounts: CompanyCommandAccount[]): CompanyCommandOverview {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  return {
    totalCompanies: accounts.length,
    monitoredCompanies: accounts.filter((account) => account.stage !== "new").length,
    atRiskCompanies: accounts.filter((account) => account.riskLevel === "at_risk").length,
    unassignedCompanies: accounts.filter((account) => account.ownerId === null).length,
    avgHealthScore: avg(accounts.map((account) => account.healthScore)),
    avgCoveragePct: avg(accounts.map((account) => account.leadCoveragePct)),
    totalSignalsLast7d: accounts.reduce(
      (sum, account) => sum + account.signalsLast7d,
      0
    ),
    dueTodayActions: accounts.filter(
      (account) =>
        account.nextActionPriority !== "low" &&
        account.nextActionDueAt.getTime() <= endOfToday.getTime()
    ).length,
  };
}

const icpNameById = new Map(mockICPs.map((icp) => [icp.id, icp.name]));
const funnelNameById = new Map(mockFunnels.map((funnel) => [funnel.id, funnel.name]));
const ownerById = new Map(ownerDirectory.map((owner) => [owner.id, owner]));
const leadsByCompany = mapLeadsByCompany(mockLeads);

const queueCandidates: Array<{
  account: CompanyCommandAccount;
  reason: string;
  estimatedCredits: number;
}> = [];

const accounts: CompanyCommandAccount[] = mockCompanies.map((company: ICPCompany) => {
  const accountLeads = leadsByCompany.get(company.id) ?? [];
  const inFunnelLeads = accountLeads.filter((lead) => lead.status === "in_funnel").length;
  const discoveredLeads = accountLeads.length;
  const leadCoveragePct =
    company.leadsTotal === 0
      ? 0
      : Math.round((company.leadsEnriched / company.leadsTotal) * 100);

  const sortedSignals = [...company.signals].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );
  const lastSignalAt = sortedSignals[0]?.timestamp ?? company.discoveredAt;
  const signalsLast7d = sortedSignals.filter(
    (signal) => Date.now() - signal.timestamp.getTime() <= 7 * DAY_MS
  ).length;

  const signalFreshnessDays = daysSince(lastSignalAt);
  const discoveredDaysAgo = daysSince(company.discoveredAt);

  const engagementScore = clamp(
    inFunnelLeads * 20 + company.leadsEnriched * 2 + signalsLast7d * 10,
    0,
    100
  );
  const recencyScore = clamp(100 - signalFreshnessDays * 12, 8, 100);
  const healthScore = clamp(
    Math.round(
      company.relevanceScore * 0.45 +
        leadCoveragePct * 0.25 +
        recencyScore * 0.2 +
        engagementScore * 0.1
    ),
    0,
    100
  );

  const healthDelta = clamp(
    Math.round(
      signalsLast7d * 3 - signalFreshnessDays * 1.8 + (leadCoveragePct >= 40 ? 4 : -3)
    ),
    -18,
    18
  );

  const riskLevel = detectRisk({
    healthScore,
    signalFreshnessDays,
    coveragePct: leadCoveragePct,
    signalsLast7d,
  });

  const stage = detectStage({
    inFunnelLeads,
    leadsEnriched: company.leadsEnriched,
    signalsLast7d,
    discoveredDaysAgo,
  });

  const ownerId = ownerAssignmentByCompanyId[company.id] ?? null;
  const owner = ownerId ? ownerById.get(ownerId) ?? null : null;

  const activeFunnelNames = Array.from(
    new Set(
      accountLeads
        .filter((lead) => lead.status === "in_funnel" && lead.funnelId)
        .map((lead) => funnelNameById.get(lead.funnelId as string))
        .filter((name): name is string => Boolean(name))
    )
  );

  const actionDecision = decideNextAction({
    hasOwner: Boolean(owner),
    riskLevel,
    coveragePct: leadCoveragePct,
    inFunnelLeads,
    signalsLast7d,
    signalFreshnessDays,
  });

  const account: CompanyCommandAccount = {
    id: company.id,
    name: company.name,
    domain: company.domain,
    industry: company.industry,
    employeeCount: company.employeeCount,
    fundingStage: company.fundingStage,
    icpId: company.icpId,
    icpName: icpNameById.get(company.icpId) ?? "Unlinked ICP",
    enrichmentStatus: company.enrichmentStatus,
    relevanceScore: company.relevanceScore,
    healthScore,
    healthDelta,
    riskLevel,
    stage,
    ownerId,
    ownerName: owner?.name ?? null,
    ownerTeam: owner?.team ?? null,
    signalsLast7d,
    totalSignals: company.signals.length,
    lastSignalAt,
    leadCoveragePct,
    leadsEnriched: company.leadsEnriched,
    leadTarget: company.leadsTotal,
    discoveredLeads,
    inFunnelLeads,
    activeFunnelNames,
    estimatedPipelineUsd: Math.round(
      (healthScore / 100) *
        (company.relevanceScore / 100) *
        Math.max(120, company.employeeCount) *
        (inFunnelLeads + 1) *
        36
    ),
    lastTouchAt: latestTouch(accountLeads),
    nextAction: actionDecision.action,
    nextActionPriority: actionDecision.priority,
    nextActionDueAt: actionDecision.dueAt,
    topSignals: sortedSignals.slice(0, 2),
  };

  queueCandidates.push({
    account,
    reason: actionDecision.reason,
    estimatedCredits: actionDecision.estimatedCredits,
  });

  return account;
});

const priorityRank: Record<CompanyActionPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const queue: CompanyPriorityQueueItem[] = queueCandidates
  .filter(
    (candidate) =>
      candidate.account.nextActionPriority !== "low" ||
      candidate.account.riskLevel === "at_risk"
  )
  .sort((a, b) => {
    const byPriority =
      priorityRank[a.account.nextActionPriority] -
      priorityRank[b.account.nextActionPriority];
    if (byPriority !== 0) return byPriority;

    const byDue =
      a.account.nextActionDueAt.getTime() - b.account.nextActionDueAt.getTime();
    if (byDue !== 0) return byDue;

    return a.account.healthScore - b.account.healthScore;
  })
  .slice(0, 8)
  .map((candidate, index) => ({
    id: `queue_${String(index + 1).padStart(3, "0")}`,
    companyId: candidate.account.id,
    companyName: candidate.account.name,
    ownerName: candidate.account.ownerName ?? "Unassigned",
    reason: candidate.reason,
    action: candidate.account.nextAction,
    priority: candidate.account.nextActionPriority,
    dueAt: candidate.account.nextActionDueAt,
    estimatedCredits: candidate.estimatedCredits,
  }));

const ownerPerformance: CompanyOwnerPerformance[] = ownerDirectory
  .map((owner) => {
    const assignedAccounts = accounts.filter((account) => account.ownerId === owner.id);
    if (assignedAccounts.length === 0) {
      return {
        ownerId: owner.id,
        ownerName: owner.name,
        role: owner.role,
        team: owner.team,
        managedCompanies: 0,
        atRiskCompanies: 0,
        avgHealthScore: 0,
        avgCoveragePct: 0,
        openActions: 0,
        signalsLast7d: 0,
        inFunnelLeads: 0,
        responseSlaHours: owner.responseSlaHours,
        capacityTarget: owner.capacityTarget,
      };
    }

    return {
      ownerId: owner.id,
      ownerName: owner.name,
      role: owner.role,
      team: owner.team,
      managedCompanies: assignedAccounts.length,
      atRiskCompanies: assignedAccounts.filter((account) => account.riskLevel === "at_risk")
        .length,
      avgHealthScore: avg(assignedAccounts.map((account) => account.healthScore)),
      avgCoveragePct: avg(assignedAccounts.map((account) => account.leadCoveragePct)),
      openActions: assignedAccounts.filter(
        (account) => account.nextActionPriority !== "low"
      ).length,
      signalsLast7d: assignedAccounts.reduce(
        (sum, account) => sum + account.signalsLast7d,
        0
      ),
      inFunnelLeads: assignedAccounts.reduce(
        (sum, account) => sum + account.inFunnelLeads,
        0
      ),
      responseSlaHours: owner.responseSlaHours,
      capacityTarget: owner.capacityTarget,
    };
  })
  .sort((a, b) => {
    const byManaged = b.managedCompanies - a.managedCompanies;
    if (byManaged !== 0) return byManaged;
    return b.avgHealthScore - a.avgHealthScore;
  });

export const mockCompaniesCommandCenter: CompaniesCommandCenterSnapshot = {
  generatedAt: new Date(),
  overview: overviewFromAccounts(accounts),
  owners: ownerDirectory,
  ownerPerformance,
  queue,
  accounts,
};
