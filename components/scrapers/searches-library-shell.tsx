"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search as SearchIcon, Plus, Loader2, ArrowUpDown, ChevronDown, Check,
  List, LayoutGrid, X, SearchX, Play,
} from "lucide-react";
import {
  SearchCard, FilterPills, ScraperStatusBadge, SearchActionsMenu, SCRAPER_STATUS_META,
  type ScraperStatus,
} from "./search-card";
import {
  getScraperAssignments,
  deleteScraperAssignment,
  createScraperAssignment,
  type ScraperAssignmentRow,
} from "@/lib/api/scrapers";
import type { SavedSearch } from "@/lib/types/scraper";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { useScraperRuns } from "@/components/providers/scraper-runs-provider";

function toSavedSearch(row: ScraperAssignmentRow): SavedSearch {
  return {
    id: row.id,
    searchName: row.searchName || row.scraperName || "Untitled Search",
    filters: row.filters || {},
    enabled: row.enabled,
    frequency: row.frequency as SavedSearch["frequency"],
    status: row.status as SavedSearch["status"],
    totalResults: row.totalResults || 0,
    lastRunResultCount: row.lastRunResultCount || 0,
    signalsFound: row.signalsFound,
    companiesFound: row.companiesFound,
    lastRunAt: row.lastRunAt,
    createdAt: row.createdAt,
  };
}

const STATUS_TABS: { id: ScraperStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "completed", label: "Completed" },
  { id: "idle", label: "Idle" },
  { id: "error", label: "Error" },
];

type SortKey = "recent" | "name" | "results" | "companies";

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "recent", label: "Most recent" },
  { id: "name", label: "Name A–Z" },
  { id: "results", label: "Most results" },
  { id: "companies", label: "Most companies" },
];

const LIST_COLS = "minmax(220px,1.5fr) minmax(200px,1.2fr) 80px 96px 140px 92px";

