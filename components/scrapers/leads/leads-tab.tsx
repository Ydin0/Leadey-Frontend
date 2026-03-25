"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Users, Search, Sparkles, FolderInput, EyeOff, Loader2,
  ChevronDown, X as XIcon, Ban, Download, ListFilter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { EmptyState } from "@/components/shared/empty-state";
import { generateCSV, downloadCSV } from "@/lib/export-csv";
import { DiscoveryConfigModal } from "./discovery-config-modal";
import { LeadsTable } from "./leads-table";
import { LeadsFilterBar, type LeadsFilters } from "./leads-filter-bar";
import { DiscoveryRunsList } from "./discovery-runs-list";
import { useCrossPageSelection } from "@/lib/hooks/use-cross-page-selection";
import type { ScraperContactRow, DiscoveryRunRow, DiscoveryConfig } from "@/lib/types/contact";
import {
  startDiscovery,
  getDiscoveryRuns,
  pollDiscoveryRun,
  cancelDiscoveryRun,
  getContacts,
  enrichContacts,
  pollEnrichmentAll,
  bulkUpdateContactStatus,
  sendContactsToFunnel,
  resetEnrichment,
} from "@/lib/api/contacts";
import { listFunnels } from "@/lib/api/funnels";
import type { Funnel } from "@/lib/types/funnel";

interface LeadsTabProps {
  assignmentId: string;
  companiesWithLinkedIn: number;
  onCountChange?: (count: number) => void;
}

interface StatusMessage {
  type: "success" | "error";
  text: string;
}

