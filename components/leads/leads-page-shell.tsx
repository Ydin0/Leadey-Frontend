"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Users, Building2, Sparkles, FolderInput, Loader2, ChevronDown,
  EyeOff, Download, X as XIcon, Mail, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { generateCSV, downloadCSV } from "@/lib/export-csv";
import { LeadsTable } from "@/components/scrapers/leads/leads-table";
import {
  LeadsFilterBar, DEFAULT_LEADS_FILTERS, type LeadsFilters,
} from "@/components/scrapers/leads/leads-filter-bar";
import { useCrossPageSelection } from "@/lib/hooks/use-cross-page-selection";
import { CompaniesTable } from "./companies-table";
import {
  getContacts, getContactCompanyCounts, enrichContacts, pollEnrichmentAll,
  bulkUpdateContactStatus, sendContactsToFunnel, resetEnrichment,
} from "@/lib/api/contacts";
import { listFunnels } from "@/lib/api/funnels";
import type { Funnel } from "@/lib/types/funnel";
import type { ScraperContactRow } from "@/lib/types/contact";

const PAGE_SIZE = 25;

interface CompanyOption {
  name: string;
  count: number;
}

export function LeadsPageShell() {
  const isAuthReady = useAuthReady();
  const [view, setView] = useState<"leads" | "companies">("leads");
  const [contacts, setContacts] = useState<ScraperContactRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LeadsFilters>(DEFAULT_LEADS_FILTERS);
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);

  const selection = useCrossPageSelection(totalCount);
  const [enrichRequestIds, setEnrichRequestIds] = useState<string[]>([]);
  const enrichPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [stats, setStats] = useState({ total: 0, enriched: 0, inCampaign: 0 });

  const [availableFunnels, setAvailableFunnels] = useState<Funnel[]>([]);
  const [showFunnelPicker, setShowFunnelPicker] = useState(false);
  const [sendingToFunnel, setSendingToFunnel] = useState(false);
  const [exporting, setExporting] = useState(false);
  const funnelRef = useRef<HTMLDivElement>(null);

  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showStatus(type: "success" | "error", text: string) {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    setStatusMessage({ type, text });
    statusTimer.current = setTimeout(() => setStatusMessage(null), 4000);
  }

  const filterPayload = useCallback(
    () => ({
      status: filters.contactStatus || undefined,
      enrichmentStatus: filters.enrichmentStatus || undefined,
      company: filters.companies.length > 0 ? filters.companies.join(",") : undefined,
      title: filters.title || undefined,
      location: filters.location || undefined,
      hasEmail: filters.hasEmail || undefined,
      hasPhone: filters.hasPhone || undefined,
    }),
    [filters],
  );

  const fetchContacts = useCallback(async (p: number, f?: LeadsFilters) => {
    const af = f || filters;
    const result = await getContacts({
      page: p,
      pageSize: PAGE_SIZE,
      status: af.contactStatus || undefined,
      enrichmentStatus: af.enrichmentStatus || undefined,
      company: af.companies.length > 0 ? af.companies.join(",") : undefined,
      title: af.title || undefined,
      location: af.location || undefined,
      hasEmail: af.hasEmail || undefined,
      hasPhone: af.hasPhone || undefined,
    });
    setContacts(result.data);
    setTotalCount(result.meta.totalCount);
    setTotalPages(result.meta.totalPages);
  }, [filters]);

  const loadStats = useCallback(async () => {
    try {
      const [all, enriched, inFunnel] = await Promise.all([
        getContacts({ page: 1, pageSize: 1 }),
        getContacts({ page: 1, pageSize: 1, enrichmentStatus: "enriched" }),
        getContacts({ page: 1, pageSize: 1, status: "in_funnel" }),
      ]);
      setStats({
        total: all.meta.totalCount,
        enriched: enriched.meta.totalCount,
        inCampaign: inFunnel.meta.totalCount,
      });
    } catch { /* non-critical */ }
  }, []);

  // Initial load
  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await fetchContacts(1);
        const counts = await getContactCompanyCounts();
        if (!cancelled) {
          setCompanyOptions(
            counts
              .filter((c) => c.companyName)
              .map((c) => ({ name: c.companyName!, count: c.count }))
              .sort((a, b) => b.count - a.count),
          );
        }
        await loadStats();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthReady, fetchContacts, loadStats]);

  // Enrichment polling
  useEffect(() => {
    if (enrichRequestIds.length === 0) return;
    enrichPollRef.current = setInterval(async () => {
      try {
        const result = await pollEnrichmentAll(enrichRequestIds);
        if (result.status === "finished") {
          setEnrichRequestIds([]);
          showStatus("success", `Enrichment complete: ${result.enrichedCount} enriched`);
          await fetchContacts(page);
          await loadStats();
        }
      } catch { /* keep polling */ }
    }, 8000);
    return () => { if (enrichPollRef.current) clearInterval(enrichPollRef.current); };
  }, [enrichRequestIds, page, fetchContacts, loadStats]);

  // Outside-click for funnel picker
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (funnelRef.current && !funnelRef.current.contains(e.target as Node)) setShowFunnelPicker(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handleFiltersChange(next: LeadsFilters) {
    setFilters(next);
    setPage(1);
    selection.clearSelection();
    fetchContacts(1, next);
  }

  function handlePageChange(p: number) {
    setPage(p);
    fetchContacts(p);
  }

  function selectCompany(name: string) {
    const next = { ...filters, companies: [name] };
    setFilters(next);
    setPage(1);
    selection.clearSelection();
    setView("leads");
    fetchContacts(1, next);
  }

  async function handleEnrichSingle(contactId: string) {
    try {
      const result = await enrichContacts([contactId]);
      setEnrichRequestIds(result.requestIds);
      setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, enrichmentStatus: "pending" } : c)));
      showStatus("success", "Enrichment started for 1 lead");
    } catch { showStatus("error", "Failed to start enrichment"); }
  }

  async function handleRetryEnrichment(contactId: string) {
    try {
      await resetEnrichment([contactId]);
      setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, enrichmentStatus: "none", email: null, phone: null } : c)));
      showStatus("success", "Enrichment reset — you can re-enrich this lead");
    } catch { showStatus("error", "Failed to reset enrichment"); }
  }

  async function handleEnrichSelected() {
    const ids = Array.from(selection.selectedIds);
    const unenriched = contacts.filter((c) => ids.includes(c.id) && c.enrichmentStatus === "none").map((c) => c.id);
    if (unenriched.length === 0) { showStatus("error", "Selected leads are already enriched or pending"); return; }
    try {
      const result = await enrichContacts(unenriched);
      setEnrichRequestIds(result.requestIds);
      setContacts((prev) => prev.map((c) => (unenriched.includes(c.id) ? { ...c, enrichmentStatus: "pending" } : c)));
      selection.clearSelection();
      showStatus("success", `Enrichment started for ${unenriched.length} leads`);
    } catch { showStatus("error", "Failed to start enrichment"); }
  }

  async function handleDismissSelected() {
    const ids = Array.from(selection.selectedIds);
    if (ids.length === 0) return;
    try {
      await bulkUpdateContactStatus(ids, "dismissed");
      selection.clearSelection();
      showStatus("success", `${ids.length} leads dismissed`);
      await fetchContacts(page);
      await loadStats();
    } catch { showStatus("error", "Failed to dismiss leads"); }
  }

  async function handleOpenFunnelPicker() {
    if (availableFunnels.length === 0) {
      try { setAvailableFunnels(await listFunnels()); }
      catch { showStatus("error", "Failed to load campaigns"); return; }
    }
    setShowFunnelPicker((v) => !v);
  }

  async function handleSendToFunnel(funnelId: string) {
    const isAll = selection.isAllMatching;
    const ids = Array.from(selection.selectedIds);
    if (!isAll && ids.length === 0) return;
    setSendingToFunnel(true);
    setShowFunnelPicker(false);
    try {
      const result = await sendContactsToFunnel(
        funnelId,
        isAll ? { allMatching: true, filters: filterPayload() } : { contactIds: ids },
      );
      selection.clearSelection();
      showStatus("success", `${result.created} leads sent to "${result.funnelName}" (${result.skipped} already in campaign)`);
      await fetchContacts(page);
      await loadStats();
    } catch { showStatus("error", "Failed to send to campaign"); }
    finally { setSendingToFunnel(false); }
  }

  async function handleExport() {
    setExporting(true);
    try {
      let rows: ScraperContactRow[] = [];
      let p = 1;
      while (true) {
        const batch = await getContacts({ page: p, pageSize: 500, ...filterPayload() });
        if (batch.data.length === 0) break;
        rows.push(...batch.data);
        if (batch.data.length < 500) break;
        p++;
      }
      const csv = generateCSV(rows, [
        { key: "fullName", label: "Name" },
        { key: "currentTitle", label: "Title" },
        { key: "currentCompany", label: "Company" },
        { key: "location", label: "Location" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "linkedinUrl", label: "LinkedIn" },
        { key: "enrichmentStatus", label: "Enrichment" },
        { key: "status", label: "Status" },
      ]);
      downloadCSV(csv, `leads-export-${new Date().toISOString().slice(0, 10)}.csv`);
      showStatus("success", `Exported ${rows.length} leads`);
    } catch { showStatus("error", "Failed to export leads"); }
    finally { setExporting(false); }
  }

  const hasUnenrichedSelected = contacts.some((c) => selection.selectedIds.has(c.id) && c.enrichmentStatus === "none");

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-semibold text-ink">Leads</h1>
          <p className="text-[12px] text-ink-muted">Every lead and company across your organization.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-surface border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors disabled:opacity-50"
        >
          {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <StatCard icon={Users} tone="text-signal-blue-text" label="Total leads" value={stats.total} />
        <StatCard icon={Building2} tone="text-signal-slate-text" label="Companies" value={companyOptions.length} />
        <StatCard icon={CheckCircle2} tone="text-signal-green-text" label="Enriched" value={stats.enriched} />
        <StatCard icon={Mail} tone="text-signal-blue-text" label="In campaigns" value={stats.inCampaign} />
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-1 mb-3">
        {(["leads", "companies"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors capitalize",
              view === v ? "bg-ink text-on-ink" : "bg-section text-ink-secondary hover:bg-hover",
            )}
          >
            {v === "leads" ? <Users size={12} /> : <Building2 size={12} />}
            {v}
          </button>
        ))}
      </div>

      {/* Status toast */}
      {statusMessage && (
        <div className={cn(
          "mb-3 px-3 py-2 rounded-[10px] text-[12px] border",
          statusMessage.type === "success"
            ? "bg-signal-green/10 border-signal-green-text/20 text-signal-green-text"
            : "bg-signal-red/10 border-signal-red-text/20 text-signal-red-text",
        )}>
          {statusMessage.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-ink-muted" />
        </div>
      ) : view === "leads" ? (
        <>
          <LeadsFilterBar filters={filters} onChange={handleFiltersChange} companyOptions={companyOptions} />
          <LeadsTable
            contacts={contacts}
            page={page}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
            selectedIds={selection.selectedIds}
            onSelectionChange={() => {}}
            crossPageSelection={selection}
            onEnrichSingle={handleEnrichSingle}
            onRetryEnrichment={handleRetryEnrichment}
          />
        </>
      ) : (
        <CompaniesTable onSelect={selectCompany} />
      )}

      {/* Bulk action bar */}
      {selection.selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-ink text-on-ink rounded-full pl-4 pr-2 py-2 shadow-2xl">
          <span className="text-[12px] font-medium">{selection.selectedCount} selected</span>
          {selection.showSelectAllBanner && !selection.isAllMatching && (
            <button onClick={selection.selectAllMatching} className="text-[11px] text-on-ink/70 hover:text-on-ink underline">
              Select all {totalCount}
            </button>
          )}
          {selection.isAllMatching && <span className="text-[11px] text-on-ink/70">All matching</span>}
          <div className="w-px h-4 bg-on-ink/20 mx-1" />

          {hasUnenrichedSelected && (
            <button onClick={handleEnrichSelected} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-signal-green/20 text-signal-green-text text-[11px] font-medium hover:bg-signal-green/30 transition-colors">
              <Sparkles size={11} /> Enrich
            </button>
          )}

          <div className="relative" ref={funnelRef}>
            <button onClick={handleOpenFunnelPicker} disabled={sendingToFunnel} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-signal-blue/20 text-signal-blue-text text-[11px] font-medium hover:bg-signal-blue/30 transition-colors disabled:opacity-50">
              {sendingToFunnel ? <Loader2 size={11} className="animate-spin" /> : <FolderInput size={11} />}
              Send to campaign
              <ChevronDown size={11} />
            </button>
            {showFunnelPicker && (
              <div className="absolute bottom-full right-0 mb-1 w-60 max-h-64 overflow-y-auto bg-surface rounded-[10px] border border-border-default shadow-lg py-1">
                {availableFunnels.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-ink-muted">No campaigns found</div>
                ) : (
                  availableFunnels.map((f) => (
                    <button key={f.id} onClick={() => handleSendToFunnel(f.id)} className="w-full text-left px-3 py-2 hover:bg-hover transition-colors">
                      <div className="text-[11px] font-medium text-ink truncate">{f.name}</div>
                      {f.description && <div className="text-[10px] text-ink-muted truncate">{f.description}</div>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button onClick={handleDismissSelected} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-on-ink/10 text-on-ink text-[11px] font-medium hover:bg-on-ink/20 transition-colors">
            <EyeOff size={11} /> Dismiss
          </button>
          <button onClick={() => selection.clearSelection()} className="p-1.5 rounded-full text-on-ink/60 hover:text-on-ink hover:bg-on-ink/10 transition-colors">
            <XIcon size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, tone, label, value }: { icon: typeof Users; tone: string; label: string; value: number }) {
  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} strokeWidth={1.5} className={tone} />
        <span className="text-[10px] text-ink-muted">{label}</span>
      </div>
      <p className="text-[16px] font-semibold text-ink">{value.toLocaleString()}</p>
    </div>
  );
}