export function SearchesLibraryShell() {
  const router = useRouter();
  const isAuthReady = useAuthReady();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const { startRun, isRunning, runs } = useScraperRuns();

  // Filter / sort / view state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ScraperStatus | "all">("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [sortOpen, setSortOpen] = useState(false);
  const [view, setView] = useState<"list" | "grid">("list");
  const sortRef = useRef<HTMLDivElement>(null);

  const fetchSearches = useCallback(async () => {
    try {
      const rows = await getScraperAssignments();
      setSearches(rows.map(toSavedSearch));
    } catch (err) {
      console.error("Failed to fetch searches:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    fetchSearches();
  }, [fetchSearches, isAuthReady]);

  const handleRun = useCallback((id: string) => {
    const s = searches.find((x) => x.id === id);
    startRun(id, s?.searchName || "Scraper");
  }, [searches, startRun]);

  // Refresh the list whenever a run finishes (running count drops).
  const runningCount = runs.filter((r) => r.status === "running").length;
  const prevRunningCount = useRef(runningCount);
  useEffect(() => {
    if (runningCount < prevRunningCount.current) void fetchSearches();
    prevRunningCount.current = runningCount;
  }, [runningCount, fetchSearches]);

  // Close the sort menu on outside click.
  useEffect(() => {
    if (!sortOpen) return;
    const onDown = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [sortOpen]);

  const handleDuplicate = useCallback(async (id: string) => {
    const source = searches.find((s) => s.id === id);
    if (!source) return;
    try {
      await createScraperAssignment({
        searchName: `${source.searchName} (Copy)`,
        filters: source.filters,
        frequency: source.frequency,
        enabled: source.enabled,
      } as any);
      await fetchSearches();
    } catch (err) {
      console.error("Duplicate failed:", err);
    }
  }, [searches, fetchSearches]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteScraperAssignment(id);
      setSearches((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }, []);

  // Search filter applied first so status tab counts reflect it.
  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return searches.filter((s) => !q || s.searchName.toLowerCase().includes(q));
  }, [searches, search]);

  const statusCount = (id: ScraperStatus | "all") =>
    id === "all" ? baseFiltered.length : baseFiltered.filter((s) => s.status === id).length;

  const visible = useMemo(() => {
    const list = baseFiltered.filter((s) => status === "all" || s.status === status);
    const cmp: Record<SortKey, (a: SavedSearch, b: SavedSearch) => number> = {
      recent: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      name: (a, b) => a.searchName.localeCompare(b.searchName),
      results: (a, b) => b.signalsFound - a.signalsFound,
      companies: (a, b) => b.companiesFound - a.companiesFound,
    };
    return [...list].sort(cmp[sort]);
  }, [baseFiltered, status, sort]);

  const clearAll = () => { setSearch(""); setStatus("all"); };

  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (status !== "all") chips.push({ key: "status", label: SCRAPER_STATUS_META[status].label, onRemove: () => setStatus("all") });
  if (search.trim()) chips.push({ key: "q", label: `“${search.trim()}”`, onRemove: () => setSearch("") });

  const resultText = visible.length === searches.length
    ? `${searches.length} search${searches.length === 1 ? "" : "es"}`
    : `${visible.length} of ${searches.length} searches`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-[1640px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Saved Searches</h1>
          <p className="text-[13px] text-ink-muted mt-0.5">Monitor job postings across all major boards and discover new leads</p>
        </div>
        <button
          onClick={() => router.push("/dashboard/scrapers/new")}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-ink text-on-ink text-[12px] font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={14} strokeWidth={2} />
          New Search
        </button>
      </div>

      {/* Filter bar */}
      <div className="rounded-[14px] border border-border-subtle bg-surface/60 backdrop-blur-sm px-4 py-3.5">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-2 bg-surface border border-border-default rounded-full px-3.5 py-2 w-[280px]">
            <SearchIcon size={15} className="text-ink-muted shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search saved searches…"
              className="bg-transparent border-0 outline-0 text-[13px] text-ink placeholder:text-ink-faint w-full"
            />
          </div>

          {/* Status tabs */}
          <div className="flex items-center bg-section border border-border-subtle rounded-full p-[3px]">
            {STATUS_TABS.map((tab) => {
              const active = status === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatus(tab.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12px] font-medium transition-all",
                    active ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink-secondary",
                  )}
                >
                  {tab.label}
                  <span className="opacity-55 ml-1.5">{statusCount(tab.id)}</span>
                </button>
              );
            })}
          </div>

          <div className="grow" />

          {/* Sort dropdown */}
          <div ref={sortRef} className="relative">
            <button
              onClick={() => setSortOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-full bg-section border border-border-subtle px-3 py-2 text-[12px] text-ink-secondary hover:border-border-default transition-colors"
            >
              <ArrowUpDown size={13} />
              {SORT_OPTIONS.find((o) => o.id === sort)?.label}
              <ChevronDown size={13} className={cn("transition-transform", sortOpen && "rotate-180")} />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-11 z-50 min-w-[180px] bg-surface border border-border-default rounded-[10px] shadow-lg shadow-black/20 p-1.5">
                {SORT_OPTIONS.map((opt) => {
                  const active = sort === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => { setSort(opt.id); setSortOpen(false); }}
                      className={cn(
                        "flex items-center justify-between w-full rounded-md px-2.5 py-2 text-[12px] transition-colors",
                        active ? "bg-section text-ink" : "text-ink-secondary hover:bg-hover",
                      )}
                    >
                      {opt.label}
                      {active && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-section border border-border-subtle rounded-full p-[3px]">
            {[
              { id: "list" as const, icon: List, title: "List view" },
              { id: "grid" as const, icon: LayoutGrid, title: "Grid view" },
            ].map(({ id, icon: Icon, title }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                title={title}
                className={cn(
                  "flex items-center justify-center w-[30px] h-[26px] rounded-full transition-all",
                  view === id ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink-secondary",
                )}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result line + active chips */}
      <div className="flex items-center justify-between mt-4 mb-3 px-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[13px] text-ink-secondary font-medium whitespace-nowrap">{resultText}</span>
          {chips.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  onClick={chip.onRemove}
                  className="inline-flex items-center gap-1.5 text-[11px] bg-section text-ink-secondary rounded-full px-2.5 py-1 hover:bg-hover transition-colors"
                >
                  {chip.label}
                  <X size={11} />
                </button>
              ))}
              <button onClick={clearAll} className="text-[11px] text-ink-muted px-1.5 py-1 hover:text-ink-secondary transition-colors">
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {visible.length === 0 && (
        <div className="rounded-[14px] border border-border-subtle bg-surface px-10 py-14 text-center">
          <div className="flex items-center justify-center w-[52px] h-[52px] rounded-[14px] bg-section mx-auto mb-4">
            <SearchX size={22} className="text-ink-muted" />
          </div>
          <div className="text-[16px] font-semibold text-ink">
            {searches.length === 0 ? "No saved searches yet" : "No searches match your filters"}
          </div>
          <p className="text-[13px] text-ink-muted mt-1.5 max-w-[360px] mx-auto">
            {searches.length === 0
              ? "Create your first search to start monitoring job postings and discovering leads."
              : "Try removing a status filter — or search a different term."}
          </p>
          {searches.length === 0 ? (
            <button
              onClick={() => router.push("/dashboard/scrapers/new")}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-ink text-on-ink px-4 py-2 text-[12px] font-medium hover:opacity-90 transition-opacity"
            >
              <Plus size={14} strokeWidth={2} /> New Search
            </button>
          ) : chips.length > 0 ? (
            <button onClick={clearAll} className="mt-4 inline-flex items-center rounded-full bg-section border border-border-subtle px-4 py-2 text-[12px] text-ink-secondary hover:border-border-default transition-colors">
              Clear all filters
            </button>
          ) : null}
        </div>
      )}

      {/* List view */}
      {visible.length > 0 && view === "list" && (
        <div className="rounded-[14px] border border-border-subtle bg-surface overflow-hidden">
          {/* Column headers */}
          <div
            className="grid items-center gap-4 px-5 py-3 border-b border-border-subtle"
            style={{ gridTemplateColumns: LIST_COLS }}
          >
            {["Search", "Filters", "Results", "Companies", "Last run"].map((h) => (
              <span key={h} className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{h}</span>
            ))}
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted text-right" />
          </div>

          {visible.map((s) => {
            const running = isRunning(s.id);
            const displayStatus = (running ? "running" : s.status) as ScraperStatus;
            return (
              <div
                key={s.id}
                onClick={() => router.push(`/dashboard/scrapers/${s.id}`)}
                className="group grid items-center gap-4 px-5 py-4 border-b border-border-subtle last:border-b-0 cursor-pointer hover:bg-accent/[0.05] transition-colors"
                style={{ gridTemplateColumns: LIST_COLS }}
              >
                {/* Search */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-section shrink-0">
                    <SearchIcon size={17} strokeWidth={1.5} className="text-ink-muted" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-ink truncate">{s.searchName}</span>
                      <ScraperStatusBadge status={displayStatus} />
                    </div>
                    <div className="text-[12px] text-ink-muted truncate mt-0.5 capitalize">{s.frequency}</div>
                  </div>
                </div>

                {/* Filters */}
                <FilterPills filters={s.filters} />

                {/* Results */}
                <div className="text-[14px] font-semibold text-ink">{s.signalsFound.toLocaleString()}</div>

                {/* Companies */}
                <div className="text-[14px] font-semibold text-ink">{s.companiesFound.toLocaleString()}</div>

                {/* Last run */}
                <div className="min-w-0">
                  <div className="text-[11px] text-ink-secondary truncate">
                    {s.lastRunAt ? formatRelativeTime(s.lastRunAt) : "Never run"}
                  </div>
                  <div className="text-[11px] text-ink-faint mt-0.5">
                    {new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRun(s.id); }}
                    disabled={running}
                    title="Run now"
                    className="flex items-center justify-center w-8 h-8 rounded-full text-ink-muted hover:bg-hover/60 hover:text-ink transition-colors disabled:opacity-50"
                  >
                    {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  </button>
                  <SearchActionsMenu search={s} onRun={handleRun} onDuplicate={handleDuplicate} onDelete={handleDelete} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Grid view */}
      {visible.length > 0 && view === "grid" && (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))" }}>
          {visible.map((s) => (
            <SearchCard
              key={s.id}
              search={s}
              onRun={handleRun}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              isRunning={isRunning(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