export function LeadsTab({ assignmentId, companiesWithLinkedIn, onCountChange }: LeadsTabProps) {
  const isAuthReady = useAuthReady();
  const [contacts, setContacts] = useState<ScraperContactRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const selection = useCrossPageSelection(totalCount);
  const [submittingDiscovery, setSubmittingDiscovery] = useState(false);

  // Active discovery run being polled
  const [activeRun, setActiveRun] = useState<DiscoveryRunRow | null>(null);
  const [cancellingRun, setCancellingRun] = useState(false);

  // Discovery runs history
  const [discoveryRuns, setDiscoveryRuns] = useState<DiscoveryRunRow[]>([]);

  // Active enrichment request IDs being polled
  const [enrichRequestIds, setEnrichRequestIds] = useState<string[]>([]);

  // Row limit
  const [rowLimit, setRowLimit] = useState<number | null>(null);
  const [showLimitMenu, setShowLimitMenu] = useState(false);
  const limitRef = useRef<HTMLDivElement>(null);

  // Export
  const [exporting, setExporting] = useState(false);

  // Funnel picker
  const [showFunnelPicker, setShowFunnelPicker] = useState(false);
  const [availableFunnels, setAvailableFunnels] = useState<Funnel[]>([]);
  const [sendingToFunnel, setSendingToFunnel] = useState(false);
  const funnelRef = useRef<HTMLDivElement>(null);

  // Filters
  const [filters, setFilters] = useState<LeadsFilters>({
    enrichmentStatus: null,
    contactStatus: null,
  });

  // Status message (toast)
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enrichPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pageSize = 25;

  function showStatus(type: "success" | "error", text: string) {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setStatusMessage({ type, text });
    statusTimerRef.current = setTimeout(() => setStatusMessage(null), 4000);
  }

  const fetchContacts = useCallback(async (p: number, f?: LeadsFilters) => {
    const activeFilters = f || filters;
    try {
      const result = await getContacts({
        assignmentId,
        page: p,
        pageSize,
        status: activeFilters.contactStatus || undefined,
        enrichmentStatus: activeFilters.enrichmentStatus || undefined,
      });
      setContacts(result.data);
      setTotalCount(result.meta.totalCount);
      setTotalPages(result.meta.totalPages);

      // Also get unfiltered count for tab
      if (activeFilters.contactStatus || activeFilters.enrichmentStatus) {
        const unfilteredResult = await getContacts({ assignmentId, page: 1, pageSize: 1 });
        onCountChange?.(unfilteredResult.meta.totalCount);
      } else {
        onCountChange?.(result.meta.totalCount);
      }
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
    }
  }, [assignmentId, filters, onCountChange]);

  // Initial load
  useEffect(() => {
    if (!isAuthReady) return;
    (async () => {
      setLoading(true);
      try {
        // Check for active discovery runs
        const runs = await getDiscoveryRuns(assignmentId);
        setDiscoveryRuns(runs);
        const runningRun = runs.find((r) => r.status === "running" || r.status === "pending");
        if (runningRun) {
          setActiveRun(runningRun);
        }
        await fetchContacts(1);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthReady, assignmentId, fetchContacts]);

  // Discovery polling
  useEffect(() => {
    if (!activeRun) return;

    pollRef.current = setInterval(async () => {
      try {
        const updated = await pollDiscoveryRun(activeRun.id);
        if (updated.status === "succeeded" || updated.status === "failed") {
          setActiveRun(null);
          if (updated.status === "succeeded") {
            showStatus("success", `Discovery complete: ${updated.contactsFound} contacts found`);
          } else {
            showStatus("error", updated.error || "Discovery run failed");
          }
          await fetchContacts(1);
          setPage(1);
          // Refresh runs list
          const runs = await getDiscoveryRuns(assignmentId);
          setDiscoveryRuns(runs);
        } else {
          setActiveRun(updated);
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 8000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeRun, fetchContacts, assignmentId]);

  // Enrichment polling
  useEffect(() => {
    if (enrichRequestIds.length === 0) return;

    enrichPollRef.current = setInterval(async () => {
      try {
        const result = await pollEnrichmentAll(enrichRequestIds);
        if (result.status === "finished") {
          setEnrichRequestIds([]);
          showStatus("success", `Enrichment complete: ${result.enrichedCount} contacts enriched`);
          await fetchContacts(page);
        }
      } catch (err) {
        console.error("Enrich poll error:", err);
      }
    }, 8000);

    return () => {
      if (enrichPollRef.current) clearInterval(enrichPollRef.current);
    };
  }, [enrichRequestIds, page, fetchContacts]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (funnelRef.current && !funnelRef.current.contains(e.target as Node)) {
        setShowFunnelPicker(false);
      }
      if (limitRef.current && !limitRef.current.contains(e.target as Node)) {
        setShowLimitMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleStartDiscovery(config: DiscoveryConfig) {
    setSubmittingDiscovery(true);
    try {
      const result = await startDiscovery(assignmentId, config);
      setShowConfigModal(false);
      showStatus("success", `Discovery started for ${result.companiesQueried} companies`);
      const runs = await getDiscoveryRuns(assignmentId);
      setDiscoveryRuns(runs);
      const newRun = runs.find((r) => r.id === result.runId);
      if (newRun) setActiveRun(newRun);
    } catch (err) {
      showStatus("error", "Failed to start discovery");
      console.error("Failed to start discovery:", err);
    } finally {
      setSubmittingDiscovery(false);
    }
  }

  async function handleCancelRun() {
    if (!activeRun || cancellingRun) return;
    setCancellingRun(true);
    try {
      await cancelDiscoveryRun(activeRun.id);
      setActiveRun(null);
      showStatus("success", "Discovery run cancelled");
      const runs = await getDiscoveryRuns(assignmentId);
      setDiscoveryRuns(runs);
      await fetchContacts(1);
      setPage(1);
    } catch (err) {
      showStatus("error", "Failed to cancel discovery run");
      console.error("Failed to cancel:", err);
    } finally {
      setCancellingRun(false);
    }
  }

  async function handleEnrichSingle(contactId: string) {
    try {
      const result = await enrichContacts([contactId]);
      setEnrichRequestIds(result.requestIds);
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId ? { ...c, enrichmentStatus: "pending" as const } : c,
        ),
      );
      showStatus("success", "Enrichment started for 1 contact");
    } catch (err) {
      showStatus("error", "Failed to start enrichment");
      console.error("Failed to enrich:", err);
    }
  }

  async function handleEnrichSelected() {
    const ids = Array.from(selection.selectedIds);
    const unenriched = contacts
      .filter((c) => ids.includes(c.id) && c.enrichmentStatus === "none")
      .map((c) => c.id);
    if (unenriched.length === 0) return;

    try {
      const result = await enrichContacts(unenriched);
      setEnrichRequestIds(result.requestIds);
      setContacts((prev) =>
        prev.map((c) =>
          unenriched.includes(c.id) ? { ...c, enrichmentStatus: "pending" as const } : c,
        ),
      );
      selection.clearSelection();
      showStatus("success", `Enrichment started for ${unenriched.length} contacts`);
    } catch (err) {
      showStatus("error", "Failed to start enrichment");
      console.error("Failed to bulk enrich:", err);
    }
  }

  async function handleEnrichAll() {
    try {
      const limit = rowLimit ?? Infinity;
      let allIds: string[] = [];
      let p = 1;
      while (allIds.length < limit) {
        const batch = await getContacts({
          assignmentId,
          page: p,
          pageSize: 500,
          enrichmentStatus: "none",
          status: filters.contactStatus || undefined,
        });
        if (batch.data.length === 0) break;
        allIds.push(...batch.data.map((c) => c.id));
        if (batch.data.length < 500) break;
        p++;
      }
      if (rowLimit !== null) allIds = allIds.slice(0, rowLimit);
      if (allIds.length === 0) {
        showStatus("success", "All contacts are already enriched");
        return;
      }
      const result = await enrichContacts(allIds);
      setEnrichRequestIds(result.requestIds);
      showStatus("success", `Enrichment started for ${allIds.length} contacts`);
      await fetchContacts(page);
    } catch (err) {
      showStatus("error", "Failed to enrich all contacts");
      console.error("Failed to enrich all:", err);
    }
  }

  const CSV_COLUMNS = [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "fullName", label: "Full Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "currentTitle", label: "Title" },
    { key: "currentCompany", label: "Current Company" },
    { key: "companyName", label: "Company Name" },
    { key: "location", label: "Location" },
    { key: "linkedinUrl", label: "LinkedIn URL" },
    { key: "enrichmentStatus", label: "Enrichment Status" },
    { key: "status", label: "Status" },
  ];

  async function handleExport() {
    setExporting(true);
    try {
      const limit = rowLimit ?? Infinity;
      let allRows: ScraperContactRow[] = [];
      let p = 1;
      while (allRows.length < limit) {
        const batch = await getContacts({
          assignmentId,
          page: p,
          pageSize: 500,
          status: filters.contactStatus || undefined,
          enrichmentStatus: filters.enrichmentStatus || undefined,
        });
        if (batch.data.length === 0) break;
        allRows.push(...batch.data);
        if (batch.data.length < 500) break;
        p++;
      }
      if (rowLimit !== null) allRows = allRows.slice(0, rowLimit);
      const csv = generateCSV(allRows, CSV_COLUMNS);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `contacts-export-${date}.csv`);
      showStatus("success", `Exported ${allRows.length} contacts`);
    } catch (err) {
      showStatus("error", "Failed to export contacts");
      console.error("Failed to export:", err);
    } finally {
      setExporting(false);
    }
  }

  async function handleDismissSelected() {
    const ids = Array.from(selection.selectedIds);
    if (ids.length === 0) return;
    try {
      await bulkUpdateContactStatus(ids, "dismissed");
      selection.clearSelection();
      showStatus("success", `${ids.length} contacts dismissed`);
      await fetchContacts(page);
    } catch (err) {
      showStatus("error", "Failed to dismiss contacts");
      console.error("Failed to dismiss:", err);
    }
  }

  async function handleRetryEnrichment(contactId: string) {
    try {
      await resetEnrichment([contactId]);
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId
            ? { ...c, enrichmentStatus: "none" as const, email: null, phone: null }
            : c,
        ),
      );
      showStatus("success", "Enrichment reset — you can now re-enrich this contact");
    } catch (err) {
      showStatus("error", "Failed to reset enrichment");
      console.error("Failed to reset enrichment:", err);
    }
  }

  async function handleOpenFunnelPicker() {
    if (availableFunnels.length === 0) {
      try {
        const funnelsList = await listFunnels();
        setAvailableFunnels(funnelsList);
      } catch (err) {
        showStatus("error", "Failed to load funnels");
        console.error("Failed to load funnels:", err);
        return;
      }
    }
    setShowFunnelPicker(!showFunnelPicker);
  }

  async function handleSendToFunnel(funnelId: string) {
    const ids = Array.from(selection.selectedIds);
    if (ids.length === 0) return;
    setSendingToFunnel(true);
    setShowFunnelPicker(false);
    try {
      const result = await sendContactsToFunnel(ids, funnelId);
      selection.clearSelection();
      showStatus("success", `${result.created} contacts sent to "${result.funnelName}" (${result.skipped} skipped)`);
      await fetchContacts(page);
    } catch (err) {
      showStatus("error", "Failed to send contacts to funnel");
      console.error("Failed to send to funnel:", err);
    } finally {
      setSendingToFunnel(false);
    }
  }

  function handleFiltersChange(newFilters: LeadsFilters) {
    setFilters(newFilters);
    setPage(1);
    selection.clearSelection();
    fetchContacts(1, newFilters);
  }

  function handlePageChange(p: number) {
    setPage(p);
    fetchContacts(p);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  // Active discovery run progress
  if (activeRun) {
    return (
      <div className="bg-surface rounded-[14px] border border-border-subtle p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-signal-blue/10 flex items-center justify-center mx-auto mb-4">
          <Loader2 size={22} className="animate-spin text-signal-blue-text" />
        </div>
        <h3 className="text-[15px] font-semibold text-ink mb-1">Discovering Contacts</h3>
        <p className="text-[12px] text-ink-muted mb-4">
          Searching {activeRun.companiesQueried} companies for decision makers...
        </p>
        {activeRun.contactsFound > 0 && (
          <p className="text-[13px] font-medium text-signal-blue-text mb-4">
            {activeRun.contactsFound} contacts found so far
          </p>
        )}
        <div className="w-48 h-1.5 rounded-full bg-section mx-auto overflow-hidden">
          <div className="h-full bg-signal-blue-text rounded-full animate-pulse" style={{ width: "60%" }} />
        </div>
        <p className="text-[10px] text-ink-muted mt-3 mb-4">
          This may take 5-60 minutes. You can leave this tab and come back.
        </p>
        <button
          onClick={handleCancelRun}
          disabled={cancellingRun}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] text-[11px] font-medium text-signal-red-text border border-signal-red-text/20 hover:bg-signal-red/10 transition-colors mx-auto disabled:opacity-50"
        >
          {cancellingRun ? <Loader2 size={11} className="animate-spin" /> : <Ban size={11} />}
          Cancel
        </button>
      </div>
    );
  }

  // Empty state (no contacts and no active filters)
  if (totalCount === 0 && !filters.enrichmentStatus && !filters.contactStatus) {
    return (
      <>
        <DiscoveryRunsList runs={discoveryRuns} />
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Discover decision makers at the companies in this search using LinkedIn data."
          actionLabel="Find Decision Makers"
          onAction={() => setShowConfigModal(true)}
        />
        <DiscoveryConfigModal
          open={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          onSubmit={handleStartDiscovery}
          companiesWithLinkedIn={companiesWithLinkedIn}
          submitting={submittingDiscovery}
        />
      </>
    );
  }

  // Populated state
  const hasUnenriched = contacts.some((c) => selection.selectedIds.has(c.id) && c.enrichmentStatus === "none");

  return (
    <div>
      {/* Status message banner */}
      {statusMessage && (
        <div
          className={cn(
            "flex items-center justify-between px-4 py-2.5 rounded-[10px] mb-4 text-[11px] font-medium",
            statusMessage.type === "success"
              ? "bg-signal-green/10 text-signal-green-text border border-signal-green-text/10"
              : "bg-signal-red/10 text-signal-red-text border border-signal-red-text/10"
          )}
        >
          <span>{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-0.5 hover:opacity-70 transition-opacity"
          >
            <XIcon size={12} />
          </button>
        </div>
      )}

      {/* Discovery runs history */}
      <DiscoveryRunsList runs={discoveryRuns} />

      {/* Header bar */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[12px] font-medium text-ink">
          {totalCount} contacts
        </span>

        {/* Row limit dropdown */}
        {totalCount > 25 && (
          <div className="relative" ref={limitRef}>
            <button
              onClick={() => setShowLimitMenu(!showLimitMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[20px] text-[11px] font-medium text-ink-secondary border border-border-subtle hover:bg-hover transition-colors"
            >
              <ListFilter size={11} />
              Working with {rowLimit ?? "All"}
              <ChevronDown size={10} />
            </button>
            {showLimitMenu && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-surface rounded-[10px] border border-border-default shadow-lg py-1 z-20">
                {[25, 50, 100, 200].filter((n) => n < totalCount).map((n) => (
                  <button
                    key={n}
                    onClick={() => { setRowLimit(n); setShowLimitMenu(false); }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-[11px] hover:bg-hover transition-colors",
                      rowLimit === n ? "font-semibold text-ink" : "text-ink-secondary",
                    )}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => { setRowLimit(null); setShowLimitMenu(false); }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-[11px] hover:bg-hover transition-colors",
                    rowLimit === null ? "font-semibold text-ink" : "text-ink-secondary",
                  )}
                >
                  All
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={handleExport}
            disabled={totalCount === 0 || exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[11px] font-medium bg-surface text-ink border border-border-subtle hover:bg-hover transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
            Export
          </button>
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[11px] font-medium bg-surface text-ink border border-border-subtle hover:bg-hover transition-colors"
          >
            <Search size={11} />
            Find More
          </button>
          <button
            onClick={handleEnrichAll}
            disabled={enrichRequestIds.length > 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[11px] font-medium bg-signal-green/10 text-signal-green-text hover:bg-signal-green/20 transition-colors disabled:opacity-50"
          >
            <Sparkles size={11} />
            {enrichRequestIds.length > 0
              ? "Enriching..."
              : rowLimit !== null
                ? `Enrich ${rowLimit}`
                : "Enrich All"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <LeadsFilterBar filters={filters} onChange={handleFiltersChange} />

      {/* Fixed bottom bulk action bar — doesn't shift table layout */}
      {selection.selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-[14px] bg-surface border border-border-default shadow-lg">
          <span className="text-[11px] font-medium text-signal-blue-text">
            {selection.selectedCount} selected
          </span>

          {/* Select all matching link */}
          {selection.showSelectAllBanner && !selection.isAllMatching && (
            <>
              <span className="text-[10px] text-ink-faint">|</span>
              <button
                onClick={() => selection.selectAllMatching()}
                className="text-[11px] font-medium text-signal-blue-text hover:underline"
              >
                Select all {totalCount.toLocaleString()}
              </button>
            </>
          )}
          {selection.isAllMatching && (
            <>
              <span className="text-[10px] text-ink-faint">|</span>
              <span className="text-[11px] text-signal-blue-text">All matching</span>
            </>
          )}

          <div className="w-px h-5 bg-border-subtle mx-1" />

          {hasUnenriched && (
            <button
              onClick={handleEnrichSelected}
              className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] text-[11px] font-medium bg-signal-green/20 text-signal-green-text hover:bg-signal-green/30 transition-colors"
            >
              <Sparkles size={10} />
              Enrich
            </button>
          )}
          {/* Send to Funnel with dropdown */}
          <div className="relative" ref={funnelRef}>
            <button
              onClick={handleOpenFunnelPicker}
              disabled={sendingToFunnel}
              className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] text-[11px] font-medium bg-signal-blue/20 text-signal-blue-text hover:bg-signal-blue/30 transition-colors disabled:opacity-50"
            >
              {sendingToFunnel ? <Loader2 size={10} className="animate-spin" /> : <FolderInput size={10} />}
              Send to Funnel
              <ChevronDown size={10} />
            </button>
            {showFunnelPicker && (
              <div className="absolute bottom-full left-0 mb-1 w-56 bg-surface rounded-[10px] border border-border-default shadow-lg py-1 z-20">
                {availableFunnels.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-ink-muted">No funnels found</div>
                ) : (
                  availableFunnels.map((funnel) => (
                    <button
                      key={funnel.id}
                      onClick={() => handleSendToFunnel(funnel.id)}
                      className="w-full text-left px-3 py-2 hover:bg-hover transition-colors"
                    >
                      <div className="text-[11px] font-medium text-ink">{funnel.name}</div>
                      {funnel.description && (
                        <div className="text-[10px] text-ink-muted">{funnel.description}</div>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleDismissSelected}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] text-[11px] font-medium bg-section text-ink-muted hover:bg-hover transition-colors"
          >
            <EyeOff size={10} />
            Dismiss
          </button>
          <button
            onClick={() => selection.clearSelection()}
            className="p-1.5 rounded-md hover:bg-hover/50 text-ink-muted transition-colors ml-1"
          >
            <XIcon size={12} />
          </button>
        </div>
      )}

      <LeadsTable
        contacts={contacts}
        page={page}
        totalPages={totalPages}
        totalItems={totalCount}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        selectedIds={selection.selectedIds}
        onSelectionChange={() => {}}
        crossPageSelection={selection}
        onEnrichSingle={handleEnrichSingle}
        onRetryEnrichment={handleRetryEnrichment}
      />

      <DiscoveryConfigModal
        open={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSubmit={handleStartDiscovery}
        companiesWithLinkedIn={companiesWithLinkedIn}
        submitting={submittingDiscovery}
      />
    </div>
  );
}
