"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Play, Pencil, Loader2, Sparkles, FolderInput, EyeOff, X,
  Briefcase, Building2, Users, History, Clock, CheckCircle2, XCircle, AlertCircle,
  Download,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { ResultsTable } from "./results-table";
import { CompanyCell } from "./company-cell";
import { EmptyState } from "@/components/shared/empty-state";
import { RowLimitPopover } from "@/components/shared/row-limit-popover";
import { LeadsTab } from "./leads/leads-tab";
import { DiscoveryConfigModal } from "./leads/discovery-config-modal";
import { startDiscovery, getContactCompanyCounts } from "@/lib/api/contacts";
import type { DiscoveryConfig } from "@/lib/types/contact";
import { JobsFilterBar } from "./filters/jobs-filter-bar";
import { CompaniesFilterBar } from "./filters/companies-filter-bar";
import { useJobsInlineFilters, useCompaniesInlineFilters } from "./filters/use-inline-filters";
import { useUrlState, useUrlNumberState } from "@/lib/hooks/use-url-state";
import { useCrossPageSelection } from "@/lib/hooks/use-cross-page-selection";
import type { UniqueCompany } from "./filters/filter-types";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { SortableHeader } from "@/components/ui/sortable-header";
import { generateCSV, downloadCSV } from "@/lib/export-csv";
import {
  getScraperAssignments, getSearchResults,
  bulkUpdateSignalStatus, getScraperRuns,
  type ScraperAssignmentRow, type ScraperRunRow,
} from "@/lib/api/scrapers";
import { getContacts } from "@/lib/api/contacts";
import { useScraperRuns } from "@/components/providers/scraper-runs-provider";
import type { SearchResultRow, PaginatedResponse } from "@/lib/types/scraper";

type Tab = "jobs" | "companies" | "leads" | "history";

interface SearchDetailShellProps {
  searchId: string;
}

