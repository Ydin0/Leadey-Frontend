"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { ScraperActiveList } from "@/components/icps/scrapers/scraper-active-list";
import { ScraperSignalFeed } from "./scraper-signal-feed";
import { ScraperWizard } from "./scraper-wizard";
import { EmptyState } from "@/components/shared/empty-state";
import type { ScraperAssignment } from "@/lib/types/scraper";
import {
  getScraperAssignments,
  createScraperAssignment,
  updateScraperAssignment,
  triggerScraperRun,
  getScraperSignals,
  type ScraperAssignmentRow,
  type ScraperSignalRow,
} from "@/lib/api/scrapers";

// Keep the catalog for the active list display (icon lookup etc.)
import { scraperCatalog } from "@/lib/mock-data/scrapers";

function toFrontendAssignment(row: ScraperAssignmentRow): ScraperAssignment {
  return {
    id: row.id,
    scraperId: row.scraperId,
    scraperName: row.scraperName,
    icpId: "",
    enabled: row.enabled,
    frequency: row.frequency as ScraperAssignment["frequency"],
    configuredAt: new Date(row.createdAt),
    lastRun: row.lastRunAt ? new Date(row.lastRunAt) : null,
    creditsPerRun: row.creditsPerRun,
    status: row.status as ScraperAssignment["status"],
    signalsFound: row.signalsFound,
    companiesFound: row.companiesFound,
    keywords: row.keywords,
    excludedKeywords: row.excludedKeywords,
    keywordMatchMode: row.keywordMatchMode as ScraperAssignment["keywordMatchMode"],
    countries: row.countries,
    languages: row.languages,
    sourceIds: row.sourceIds as ScraperAssignment["sourceIds"],
    sourceSignalLimits: row.sourceSignalLimits as ScraperAssignment["sourceSignalLimits"],
    jobSeniority: (row.jobSeniority || []) as ScraperAssignment["jobSeniority"],
    remoteFilter: (row.remoteFilter || "include") as ScraperAssignment["remoteFilter"],
    lookbackDays: row.lookbackDays,
    maxSignalsPerRun: row.maxSignalsPerRun,
    minSignalScore: row.minSignalScore,
    onlyDecisionMakers: row.onlyDecisionMakers,
    dedupeCompanies: row.dedupeCompanies,
    includeRemoteRoles: row.includeRemoteRoles,
    notifyOnHighIntent: row.notifyOnHighIntent,
  };
}

export function ScrapersPageShell() {
  const [assignments, setAssignments] = useState<ScraperAssignment[]>([]);
  const [signals, setSignals] = useState<ScraperSignalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [wizardOpen, setWizardOpen] = useState(false);

  const fetchAssignments = useCallback(async () => {
    try {
      const rows = await getScraperAssignments();
      setAssignments(rows.map(toFrontendAssignment));
    } catch {
      // Will show empty state
    }
  }, []);

  const fetchSignals = useCallback(async () => {
    try {
      const rows = await getScraperSignals();
      setSignals(rows);
    } catch {
      // Will show empty
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchAssignments(), fetchSignals()]).finally(() =>
      setLoading(false),
    );
  }, [fetchAssignments, fetchSignals]);

  async function handleWizardCreate(body: Partial<ScraperAssignmentRow>) {
    const row = await createScraperAssignment(body);
    setAssignments((prev) => [toFrontendAssignment(row), ...prev]);
  }

  async function handleUpdateAssignment(updated: ScraperAssignment) {
    try {
      const row = await updateScraperAssignment(updated.id, {
        enabled: updated.enabled,
        frequency: updated.frequency,
        keywords: updated.keywords,
        excludedKeywords: updated.excludedKeywords,
        keywordMatchMode: updated.keywordMatchMode,
        countries: updated.countries,
        languages: updated.languages,
        jobSeniority: updated.jobSeniority,
        remoteFilter: updated.remoteFilter,
        lookbackDays: updated.lookbackDays,
        maxSignalsPerRun: updated.maxSignalsPerRun,
        minSignalScore: updated.minSignalScore,
        onlyDecisionMakers: updated.onlyDecisionMakers,
        dedupeCompanies: updated.dedupeCompanies,
        includeRemoteRoles: updated.includeRemoteRoles,
        notifyOnHighIntent: updated.notifyOnHighIntent,
        creditsPerRun: updated.creditsPerRun,
      });
      setAssignments((prev) =>
        prev.map((a) => (a.id === updated.id ? toFrontendAssignment(row) : a)),
      );
    } catch {
      // Revert
    }
  }

  async function handleRunNow(assignmentId: string) {
    try {
      setRunningIds((prev) => new Set(prev).add(assignmentId));
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId ? { ...a, status: "running" as const } : a,
        ),
      );

      // TheirStack runs are synchronous — no polling needed
      await triggerScraperRun(assignmentId);

      // Refresh data after run completes
      await Promise.all([fetchAssignments(), fetchSignals()]);
    } catch {
      await fetchAssignments();
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(assignmentId);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-ink">Scrapers</h1>
          <p className="text-[12px] text-ink-muted mt-0.5">
            Configure and run job board scrapers to discover hiring signals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWizardOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
          >
            <Plus size={13} strokeWidth={2} />
            New Scraper
          </button>
        </div>
      </div>

      {/* Empty state or active list */}
      {assignments.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No scrapers configured"
          description="Set up your first scraper to discover hiring signals from job boards."
          actionLabel="+ New Scraper"
          onAction={() => setWizardOpen(true)}
        />
      ) : (
        <ScraperActiveList
          assignments={assignments}
          catalog={scraperCatalog}
          onUpdateAssignment={handleUpdateAssignment}
          onRunNow={handleRunNow}
          runningIds={runningIds}
        />
      )}

      {/* Signal feed */}
      {signals.length > 0 && <ScraperSignalFeed signals={signals} />}

      {/* Wizard modal */}
      <ScraperWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreate={handleWizardCreate}
      />
    </div>
  );
}
