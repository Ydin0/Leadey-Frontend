"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchCard } from "./search-card";
import {
  getScraperAssignments,
  deleteScraperAssignment,
  createScraperAssignment,
  triggerScraperRun,
  type ScraperAssignmentRow,
} from "@/lib/api/scrapers";
import type { SavedSearch } from "@/lib/types/scraper";
import { formatRelativeTime } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";

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

export function SearchesLibraryShell() {
  const router = useRouter();
  const isAuthReady = useAuthReady();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());

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

  const handleRun = useCallback(async (id: string) => {
    setRunningIds((prev) => new Set(prev).add(id));
    try {
      await triggerScraperRun(id);
      await fetchSearches();
    } catch (err) {
      console.error("Run failed:", err);
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [fetchSearches]);

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

  // Stats
  const totalSearches = searches.length;
  const totalResults = searches.reduce((sum, s) => sum + s.signalsFound, 0);
  const lastRun = searches
    .filter((s) => s.lastRunAt)
    .sort((a, b) => new Date(b.lastRunAt!).getTime() - new Date(a.lastRunAt!).getTime())[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-[17px] font-semibold text-ink">Saved Searches</h1>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Monitor job postings across all major boards via TheirStack
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/scrapers/new")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
        >
          <Plus size={13} strokeWidth={2} />
          New Search
        </button>
      </div>

      {/* Stats row */}
      {totalSearches > 0 && (
        <div className="flex items-center gap-2 text-[10px] text-ink-muted mb-5 mt-3">
          <span>{totalSearches} {totalSearches === 1 ? "search" : "searches"}</span>
          <span className="text-border-default">&middot;</span>
          <span>{totalResults.toLocaleString()} total results</span>
          {lastRun?.lastRunAt && (
            <>
              <span className="text-border-default">&middot;</span>
              <span>Last run: {formatRelativeTime(lastRun.lastRunAt)}</span>
            </>
          )}
        </div>
      )}

      {/* Grid or empty state */}
      {totalSearches === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Search}
            title="No saved searches yet"
            description="Create your first search to start monitoring job postings and discovering leads."
            actionLabel="+ New Search"
            onAction={() => router.push("/dashboard/scrapers/new")}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {searches.map((search) => (
            <SearchCard
              key={search.id}
              search={search}
              onRun={handleRun}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              isRunning={runningIds.has(search.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