export function SearchDetailShell({ searchId }: SearchDetailShellProps) {
  const router = useRouter();
  const isAuthReady = useAuthReady();
  const [assignment, setAssignment] = useState<ScraperAssignmentRow | null>(null);
  const [results, setResults] = useState<PaginatedResponse<SearchResultRow> | null>(null);
  const [allResults, setAllResults] = useState<SearchResultRow[]>([]);
  const [loadingAllResults, setLoadingAllResults] = useState(true);
  const [runs, setRuns] = useState<ScraperRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { startRun, isRunning } = useScraperRuns();
  const running = isRunning(searchId);
  const [bulkAction, setBulkAction] = useState<string | null>(null);

  // URL-backed state
  const [activeTab, setActiveTab] = useUrlState("tab", "jobs") as [Tab, (v: string) => void];
  const [page, setPage] = useUrlNumberState("page", 1);
  const [pageSize, setPageSize] = useUrlNumberState("ps", 25);
  const [activeRunId, setActiveRunId] = useUrlState("run", "");

  const resolvedRunId = activeRunId || null;

  const [leadsCount, setLeadsCount] = useState(0);
  const [companyLeadCounts, setCompanyLeadCounts] = useState<Map<string, number>>(new Map());

  // Discovery modal state
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [discoverySubmitting, setDiscoverySubmitting] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  // Run modal state
  const [showRunModal, setShowRunModal] = useState(false);
  const [runLimit, setRunLimit] = useState(100);

  // Row limit for results table
  const [resultsStartingRow, setResultsStartingRow] = useState(0);
  const [resultsRowLimit, setResultsRowLimit] = useState<number | null>(null);

  function handleResultsRowLimitChange(newStart: number, newLimit: number | null) {
    setResultsStartingRow(newStart);
    setResultsRowLimit(newLimit);
    setPage(1);
  }

  // Row limit for companies tab
  const [companiesStartingRow, setCompaniesStartingRow] = useState(0);
  const [companiesRowLimit, setCompaniesRowLimit] = useState<number | null>(null);

  function handleCompaniesRowLimitChange(newStart: number, newLimit: number | null) {
    setCompaniesStartingRow(newStart);
    setCompaniesRowLimit(newLimit);
  }

  // Search state per tab
  const [jobsSearch, setJobsSearch] = useState("");
  const [companiesSearch, setCompaniesSearch] = useState("");

  const fetchData = useCallback(async (p: number) => {
    try {
      const [rows, res, runRows, contactsRes] = await Promise.all([
        getScraperAssignments(),
        getSearchResults(searchId, { page: p, pageSize }),
        getScraperRuns(searchId),
        getContacts({ assignmentId: searchId, page: 1, pageSize: 1 }).catch(() => null),
      ]);
      const found = rows.find((r) => r.id === searchId);
      setAssignment(found || null);
      setResults(res);
      setRuns(runRows);
      if (contactsRes) setLeadsCount(contactsRes.meta.totalCount);
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, [searchId, pageSize]);

  // Fetch all results for company dedup + inline filters
  const fetchAllResults = useCallback(async () => {
    setLoadingAllResults(true);
    try {
      const PAGE_SIZE = 2000;
      const firstPage = await getSearchResults(searchId, { page: 1, pageSize: PAGE_SIZE });
      const all = [...(firstPage.data || [])];
      const totalPages = firstPage.meta?.totalPages ?? 1;
      for (let p = 2; p <= totalPages; p++) {
        const next = await getSearchResults(searchId, { page: p, pageSize: PAGE_SIZE });
        if (next.data?.length) all.push(...next.data);
      }
      setAllResults(all);
    } catch {
    } finally {
      setLoadingAllResults(false);
    }
  }, [searchId]);

  // Fetch company lead counts — store under multiple keys for flexible matching
  const fetchCompanyLeadCounts = useCallback(async () => {
    try {
      const counts = await getContactCompanyCounts(searchId);
      const map = new Map<string, number>();
      for (const c of counts) {
        const cnt = c.count;
        // Store under LinkedIn URL (normalized — strip trailing slash)
        if (c.companyLinkedinUrl) {
          const urlKey = c.companyLinkedinUrl.replace(/\/+$/, "").toLowerCase();
          map.set(urlKey, (map.get(urlKey) || 0) + cnt);
        }
        // Also store under company name for fallback matching
        if (c.companyName) {
          const nameKey = `name:${c.companyName.toLowerCase()}`;
          map.set(nameKey, (map.get(nameKey) || 0) + cnt);
        }
      }
      setCompanyLeadCounts(map);
    } catch {
      // non-critical
    }
  }, [searchId]);

  useEffect(() => {
    if (!isAuthReady) return;
    fetchAllResults();
    fetchCompanyLeadCounts();
  }, [searchId, isAuthReady, fetchAllResults, fetchCompanyLeadCounts]);

  // Re-fetch company lead counts whenever the leads count changes (e.g. after discovery completes)
  const prevLeadsCountRef = useRef(leadsCount);
  useEffect(() => {
    if (prevLeadsCountRef.current !== leadsCount && leadsCount > 0) {
      fetchCompanyLeadCounts();
    }
    prevLeadsCountRef.current = leadsCount;
  }, [leadsCount, fetchCompanyLeadCounts]);

  useEffect(() => {
    if (!isAuthReady) return;
    fetchData(page);
  }, [fetchData, page, isAuthReady]);

  const handleRunConfirm = useCallback(() => {
    if (running) return;
    setShowRunModal(false);
    // Run is owned by the global ScraperRunsProvider so it survives navigation
    // and surfaces in the bottom-right status widget.
    startRun(
      searchId,
      assignment?.searchName || assignment?.scraperName || "Scraper",
      { maxSignalsPerRun: runLimit },
    );
  }, [running, searchId, runLimit, startRun, assignment]);

  // When this assignment's run finishes (running → not), refresh the page data
  // if we're still on it.
  const wasRunning = useRef(false);
  useEffect(() => {
    if (running) {
      wasRunning.current = true;
    } else if (wasRunning.current) {
      wasRunning.current = false;
      setPage(1);
      setActiveRunId("");
      void fetchData(1);
      void fetchAllResults();
      void fetchCompanyLeadCounts();
    }
  }, [running, fetchData, fetchAllResults, fetchCompanyLeadCounts, setPage, setActiveRunId]);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
  }, [setPage]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, [setPageSize, setPage]);

  // Defined as plain functions — they reference jobsSelection/companiesSelection
  // which are declared later, so useCallback with stale deps won't work.
  // Re-assigned after selection hooks are initialized (see below).
  let handleTabChange = (_tab: Tab) => {};
  let handleSelectRun = (_runId: string | null) => {};

  // Derive unique companies from all results
  const uniqueCompanies = useMemo<UniqueCompany[]>(() => {
    const source = resolvedRunId
      ? allResults.filter((r) => r.runId === resolvedRunId)
      : allResults;
    const map = new Map<string, UniqueCompany>();
    for (const row of source) {
      const key = (row.companyDomain || row.company).toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.jobCount++;
      } else {
        const linkedinUrl = row.companyLinkedinUrl || null;
        // Try LinkedIn URL first (normalized), then fall back to company name
        const urlKey = linkedinUrl ? linkedinUrl.replace(/\/+$/, "").toLowerCase() : "";
        const nameKey = `name:${row.company.toLowerCase()}`;
        const leadCount = (urlKey ? companyLeadCounts.get(urlKey) : 0) || companyLeadCounts.get(nameKey) || 0;
        map.set(key, {
          name: row.company, domain: row.companyDomain, industry: row.companyIndustry,
          logo: row.companyLogo, country: row.companyCountry, city: row.companyCity,
          employeeCount: row.companyEmployeeCount, fundingStage: row.companyFundingStage,
          linkedinUrl, jobCount: 1,
          leadCount,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.jobCount - a.jobCount);
  }, [allResults, resolvedRunId, companyLeadCounts]);

  // Inline filters
  const runFilteredResults = useMemo(() => {
    if (!resolvedRunId) return allResults;
    return allResults.filter((r) => r.runId === resolvedRunId);
  }, [allResults, resolvedRunId]);

  const jobsFilter = useJobsInlineFilters(runFilteredResults, resolvedRunId);
  const companiesFilter = useCompaniesInlineFilters(uniqueCompanies);

  // Persist company filters per-assignment so they survive a refresh / revisit.
  // Restore on mount (when the URL carries none); a Save button writes the
  // current set so it sticks.
  const FILTERS_KEY = `leadey:scraper-company-filters:${searchId}`;
  const filtersRestoredRef = useRef(false);
  const { setFilters: setCompaniesFilters } = companiesFilter;
  const [filtersSaved, setFiltersSaved] = useState(false);
  useEffect(() => {
    if (filtersRestoredRef.current) return;
    filtersRestoredRef.current = true;
    if (!companiesFilter.isEmpty) return; // URL already provided filters
    try {
      const saved = window.localStorage.getItem(FILTERS_KEY);
      if (saved) setCompaniesFilters(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, [companiesFilter.isEmpty, setCompaniesFilters, FILTERS_KEY]);
  const saveCompanyFilters = useCallback(() => {
    try {
      if (companiesFilter.isEmpty) window.localStorage.removeItem(FILTERS_KEY);
      else window.localStorage.setItem(FILTERS_KEY, JSON.stringify(companiesFilter.filters));
      setFiltersSaved(true);
      window.setTimeout(() => setFiltersSaved(false), 1800);
    } catch {
      /* ignore */
    }
  }, [companiesFilter.filters, companiesFilter.isEmpty, FILTERS_KEY]);

  // Filter displayed rows. When a run is selected we use runFilteredResults
  // (sourced from allResults, which fetches everything in 2000-row pages)
  // rather than results.data (the 25-row server page) — otherwise the Jobs
  // tab would only ever show 25 rows for a 257-result run.
  const displayedRows = useMemo(() => {
    if (!jobsFilter.isEmpty) return jobsFilter.filteredRows;
    if (!resolvedRunId) return results?.data || [];
    return runFilteredResults;
  }, [results, resolvedRunId, runFilteredResults, jobsFilter.isEmpty, jobsFilter.filteredRows]);

  const meta = results?.meta || { page: 1, pageSize: 25, totalCount: 0, totalPages: 0 };

  // Apply search + row limit to jobs rows
  const rows = useMemo(() => {
    let result = displayedRows;
    // Apply text search
    if (jobsSearch) {
      const q = jobsSearch.toLowerCase();
      result = result.filter((r) =>
        r.jobTitle.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        (r.location || "").toLowerCase().includes(q)
      );
    }
    // Apply row limit
    const start = Math.min(resultsStartingRow, result.length);
    if (resultsRowLimit !== null) {
      return result.slice(start, start + resultsRowLimit);
    }
    return result.slice(start);
  }, [displayedRows, resultsStartingRow, resultsRowLimit, jobsSearch]);

  const jobsCount = !jobsFilter.isEmpty ? rows.length : (resolvedRunId ? rows.length : meta.totalCount);

  // When a run is selected or an inline filter is applied, we have the full
  // result set in `rows` (sourced from allResults, not the server page). In
  // that case we paginate client-side so the user still gets pagination +
  // page-size controls — same pattern as CompaniesTab. For the unfiltered
  // "all runs" view we keep server-side pagination via meta.*.
  const clientPaginated = !jobsFilter.isEmpty || !!resolvedRunId;
  const jobsTotalPages = clientPaginated
    ? Math.max(1, Math.ceil(rows.length / pageSize))
    : meta.totalPages;
  const jobsSafePage = clientPaginated ? Math.min(Math.max(1, page), jobsTotalPages) : meta.page;
  const paginatedJobsRows = useMemo(() => {
    if (!clientPaginated) return rows;
    const start = (jobsSafePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, clientPaginated, jobsSafePage, pageSize]);
  const companiesCount = !companiesFilter.isEmpty ? companiesFilter.filteredCompanies.length : uniqueCompanies.length;

  // Cross-page selection
  const jobsSelection = useCrossPageSelection(jobsCount);
  const companiesSelection = useCrossPageSelection(companiesCount);

  // Now that selection hooks exist, wire up the handlers
  handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setPage(1);
    jobsSelection.clearSelection();
    companiesSelection.clearSelection();
    // Refresh company lead counts when switching to companies tab
    if (tab === "companies") fetchCompanyLeadCounts();
  };

  handleSelectRun = (runId: string | null) => {
    setActiveRunId(runId || "");
    setActiveTab("jobs");
    setPage(1);
    jobsSelection.clearSelection();
  };

  // Resolve selected company keys to LinkedIn URLs for discovery
  const selectedCompanyLinkedInUrls = useMemo(() => {
    if (activeTab !== "companies" || companiesSelection.selectedCount === 0) return [];
    if (companiesSelection.isAllMatching) {
      return companiesFilter.filteredCompanies
        .map((c) => c.linkedinUrl)
        .filter(Boolean) as string[];
    }
    return uniqueCompanies
      .filter((c) => companiesSelection.selectedIds.has((c.domain || c.name).toLowerCase()))
      .map((c) => c.linkedinUrl)
      .filter(Boolean) as string[];
  }, [activeTab, companiesSelection.selectedCount, companiesSelection.isAllMatching, companiesSelection.selectedIds, uniqueCompanies, companiesFilter.filteredCompanies]);

  const handleBulkAction = async (action: string) => {
    const activeSelection = activeTab === "companies" ? companiesSelection : jobsSelection;
    if (activeSelection.selectedCount === 0) return;
    setBulkAction(action);
    try {
      if (activeTab === "companies") {
        let signalIds: string[];
        if (companiesSelection.isAllMatching) {
          signalIds = allResults.map((r) => r.id);
        } else {
          const companyKeys = companiesSelection.selectedIds;
          signalIds = allResults
            .filter((r) => companyKeys.has((r.companyDomain || r.company).toLowerCase()))
            .map((r) => r.id);
        }
        if (signalIds.length > 0) {
          await bulkUpdateSignalStatus(signalIds, action);
        }
      } else {
        const resolvedIds = jobsSelection.isAllMatching
          ? allResults.map((r) => r.id)
          : Array.from(jobsSelection.selectedIds);
        await bulkUpdateSignalStatus(resolvedIds, action);
      }
      activeSelection.clearSelection();
      await fetchData(page);
      await fetchAllResults();
    } catch (err) {
      console.error("Bulk action failed:", err);
    } finally {
      setBulkAction(null);
    }
  };

  const handleDiscoverySubmit = async (config: DiscoveryConfig) => {
    setDiscoverySubmitting(true);
    setDiscoveryError(null);
    try {
      await startDiscovery(searchId, config);
      setShowDiscoveryModal(false);
      companiesSelection.clearSelection();
      setActiveTab("leads");
    } catch (err) {
      console.error("Discovery failed:", err);
      setDiscoveryError(err instanceof Error ? err.message : "Failed to start discovery");
    } finally {
      setDiscoverySubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-20 text-ink-muted text-[13px]">
        Search not found.
      </div>
    );
  }

  const searchName = assignment.searchName || assignment.scraperName || "Untitled Search";

  const tabs: { key: Tab; label: string; icon: typeof Briefcase; count: number }[] = [
    { key: "jobs", label: "Jobs", icon: Briefcase, count: jobsCount },
    { key: "companies", label: "Companies", icon: Building2, count: companiesCount },
    { key: "leads", label: "Leads", icon: Users, count: leadsCount },
    { key: "history", label: "History", icon: History, count: runs.length },
  ];

  const activeSelection = activeTab === "companies" ? companiesSelection : jobsSelection;
  const showBulkBar = activeSelection.selectedCount > 0 && activeTab !== "history" && activeTab !== "leads";

  return (
    <div>
      {/* Run Modal */}
      {showRunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setShowRunModal(false)} />
          <div className="relative bg-surface rounded-[14px] border border-border-subtle shadow-xl w-full max-w-sm p-5">
            <h2 className="text-[15px] font-semibold text-ink mb-1">Run Search</h2>
            <p className="text-[11px] text-ink-muted mb-5">Configure how many results to fetch from TheirStack.</p>

            <div className="mb-4">
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
                Max Results
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={runLimit === 10000 ? "" : runLimit}
                  onChange={(e) => setRunLimit(Math.max(1, Number(e.target.value)))}
                  placeholder={runLimit === 10000 ? "All" : ""}
                  disabled={runLimit === 10000}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-[10px] bg-section text-[13px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30",
                    runLimit === 10000 && "text-ink-muted"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setRunLimit(runLimit === 10000 ? (assignment.maxSignalsPerRun || 100) : 10000)}
                  className={cn(
                    "px-3 py-2 rounded-[10px] text-[12px] font-medium transition-colors border whitespace-nowrap",
                    runLimit === 10000
                      ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                      : "bg-section text-ink-secondary border-border-subtle hover:bg-hover"
                  )}
                >
                  Max
                </button>
              </div>
              <p className="text-[10px] text-ink-faint mt-1.5">TheirStack charges 1 credit per job returned.</p>
            </div>

            <div className="bg-section rounded-[10px] p-3 mb-5 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-ink-muted">Max credits</span>
                <span className="font-medium text-ink">
                  {runLimit === 10000 ? "All available + 1" : `${runLimit} + 1 credits`}
                </span>
              </div>
              <p className="text-[10px] text-ink-faint">
                A count query runs first (1 credit) to check how many results exist, then only fetches the actual number available — so you won&apos;t be overcharged.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowRunModal(false)}
                className="px-4 py-2 rounded-[20px] text-[11px] font-medium text-ink-secondary border border-border-subtle hover:bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRunConfirm}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] text-[11px] font-medium bg-ink text-on-ink hover:bg-ink/90 transition-colors"
              >
                <Play size={11} />
                {runLimit === 10000 ? "Run (all results)" : `Run (up to ${runLimit + 1} credits)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/scrapers")}
            className="p-1.5 rounded-lg hover:bg-hover/50 text-ink-muted transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-[17px] font-semibold text-ink">{searchName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/dashboard/scrapers/${searchId}/edit`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[11px] font-medium text-ink-secondary border border-border-subtle hover:bg-hover transition-colors"
          >
            <Pencil size={11} /> Edit Filters
          </button>
          <button
            onClick={() => { setRunLimit(assignment.maxSignalsPerRun || 100); setShowRunModal(true); }}
            disabled={running}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] text-[11px] font-medium transition-colors",
              running
                ? "bg-section text-ink-faint cursor-not-allowed"
                : "bg-ink text-on-ink hover:bg-ink/90"
            )}
          >
            {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
            Run Now
          </button>
        </div>
      </div>

      {/* Subheader stats */}
      <div className="flex items-center gap-2 text-[10px] text-ink-muted mb-4 ml-10">
        {assignment.lastRunAt && <span>Last run {formatRelativeTime(assignment.lastRunAt)}</span>}
        <span className="text-border-default">&middot;</span>
        <span>{meta.totalCount.toLocaleString()} results</span>
        <span className="text-border-default">&middot;</span>
        <span>
          {loadingAllResults && uniqueCompanies.length === 0
            ? "counting companies…"
            : `${uniqueCompanies.length.toLocaleString()} companies`}
        </span>
        {resolvedRunId && (
          <>
            <span className="text-border-default">&middot;</span>
            <button
              onClick={() => handleSelectRun(null)}
              className="text-signal-blue-text hover:underline"
            >
              Viewing run &mdash; show all
            </button>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border-subtle">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.key
                ? "border-ink text-ink"
                : "border-transparent text-ink-muted hover:text-ink-secondary"
            )}
          >
            <tab.icon size={12} />
            {tab.label}
            <span className={cn(
              "text-[10px] rounded-full px-1.5 py-0",
              activeTab === tab.key ? "bg-ink text-on-ink" : "bg-section text-ink-faint"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Fixed bottom bulk action bar — doesn't shift table layout */}
      {showBulkBar && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-[14px] bg-surface border border-border-default shadow-lg">
          <span className="text-[11px] font-medium text-signal-blue-text">
            {activeSelection.selectedCount} selected
          </span>

          {/* Select all matching link */}
          {activeSelection.showSelectAllBanner && !activeSelection.isAllMatching && (
            <>
              <span className="text-[10px] text-ink-faint">|</span>
              <button
                onClick={() => activeSelection.selectAllMatching()}
                className="text-[11px] font-medium text-signal-blue-text hover:underline"
              >
                Select all {activeTab === "companies" ? companiesCount.toLocaleString() : jobsCount.toLocaleString()}
              </button>
            </>
          )}
          {activeSelection.isAllMatching && (
            <>
              <span className="text-[10px] text-ink-faint">|</span>
              <span className="text-[11px] text-signal-blue-text">All matching</span>
            </>
          )}

          <div className="w-px h-5 bg-border-subtle mx-1" />

          {activeTab === "companies" ? (
            <button
              onClick={() => setShowDiscoveryModal(true)}
              disabled={selectedCompanyLinkedInUrls.length === 0}
              title={
                `${selectedCompanyLinkedInUrls.length} of ${activeSelection.selectedCount} selected companies have a LinkedIn profile and can be searched for contacts. ` +
                `Companies without a LinkedIn URL can't be searched.`
              }
              className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] text-[11px] font-medium bg-signal-green/20 text-signal-green-text hover:bg-signal-green/30 transition-colors disabled:opacity-50"
            >
              <Sparkles size={10} />
              Find Contacts ({selectedCompanyLinkedInUrls.length})
            </button>
          ) : (
            <button
              onClick={() => handleBulkAction("enriched")}
              disabled={!!bulkAction}
              className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] text-[11px] font-medium bg-signal-green/20 text-signal-green-text hover:bg-signal-green/30 transition-colors"
            >
              {bulkAction === "enriched" ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
              Enrich
            </button>
          )}
          <button
            onClick={() => handleBulkAction("in_funnel")}
            disabled={!!bulkAction}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] text-[11px] font-medium bg-signal-blue/20 text-signal-blue-text hover:bg-signal-blue/30 transition-colors"
          >
            {bulkAction === "in_funnel" ? <Loader2 size={10} className="animate-spin" /> : <FolderInput size={10} />}
            Send to Funnel
          </button>
          <button
            onClick={() => handleBulkAction("dismissed")}
            disabled={!!bulkAction}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] text-[11px] font-medium bg-section text-ink-muted hover:bg-hover transition-colors"
          >
            {bulkAction === "dismissed" ? <Loader2 size={10} className="animate-spin" /> : <EyeOff size={10} />}
            Dismiss
          </button>
          <button
            onClick={() => activeSelection.clearSelection()}
            className="p-1.5 rounded-md hover:bg-hover/50 text-ink-muted transition-colors ml-1"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Tab content */}
      {activeTab === "jobs" && (
        <>
          <JobsFilterBar
            filters={jobsFilter.filters}
            setFilters={jobsFilter.setFilters}
            updateFilter={jobsFilter.updateFilter}
            clearAll={jobsFilter.clearAll}
            isEmpty={jobsFilter.isEmpty}
            search={jobsSearch}
            onSearchChange={setJobsSearch}
          />
          <ResultsTable
            rows={paginatedJobsRows}
            page={clientPaginated ? jobsSafePage : meta.page}
            pageSize={pageSize}
            totalCount={clientPaginated ? rows.length : (resultsRowLimit !== null ? Math.min(resultsRowLimit, Math.max(0, meta.totalCount - resultsStartingRow)) : meta.totalCount)}
            totalPages={clientPaginated ? jobsTotalPages : (resultsRowLimit !== null ? Math.max(1, Math.ceil(Math.min(resultsRowLimit, Math.max(0, meta.totalCount - resultsStartingRow)) / pageSize)) : meta.totalPages)}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            selectedIds={jobsSelection.selectedIds}
            onSelectionChange={(ids) => {
              // Bridge Set-based API to cross-page selection. currentPageIds
              // must reflect the rows actually rendered (paginatedJobsRows),
              // not the full filtered set, or "select all on this page" will
              // mis-fire when client-side pagination is active.
              const currentPageIds = paginatedJobsRows.map((r) => r.id);
              const allOnPage = currentPageIds.every((id) => ids.has(id));
              const noneOnPage = !currentPageIds.some((id) => ids.has(id));
              if (allOnPage && !jobsSelection.isPageFullySelected(currentPageIds)) {
                jobsSelection.togglePageAll(currentPageIds);
              } else if (noneOnPage && jobsSelection.isPageFullySelected(currentPageIds)) {
                jobsSelection.togglePageAll(currentPageIds);
              }
            }}
            crossPageSelection={jobsSelection}
            startingRow={resultsStartingRow}
            rowLimit={resultsRowLimit}
            unfilteredTotal={meta.totalCount}
            onRowLimitChange={handleResultsRowLimitChange}
          />
        </>
      )}

      {activeTab === "companies" && (
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CompaniesFilterBar
                filters={companiesFilter.filters}
                setFilters={companiesFilter.setFilters}
                updateFilter={companiesFilter.updateFilter}
                clearAll={companiesFilter.clearAll}
                isEmpty={companiesFilter.isEmpty}
                search={companiesSearch}
                onSearchChange={setCompaniesSearch}
              />
            </div>
            <button
              onClick={saveCompanyFilters}
              title="Save these filters so they persist on refresh"
              className="shrink-0 mt-0.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle"
            >
              {filtersSaved ? "Saved ✓" : "Save filters"}
            </button>
          </div>
          <CompaniesTab
            companies={companiesSearch
              ? companiesFilter.filteredCompanies.filter((c) => {
                  const q = companiesSearch.toLowerCase();
                  return c.name.toLowerCase().includes(q) ||
                    (c.domain || "").toLowerCase().includes(q) ||
                    (c.industry || "").toLowerCase().includes(q) ||
                    (c.city || "").toLowerCase().includes(q) ||
                    (c.country || "").toLowerCase().includes(q);
                })
              : companiesFilter.filteredCompanies}
            selection={companiesSelection}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            startingRow={companiesStartingRow}
            rowLimit={companiesRowLimit}
            onRowLimitChange={handleCompaniesRowLimitChange}
          />
        </>
      )}

      {activeTab === "leads" && (
        <LeadsTab
          assignmentId={searchId}
          companiesWithLinkedIn={uniqueCompanies.filter((c) => c.linkedinUrl).length}
          onCountChange={setLeadsCount}
          companyNames={
            !companiesFilter.isEmpty
              ? companiesFilter.filteredCompanies.slice(0, 500).map((c) => c.name)
              : undefined
          }
          companyUrls={
            !companiesFilter.isEmpty
              ? (companiesFilter.filteredCompanies.slice(0, 500).map((c) => c.linkedinUrl).filter(Boolean) as string[])
              : undefined
          }
          onClearCompanyFilter={companiesFilter.clearAll}
        />
      )}

      {activeTab === "history" && (
        <HistoryTab
          runs={runs}
          activeRunId={resolvedRunId}
          onSelectRun={handleSelectRun}
        />
      )}

      <DiscoveryConfigModal
        open={showDiscoveryModal}
        onClose={() => { setShowDiscoveryModal(false); setDiscoveryError(null); }}
        onSubmit={handleDiscoverySubmit}
        companiesWithLinkedIn={selectedCompanyLinkedInUrls.length || uniqueCompanies.filter((c) => c.linkedinUrl).length}
        companyLinkedinUrls={selectedCompanyLinkedInUrls.length > 0 ? selectedCompanyLinkedInUrls : undefined}
        submitting={discoverySubmitting}
        error={discoveryError}
      />
    </div>
  );
}

// ─── History Tab ────────────────────────────────────────────────────

const runStatusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  succeeded: { icon: CheckCircle2, color: "text-signal-green-text", label: "Succeeded" },
  failed: { icon: XCircle, color: "text-signal-red-text", label: "Failed" },
  running: { icon: Loader2, color: "text-signal-blue-text", label: "Running" },
  pending: { icon: Clock, color: "text-ink-muted", label: "Pending" },
};

function HistoryTab({
  runs,
  activeRunId,
  onSelectRun,
}: {
  runs: ScraperRunRow[];
  activeRunId: string | null;
  onSelectRun: (runId: string | null) => void;
}) {
  if (runs.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No runs yet"
        description="Click 'Run Now' to execute this search and see results."
      />
    );
  }

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Run</TableHead>
            <TableHead className="w-[140px]">Status</TableHead>
            <TableHead className="w-[100px]">Jobs Found</TableHead>
            <TableHead className="w-[120px]">Signals Created</TableHead>
            <TableHead className="w-[120px]">Started</TableHead>
            <TableHead className="w-[100px]">Duration</TableHead>
            <TableHead className="w-[120px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run, i) => {
            const cfg = runStatusConfig[run.status] || runStatusConfig.pending;
            const StatusIcon = cfg.icon;
            const isActive = activeRunId === run.id;
            const duration = run.startedAt && run.completedAt
              ? Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
              : null;

            return (
              <TableRow key={run.id} className={cn(isActive && "bg-signal-blue/5")}>
                <TableCell>
                  <span className="text-[12px] font-medium text-ink">Run #{runs.length - i}</span>
                </TableCell>
                <TableCell>
                  <div className={cn("flex items-center gap-1.5 text-[11px] font-medium", cfg.color)}>
                    <StatusIcon size={12} className={run.status === "running" ? "animate-spin" : ""} />
                    {cfg.label}
                  </div>
                  {run.error && (
                    <p className="text-[10px] text-signal-red-text mt-0.5 truncate max-w-[200px]">{run.error}</p>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-[11px] text-ink-secondary">{run.itemsScraped}</span>
                </TableCell>
                <TableCell>
                  <span className="text-[11px] text-ink-secondary">{run.signalsCreated}</span>
                </TableCell>
                <TableCell>
                  <span className="text-[11px] text-ink-muted">
                    {run.startedAt ? formatRelativeTime(run.startedAt) : "--"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-[11px] text-ink-muted">
                    {duration !== null ? `${duration}s` : "--"}
                  </span>
                </TableCell>
                <TableCell>
                  {run.status === "succeeded" && (
                    <button
                      onClick={() => onSelectRun(isActive ? null : run.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border",
                        isActive
                          ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                          : "bg-surface text-ink-secondary border-border-subtle hover:bg-hover"
                      )}
                    >
                      {isActive ? "Viewing" : "View Results"}
                    </button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Companies Tab ──────────────────────────────────────────────────

const COMPANY_CSV_COLUMNS = [
  { key: "name", label: "Company Name" },
  { key: "domain", label: "Domain" },
  { key: "industry", label: "Industry" },
  { key: "city", label: "City" },
  { key: "country", label: "Country" },
  { key: "employeeCount", label: "Employees" },
  { key: "fundingStage", label: "Funding Stage" },
  { key: "linkedinUrl", label: "LinkedIn URL" },
  { key: "jobCount", label: "Jobs" },
  { key: "leadCount", label: "Leads" },
];

function CompaniesTab({
  companies,
  selection,
  pageSize: parentPageSize,
  onPageSizeChange,
  startingRow = 0,
  rowLimit = null,
  onRowLimitChange,
}: {
  companies: UniqueCompany[];
  selection: ReturnType<typeof useCrossPageSelection>;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  startingRow?: number;
  rowLimit?: number | null;
  onRowLimitChange?: (startingRow: number, rowLimit: number | null) => void;
}) {
  const [companyPage, setCompanyPage] = useState(1);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(field: string) {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
    setCompanyPage(1);
  }

  // Apply row limit + sort
  const limitedCompanies = useMemo(() => {
    let result = companies;

    // Sort
    if (sortField) {
      result = [...result].sort((a, b) => {
        const av = (a as any)[sortField];
        const bv = (b as any)[sortField];
        if (typeof av === "string" && typeof bv === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
        return 0;
      });
    }

    const start = Math.min(startingRow, result.length);
    if (rowLimit !== null) {
      return result.slice(start, start + rowLimit);
    }
    return result.slice(start);
  }, [companies, startingRow, rowLimit, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(limitedCompanies.length / parentPageSize));
  const safeCompanyPage = Math.min(companyPage, totalPages);
  const paginatedCompanies = limitedCompanies.slice(
    (safeCompanyPage - 1) * parentPageSize,
    safeCompanyPage * parentPageSize,
  );

  function handleExportCompanies() {
    const csv = generateCSV(companies, COMPANY_CSV_COLUMNS);
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `companies-export-${date}.csv`);
  }

  if (companies.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No companies yet"
        description="Run this search to discover companies that are hiring."
      />
    );
  }

  const companyKey = (c: UniqueCompany) => (c.domain || c.name).toLowerCase();
  const pageIds = paginatedCompanies.map(companyKey);
  const allSelected = selection.isAllMatching || selection.isPageFullySelected(pageIds);
  const someSelected = selection.isSomePageSelected(pageIds);

  const toggleSelectAll = () => {
    selection.togglePageAll(pageIds);
  };

  const toggleSelect = (key: string) => {
    selection.toggleItem(key);
  };

  return (
    <div>
      {/* Header bar */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[12px] font-medium text-ink">
          {limitedCompanies.length} companies
        </span>
        {onRowLimitChange && (
          <RowLimitPopover
            startingRow={startingRow}
            rowLimit={rowLimit ?? null}
            totalItems={companies.length}
            onApply={onRowLimitChange}
            position="below"
          />
        )}
        <div className="ml-auto flex items-center gap-2">
          {/* Sort by */}
          <select
            value={sortField ? `${sortField}:${sortAsc ? "asc" : "desc"}` : ""}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) { setSortField(null); setCompanyPage(1); return; }
              const [field, dir] = v.split(":");
              setSortField(field);
              setSortAsc(dir === "asc");
              setCompanyPage(1);
            }}
            className="px-2.5 py-1.5 rounded-[20px] bg-surface text-ink text-[11px] font-medium border border-border-subtle outline-none focus:border-border-default cursor-pointer"
            title="Sort companies"
          >
            <option value="">Sort: default</option>
            <option value="name:asc">Company A–Z</option>
            <option value="name:desc">Company Z–A</option>
            <option value="leadCount:desc">Most leads</option>
            <option value="employeeCount:desc">Largest (employees)</option>
            <option value="employeeCount:asc">Smallest (employees)</option>
            <option value="jobCount:desc">Most jobs</option>
          </select>
          <button
            onClick={handleExportCompanies}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[11px] font-medium bg-surface text-ink border border-border-subtle hover:bg-hover transition-colors"
          >
            <Download size={11} />
            Export
          </button>
        </div>
      </div>
      <div className="bg-surface rounded-[14px] border border-border-subtle overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleSelectAll}
                  className="rounded border-border-subtle"
                />
              </TableHead>
              <TableHead className="w-[280px]">
                <SortableHeader label="Company" field="name" currentField={sortField} ascending={sortAsc} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[200px]">
                <SortableHeader label="Location" field="city" currentField={sortField} ascending={sortAsc} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[110px]">
                <SortableHeader label="Employees" field="employeeCount" currentField={sortField} ascending={sortAsc} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[140px]">
                <SortableHeader label="Funding" field="fundingStage" currentField={sortField} ascending={sortAsc} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-20">
                <SortableHeader label="Jobs" field="jobCount" currentField={sortField} ascending={sortAsc} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-20">
                <SortableHeader label="Leads" field="leadCount" currentField={sortField} ascending={sortAsc} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCompanies.map((company) => {
              const key = companyKey(company);
              const isSelected = selection.isAllMatching || selection.selectedIds.has(key);
              return (
                <TableRow key={key} className={cn(isSelected && "bg-signal-blue/5")}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(key)}
                      className="rounded border-border-subtle"
                    />
                  </TableCell>
                  <TableCell className="overflow-hidden">
                    <CompanyCell name={company.name} domain={company.domain} industry={company.industry} />
                  </TableCell>
                  <TableCell className="overflow-hidden">
                    <span className="text-[11px] text-ink-secondary truncate block">
                      {[company.city, company.country].filter(Boolean).join(", ") || "--"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[11px] text-ink-secondary">
                      {company.employeeCount ? company.employeeCount.toLocaleString() : "--"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {company.fundingStage ? (
                      <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-section text-ink-muted">
                        {company.fundingStage.replace(/_/g, " ")}
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-faint">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-[11px] font-medium text-ink">{company.jobCount}</span>
                  </TableCell>
                  <TableCell>
                    {company.leadCount > 0 ? (
                      <span className="text-[11px] font-medium text-signal-green-text">{company.leadCount}</span>
                    ) : (
                      <span className="text-[11px] text-ink-faint">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {company.linkedinUrl && (
                      <a href={company.linkedinUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-signal-blue-text hover:underline">
                        LinkedIn
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-3">
          <DataTablePagination
            currentPage={safeCompanyPage}
            totalPages={totalPages}
            pageSize={parentPageSize}
            totalItems={limitedCompanies.length}
            onPageChange={(p) => setCompanyPage(p)}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </div>
  );
}
