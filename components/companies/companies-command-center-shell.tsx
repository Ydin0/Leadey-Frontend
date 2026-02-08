"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Clock3,
  Filter,
  Search,
  ShieldCheck,
  Signal,
  Users,
} from "lucide-react";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mockCompaniesCommandCenter } from "@/lib/mock-data/companies-command-center";
import type {
  CompanyActionPriority,
  CompanyCommandAccount,
  CompanyLifecycleStage,
  CompanyRiskLevel,
} from "@/lib/types/companies-command-center";
import { cn, formatRelativeTime } from "@/lib/utils";

type SortKey = "health" | "signals" | "coverage" | "pipeline";

const PAGE_SIZE = 8;

const riskFilters: { key: CompanyRiskLevel | "all"; label: string }[] = [
  { key: "all", label: "All risk levels" },
  { key: "at_risk", label: "At risk" },
  { key: "watch", label: "Watch" },
  { key: "healthy", label: "Healthy" },
];

const stageFilters: { key: CompanyLifecycleStage | "all"; label: string }[] = [
  { key: "all", label: "All stages" },
  { key: "monitoring", label: "Monitoring" },
  { key: "engaging", label: "Engaging" },
  { key: "in_funnel", label: "In funnel" },
  { key: "customer", label: "Customer" },
  { key: "new", label: "New" },
];

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "health", label: "Health score" },
  { key: "signals", label: "Signals (7d)" },
  { key: "coverage", label: "Lead coverage" },
  { key: "pipeline", label: "Pipeline potential" },
];

const priorityWeight: Record<CompanyActionPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}

function stageLabel(stage: CompanyLifecycleStage) {
  return stage.replace("_", " ");
}

function stageBadgeClass(stage: CompanyLifecycleStage) {
  if (stage === "customer") return "bg-signal-green text-signal-green-text";
  if (stage === "in_funnel") return "bg-signal-blue text-signal-blue-text";
  if (stage === "engaging") return "bg-signal-slate text-signal-slate-text";
  if (stage === "monitoring") return "bg-section text-ink-secondary";
  return "bg-section text-ink-faint";
}

function riskBadgeClass(risk: CompanyRiskLevel) {
  if (risk === "healthy") return "bg-signal-green text-signal-green-text";
  if (risk === "watch") return "bg-signal-blue text-signal-blue-text";
  return "bg-signal-red text-signal-red-text";
}

function priorityBadgeClass(priority: CompanyActionPriority) {
  if (priority === "high") return "bg-signal-red text-signal-red-text";
  if (priority === "medium") return "bg-signal-blue text-signal-blue-text";
  return "bg-signal-slate text-signal-slate-text";
}

function enrichmentBadgeClass(status: CompanyCommandAccount["enrichmentStatus"]) {
  if (status === "full") return "bg-signal-green text-signal-green-text";
  if (status === "partial") return "bg-signal-blue text-signal-blue-text";
  if (status === "pending_review") return "bg-signal-red text-signal-red-text";
  return "bg-section text-ink-faint";
}

function CompanyLogo({ domain, name }: { domain: string; name: string }) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <div className="w-7 h-7 rounded-full bg-section flex items-center justify-center shrink-0 border border-border-subtle">
        <span className="text-[9px] font-semibold text-ink-secondary">
          {name.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt={`${name} logo`}
      width={28}
      height={28}
      className="w-7 h-7 rounded-full border border-border-subtle bg-surface"
      onError={() => setImgError(true)}
    />
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Building2;
}) {
  return (
    <div className="rounded-[12px] border border-border-subtle bg-surface p-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-ink-faint">{label}</p>
        <Icon size={14} strokeWidth={1.8} className="text-ink-muted" />
      </div>
      <p className="mt-1 text-[18px] font-semibold text-ink">{value}</p>
      <p className="text-[11px] text-ink-muted">{helper}</p>
    </div>
  );
}

