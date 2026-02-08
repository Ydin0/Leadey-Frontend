"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";

import { mockICPs } from "@/lib/mock-data/icps";
import { mockCompanies } from "@/lib/mock-data/companies";
import { mockLeads } from "@/lib/mock-data/leads";
import { mockOrgCharts } from "@/lib/mock-data/org-charts";
import { mockLiveSignals, mockEnrichmentJobs, mockWebhookEvents, mockWebhookEndpoints, mockCSVImports, mockPipelineStats } from "@/lib/mock-data/pipeline";
import { scraperCatalog, mockScraperAssignments } from "@/lib/mock-data/scrapers";

import { ICPStatusBadge } from "@/components/icps/icp-status-badge";
import { ICPStatsBar } from "@/components/icps/dashboard/icp-stats-bar";
import { ICPTabNav, type ICPTab } from "@/components/icps/dashboard/icp-tab-nav";

// Pipeline Tab
import { PipelineFlow } from "@/components/icps/pipeline/pipeline-flow";
import { LiveSignalFeed } from "@/components/icps/pipeline/live-signal-feed";
import { EnrichmentQueue } from "@/components/icps/pipeline/enrichment-queue";
import { WebhookFeed } from "@/components/icps/pipeline/webhook-feed";
import { CreditTracker } from "@/components/icps/pipeline/credit-tracker";

// Companies Tab
import { CompanyTable } from "@/components/icps/companies/company-table";

// Leads Tab
import { LeadTable } from "@/components/icps/leads/lead-table";

// Scrapers Tab
import { ScraperActiveList } from "@/components/icps/scrapers/scraper-active-list";
import { ScraperCatalog } from "@/components/icps/scrapers/scraper-catalog";

// Sources Tab
import { WebhookEndpoints } from "@/components/icps/sources/webhook-endpoints";
import { CSVImportZone } from "@/components/icps/sources/csv-import-zone";
import { CSVImportHistory } from "@/components/icps/sources/csv-import-history";

// Rules Tab
import { EnrichmentRulesBuilder } from "@/components/icps/enrichment/enrichment-rules-builder";
import type { ScraperAssignment, ScraperDefinition } from "@/lib/types/scraper";

export default function ICPDashboardPage() {
  const params = useParams();
  const icpId = params.id as string;
  const icp = mockICPs.find((i) => i.id === icpId) || mockICPs[0];

  const [activeTab, setActiveTab] = useState<ICPTab>("pipeline");
  const [showCatalog, setShowCatalog] = useState(false);
  const [scraperAssignments, setScraperAssignments] = useState<ScraperAssignment[]>(
    () => mockScraperAssignments.filter((s) => s.icpId === icp.id)
  );

  const icpCompanies = mockCompanies.filter((c) => c.icpId === icp.id);
  const icpLeads = mockLeads.filter((l) => l.icpId === icp.id);
  const hasActiveScrapers = scraperAssignments.some((s) => s.enabled);

  function handleUpdateScraper(updated: ScraperAssignment) {
    setScraperAssignments((prev) =>
      prev.map((item) =>
        item.id === updated.id
          ? { ...updated, configuredAt: new Date() }
          : item
      )
    );
  }

  function handleAddScraper(scraper: ScraperDefinition) {
    setScraperAssignments((prev) => {
      const existing = prev.find((item) => item.scraperId === scraper.id);
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id ? { ...item, enabled: true } : item
        );
      }

      const newAssignment: ScraperAssignment = {
        id: `sa_${prev.length + 1}`,
        scraperId: scraper.id,
        scraperName: scraper.name,
        icpId: icp.id,
        enabled: true,
        frequency: scraper.frequencyOptions[0] || "daily",
        configuredAt: new Date(),
        lastRun: null,
        creditsPerRun: scraper.creditCostPerRun,
        status: "idle",
        signalsFound: 0,
        companiesFound: 0,
        keywords: [],
        excludedKeywords: [],
        keywordMatchMode: "any",
        countries: icp.companyProfile.geographies.length
          ? [...icp.companyProfile.geographies]
          : ["United States"],
        languages: ["English"],
        sourceIds: [...scraper.sourceIds],
        sourceSignalLimits: Object.fromEntries(
          scraper.sourceIds.map((source) => [source, 20])
        ),
        lookbackDays: scraper.frequencyOptions.includes("hourly") ? 3 : 7,
        maxSignalsPerRun: 100,
        minSignalScore: 70,
        onlyDecisionMakers: false,
        dedupeCompanies: true,
        includeRemoteRoles: true,
        notifyOnHighIntent: true,
      };

      return [...prev, newAssignment];
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <Link
          href="/dashboard/icps"
          className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink transition-colors mb-3"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Back to ICPs
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[18px] font-semibold text-ink">{icp.name}</h1>
            <ICPStatusBadge status={icp.status} />
            {hasActiveScrapers && (
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal-green-text opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-signal-green-text" />
              </span>
            )}
          </div>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle">
            <Settings size={13} strokeWidth={1.5} />
            Edit ICP
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="mb-4">
        <ICPStatsBar stats={icp.stats} />
      </div>

      {/* Tab Nav */}
      <div className="mb-4">
        <ICPTabNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      {activeTab === "pipeline" && (
        <div>
          <PipelineFlow stats={mockPipelineStats} />
          <div className="grid grid-cols-5 gap-4 mt-4">
            {/* Left — Signal Feed (3/5) */}
            <div className="col-span-3">
              <LiveSignalFeed signals={mockLiveSignals} />
            </div>
            {/* Right — Enrichment + Webhook + Credits (2/5) */}
            <div className="col-span-2 space-y-4">
              <EnrichmentQueue jobs={mockEnrichmentJobs} />
              <WebhookFeed events={mockWebhookEvents} />
              <CreditTracker used={icp.stats.creditsUsed} total={icp.stats.creditsUsed + icp.stats.creditsRemaining} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "companies" && (
        <CompanyTable
          companies={icpCompanies}
          leads={icpLeads}
          orgCharts={mockOrgCharts}
        />
      )}

      {activeTab === "leads" && (
        <LeadTable leads={icpLeads} />
      )}

      {activeTab === "scrapers" && (
        <div className="space-y-6">
          <ScraperActiveList
            assignments={scraperAssignments}
            catalog={scraperCatalog}
            onUpdateAssignment={handleUpdateScraper}
          />
          <div>
            {!showCatalog ? (
              <button
                onClick={() => setShowCatalog(true)}
                className="px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle"
              >
                Add Scraper
              </button>
            ) : (
              <ScraperCatalog
                scrapers={scraperCatalog}
                activeScraperIds={scraperAssignments.map((item) => item.scraperId)}
                onAdd={handleAddScraper}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === "sources" && (
        <div className="space-y-6">
          <WebhookEndpoints endpoints={mockWebhookEndpoints} />
          <div>
            <h3 className="text-[13px] font-semibold text-ink mb-3">CSV Imports</h3>
            <CSVImportZone />
          </div>
          <CSVImportHistory imports={mockCSVImports} />
        </div>
      )}

      {activeTab === "rules" && (
        <EnrichmentRulesBuilder
          rules={icp.enrichmentRules}
          creditsUsed={icp.stats.creditsUsed}
        />
      )}
    </div>
  );
}