export function CompaniesCommandCenterShell() {
  const data = mockCompaniesCommandCenter;

  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<CompanyRiskLevel | "all">("all");
  const [stageFilter, setStageFilter] = useState<CompanyLifecycleStage | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("health");
  const [currentPage, setCurrentPage] = useState(1);

  function setQueryFilter(value: string) {
    setQuery(value);
    setCurrentPage(1);
  }

  function setRiskFilterValue(value: CompanyRiskLevel | "all") {
    setRiskFilter(value);
    setCurrentPage(1);
  }

  function setStageFilterValue(value: CompanyLifecycleStage | "all") {
    setStageFilter(value);
    setCurrentPage(1);
  }

  function setOwnerFilterValue(value: string) {
    setOwnerFilter(value);
    setCurrentPage(1);
  }

  function setSortValue(value: SortKey) {
    setSortBy(value);
    setCurrentPage(1);
  }

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return data.accounts.filter((account) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        account.name.toLowerCase().includes(normalizedQuery) ||
        account.domain.toLowerCase().includes(normalizedQuery) ||
        account.industry.toLowerCase().includes(normalizedQuery);

      const matchesRisk = riskFilter === "all" || account.riskLevel === riskFilter;
      const matchesStage = stageFilter === "all" || account.stage === stageFilter;
      const matchesOwner = ownerFilter === "all" || account.ownerId === ownerFilter;

      return matchesQuery && matchesRisk && matchesStage && matchesOwner;
    });
  }, [data.accounts, ownerFilter, query, riskFilter, stageFilter]);

  const sorted = useMemo(() => {
    const rows = [...filtered];

    rows.sort((a, b) => {
      if (sortBy === "signals") {
        if (b.signalsLast7d !== a.signalsLast7d) return b.signalsLast7d - a.signalsLast7d;
      }
      if (sortBy === "coverage") {
        if (b.leadCoveragePct !== a.leadCoveragePct) return b.leadCoveragePct - a.leadCoveragePct;
      }
      if (sortBy === "pipeline") {
        if (b.estimatedPipelineUsd !== a.estimatedPipelineUsd) {
          return b.estimatedPipelineUsd - a.estimatedPipelineUsd;
        }
      }
      if (sortBy === "health") {
        if (b.healthScore !== a.healthScore) return b.healthScore - a.healthScore;
      }
      return b.relevanceScore - a.relevanceScore;
    });

    return rows;
  }, [filtered, sortBy]);

  const overview = useMemo(() => {
    if (sorted.length === 0) {
      return {
        totalCompanies: 0,
        monitoredCompanies: 0,
        atRiskCompanies: 0,
        unassignedCompanies: 0,
        avgHealthScore: 0,
        avgCoveragePct: 0,
        totalSignalsLast7d: 0,
        dueTodayActions: 0,
      };
    }

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const totals = sorted.reduce(
      (acc, account) => {
        acc.health += account.healthScore;
        acc.coverage += account.leadCoveragePct;
        acc.signals += account.signalsLast7d;
        if (account.stage !== "new") acc.monitored += 1;
        if (account.riskLevel === "at_risk") acc.atRisk += 1;
        if (!account.ownerId) acc.unassigned += 1;
        if (
          account.nextActionPriority !== "low" &&
          account.nextActionDueAt.getTime() <= endOfToday.getTime()
        ) {
          acc.dueToday += 1;
        }
        return acc;
      },
      {
        health: 0,
        coverage: 0,
        signals: 0,
        monitored: 0,
        atRisk: 0,
        unassigned: 0,
        dueToday: 0,
      }
    );

    return {
      totalCompanies: sorted.length,
      monitoredCompanies: totals.monitored,
      atRiskCompanies: totals.atRisk,
      unassignedCompanies: totals.unassigned,
      avgHealthScore: Math.round(totals.health / sorted.length),
      avgCoveragePct: Math.round(totals.coverage / sorted.length),
      totalSignalsLast7d: totals.signals,
      dueTodayActions: totals.dueToday,
    };
  }, [sorted]);

  const ownerPerformance = useMemo(() => {
    return data.owners
      .map((owner) => {
        const assigned = sorted.filter((account) => account.ownerId === owner.id);
        if (assigned.length === 0) {
          return {
            ownerId: owner.id,
            ownerName: owner.name,
            team: owner.team,
            role: owner.role,
            managedCompanies: 0,
            atRiskCompanies: 0,
            avgHealthScore: 0,
            avgCoveragePct: 0,
            openActions: 0,
            responseSlaHours: owner.responseSlaHours,
            capacityTarget: owner.capacityTarget,
            signalsLast7d: 0,
          };
        }

        const healthTotal = assigned.reduce((sum, account) => sum + account.healthScore, 0);
        const coverageTotal = assigned.reduce(
          (sum, account) => sum + account.leadCoveragePct,
          0
        );
        const signalsTotal = assigned.reduce(
          (sum, account) => sum + account.signalsLast7d,
          0
        );

        return {
          ownerId: owner.id,
          ownerName: owner.name,
          team: owner.team,
          role: owner.role,
          managedCompanies: assigned.length,
          atRiskCompanies: assigned.filter((account) => account.riskLevel === "at_risk").length,
          avgHealthScore: Math.round(healthTotal / assigned.length),
          avgCoveragePct: Math.round(coverageTotal / assigned.length),
          openActions: assigned.filter((account) => account.nextActionPriority !== "low").length,
          responseSlaHours: owner.responseSlaHours,
          capacityTarget: owner.capacityTarget,
          signalsLast7d: signalsTotal,
        };
      })
      .filter((owner) => owner.managedCompanies > 0)
      .sort((a, b) => {
        const byOpenActions = b.openActions - a.openActions;
        if (byOpenActions !== 0) return byOpenActions;
        return b.managedCompanies - a.managedCompanies;
      });
  }, [data.owners, sorted]);

  const queueLookup = useMemo(
    () => new Map(data.queue.map((item) => [item.companyId, item])),
    [data.queue]
  );

  const priorityQueue = useMemo(() => {
    return sorted
      .filter((account) => account.nextActionPriority !== "low" || account.riskLevel === "at_risk")
      .sort((a, b) => {
        const byPriority =
          priorityWeight[a.nextActionPriority] - priorityWeight[b.nextActionPriority];
        if (byPriority !== 0) return byPriority;
        return a.nextActionDueAt.getTime() - b.nextActionDueAt.getTime();
      })
      .slice(0, 6)
      .map((account) => {
        const queueMeta = queueLookup.get(account.id);
        return {
          account,
          reason:
            queueMeta?.reason ??
            (account.ownerId
              ? "Execution backlog needs attention."
              : "No owner assigned for this account."),
          estimatedCredits: queueMeta?.estimatedCredits ?? 50,
        };
      });
  }, [queueLookup, sorted]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pagedPage = Math.min(currentPage, totalPages);
  const pagedAccounts = sorted.slice((pagedPage - 1) * PAGE_SIZE, pagedPage * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Companies Command Center</h1>
          <p className="text-[12px] text-ink-muted mt-1">
            Centralized ownership, health, and execution control across all tracked companies.
          </p>
        </div>
        <div className="rounded-[10px] border border-border-subtle bg-surface px-3 py-2 text-right">
          <p className="text-[10px] uppercase tracking-wider text-ink-faint">Last refreshed</p>
          <p className="text-[11px] text-ink-secondary">
            {formatRelativeTime(data.generatedAt)}
          </p>
        </div>
      </div>

      <section className="rounded-[14px] border border-border-subtle bg-surface p-4 space-y-3">
        <div className="flex items-center gap-2 text-[11px] font-medium text-ink-muted">
          <Filter size={13} strokeWidth={1.8} />
          Filters and ranking
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <label className="flex items-center gap-2 rounded-[10px] border border-border-subtle bg-section/50 px-3 py-2">
            <Search size={13} className="text-ink-muted" />
            <input
              value={query}
              onChange={(event) => setQueryFilter(event.target.value)}
              placeholder="Search company, domain, industry"
              className="w-full bg-transparent text-[12px] text-ink placeholder:text-ink-faint outline-none"
            />
          </label>

          <select
            value={ownerFilter}
            onChange={(event) => setOwnerFilterValue(event.target.value)}
            className="w-full rounded-[10px] border border-border-subtle bg-section/50 px-3 py-2 text-[12px] text-ink outline-none"
          >
            <option value="all">All owners</option>
            {data.owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortValue(event.target.value as SortKey)}
            className="w-full rounded-[10px] border border-border-subtle bg-section/50 px-3 py-2 text-[12px] text-ink outline-none"
          >
            {sortOptions.map((option) => (
              <option key={option.key} value={option.key}>
                Sort by {option.label}
              </option>
            ))}
          </select>

          <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-2 text-[11px] text-ink-muted">
            Showing {sorted.length} of {data.overview.totalCompanies} companies
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {riskFilters.map((option) => (
              <button
                key={option.key}
                onClick={() => setRiskFilterValue(option.key)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors",
                  riskFilter === option.key
                    ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                    : "bg-surface text-ink-muted border-border-subtle hover:bg-hover"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {stageFilters.map((option) => (
              <button
                key={option.key}
                onClick={() => setStageFilterValue(option.key)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors",
                  stageFilter === option.key
                    ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                    : "bg-surface text-ink-muted border-border-subtle hover:bg-hover"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard
          label="Tracked companies"
          value={String(overview.totalCompanies)}
          helper={`${overview.monitoredCompanies} actively monitored`}
          icon={Building2}
        />
        <MetricCard
          label="At-risk accounts"
          value={String(overview.atRiskCompanies)}
          helper={`${overview.dueTodayActions} actions due today`}
          icon={AlertTriangle}
        />
        <MetricCard
          label="Coverage average"
          value={`${overview.avgCoveragePct}%`}
          helper={`${overview.unassignedCompanies} unassigned accounts`}
          icon={Users}
        />
        <MetricCard
          label="Signals (7d)"
          value={formatCompactNumber(overview.totalSignalsLast7d)}
          helper={`Avg health ${overview.avgHealthScore}`}
          icon={Signal}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <section className="xl:col-span-3 rounded-[14px] border border-border-subtle bg-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold text-ink">Team ownership</h2>
            <span className="text-[11px] text-ink-muted">
              Capacity, SLA, and action load by owner
            </span>
          </div>

          <div className="space-y-2">
            {ownerPerformance.map((owner) => {
              const capacityPct = Math.min(
                100,
                Math.round((owner.managedCompanies / owner.capacityTarget) * 100)
              );
              return (
                <div
                  key={owner.ownerId}
                  className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-medium text-ink">
                        {owner.ownerName}
                        <span className="text-[10px] text-ink-muted ml-1.5">
                          {owner.team} · {owner.role}
                        </span>
                      </p>
                      <p className="text-[11px] text-ink-muted">
                        {owner.managedCompanies} accounts · {owner.openActions} open actions · SLA {"<="}
                        {owner.responseSlaHours}h
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-medium text-ink">Health {owner.avgHealthScore}</p>
                      <p className="text-[11px] text-ink-muted">Coverage {owner.avgCoveragePct}%</p>
                    </div>
                  </div>

                  <div className="mt-2 h-1.5 rounded bg-section">
                    <div
                      className={cn(
                        "h-1.5 rounded",
                        capacityPct > 85 ? "bg-signal-red-text" : "bg-signal-blue-text"
                      )}
                      style={{ width: `${capacityPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {ownerPerformance.length === 0 && (
              <p className="text-[11px] text-ink-muted">No owners match the selected filters.</p>
            )}
          </div>
        </section>

        <section className="xl:col-span-2 rounded-[14px] border border-border-subtle bg-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold text-ink">Priority queue</h2>
            <span className="text-[11px] text-ink-muted">Immediate account actions</span>
          </div>

          <div className="space-y-2">
            {priorityQueue.map(({ account, reason, estimatedCredits }) => (
              <div
                key={account.id}
                className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-[12px] font-medium text-ink">{account.name}</p>
                  <span
                    className={cn(
                      "text-[10px] font-medium rounded-full px-2 py-0.5",
                      priorityBadgeClass(account.nextActionPriority)
                    )}
                  >
                    {account.nextActionPriority}
                  </span>
                </div>
                <p className="text-[11px] text-ink-secondary">{account.nextAction}</p>
                <p className="text-[10px] text-ink-muted mt-1">{reason}</p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-ink-faint">
                  <span>Due {formatRelativeTime(account.nextActionDueAt)}</span>
                  <span>{estimatedCredits} est. credits</span>
                </div>
              </div>
            ))}
            {priorityQueue.length === 0 && (
              <p className="text-[11px] text-ink-muted">No urgent actions under current filters.</p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-[14px] border border-border-subtle bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-ink">Account coverage table</h2>
          <p className="text-[11px] text-ink-muted">
            Health, ownership, signal velocity, and next execution step
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-section/40 hover:bg-section/40">
              <TableHead>Company</TableHead>
              <TableHead>ICP</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-center">Health</TableHead>
              <TableHead className="text-center">Signals</TableHead>
              <TableHead className="text-center">Coverage</TableHead>
              <TableHead className="text-center">Stage</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedAccounts.map((account) => {
              const deltaUp = account.healthDelta >= 0;

              return (
                <TableRow key={account.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[220px]">
                      <CompanyLogo domain={account.domain} name={account.name} />
                      <div>
                        <p className="text-[12px] font-medium text-ink">{account.name}</p>
                        <p className="text-[10px] text-ink-muted">
                          {account.domain} · {account.industry}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <p className="text-[11px] text-ink-secondary">{account.icpName}</p>
                    <p className="text-[10px] text-ink-faint">{account.fundingStage}</p>
                  </TableCell>

                  <TableCell>
                    {account.ownerName ? (
                      <div>
                        <p className="text-[11px] text-ink-secondary">{account.ownerName}</p>
                        <p className="text-[10px] text-ink-faint">{account.ownerTeam}</p>
                      </div>
                    ) : (
                      <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-signal-red text-signal-red-text">
                        Unassigned
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[12px] font-semibold text-ink">{account.healthScore}</span>
                      <span className="text-[10px] text-ink-muted inline-flex items-center gap-1">
                        {deltaUp ? (
                          <ArrowUpRight size={10} className="text-signal-green-text" />
                        ) : (
                          <ArrowDownRight size={10} className="text-signal-red-text" />
                        )}
                        {deltaUp ? "+" : ""}
                        {account.healthDelta}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-medium rounded-full px-2 py-0.5",
                          riskBadgeClass(account.riskLevel)
                        )}
                      >
                        {account.riskLevel.replace("_", " ")}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <p className="text-[12px] font-medium text-ink">{account.signalsLast7d}</p>
                    <p className="text-[10px] text-ink-faint">
                      Last {formatRelativeTime(account.lastSignalAt)}
                    </p>
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="min-w-[100px] mx-auto">
                      <p className="text-[11px] text-ink-secondary mb-1">
                        {account.leadsEnriched}/{account.leadTarget}
                      </p>
                      <div className="h-1.5 rounded bg-section">
                        <div
                          className="h-1.5 rounded bg-signal-blue-text"
                          style={{ width: `${Math.min(100, account.leadCoveragePct)}%` }}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-center gap-1">
                        <span
                          className={cn(
                            "text-[10px] font-medium rounded-full px-1.5 py-0.5",
                            enrichmentBadgeClass(account.enrichmentStatus)
                          )}
                        >
                          {account.enrichmentStatus.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={cn(
                          "text-[10px] font-medium rounded-full px-2 py-0.5",
                          stageBadgeClass(account.stage)
                        )}
                      >
                        {stageLabel(account.stage)}
                      </span>
                      <p className="text-[10px] text-ink-faint">
                        {account.inFunnelLeads} in funnel
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="min-w-[260px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "text-[10px] font-medium rounded-full px-2 py-0.5",
                            priorityBadgeClass(account.nextActionPriority)
                          )}
                        >
                          {account.nextActionPriority}
                        </span>
                        <span className="text-[10px] text-ink-faint inline-flex items-center gap-1">
                          <Clock3 size={10} />
                          {formatRelativeTime(account.nextActionDueAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-secondary">{account.nextAction}</p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-ink-faint">
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck size={10} />
                          Fit {account.relevanceScore}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users size={10} />
                          {account.discoveredLeads} discovered
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Signal size={10} />
                          {formatCurrency(account.estimatedPipelineUsd)} potential
                        </span>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {pagedAccounts.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="py-10 text-center text-[12px] text-ink-muted">
                  No companies match the selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <DataTablePagination
          currentPage={pagedPage}
          totalPages={totalPages}
          pageSize={PAGE_SIZE}
          totalItems={sorted.length}
          onPageChange={setCurrentPage}
        />
      </section>
    </div>
  );
}
