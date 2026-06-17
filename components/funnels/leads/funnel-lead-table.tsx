"use client";

import { useState, useMemo, useRef, useEffect, useCallback, Fragment } from "react";
import { MoreHorizontal, Phone, Mail, Linkedin, Loader2, Building2, ChevronRight, Users, Ban, Sparkles, Search, Bot, UserPlus, Check } from "lucide-react";
import { confirmDncCall } from "@/lib/utils/dnc";
import { cn } from "@/lib/utils";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useRowLimit } from "@/lib/hooks/use-row-limit";
import { advanceLead, enrichJobPosts, saveLeadFilters } from "@/lib/api/funnels";
import { useCredits } from "@/components/providers/credits-provider";
import { CompanyAvatar } from "@/components/funnels/focus/company-avatar";
import { FilterBuilder } from "@/components/filters/filter-builder";
import { SmartViewBar } from "@/components/filters/smart-view-bar";
import { EMPTY_FILTER, type FilterGroup } from "@/lib/types/lead-filter";
import { matchesFilter } from "@/lib/utils/eval-lead-filter";
import {
  getStatusDotClass,
  getStatusLabel,
  isTerminalStatus,
} from "@/lib/utils/lead-status";
import { useLeadStatuses } from "@/lib/hooks/use-lead-statuses";
import { computeActivityCounts } from "@/lib/utils/lead-activity";
import { useCallContext } from "@/components/calling/call-context";
import { ConvertToOpportunityModal } from "@/components/opportunities/convert-to-opportunity-modal";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import type { FunnelLead, FunnelStep } from "@/lib/types/funnel";
import { LeadSortMenu } from "./lead-sort-menu";
import { LeadStepFilter } from "./lead-step-filter";
import type { LeadSortKey } from "@/lib/utils/sort-leads";

interface FunnelLeadTableProps {
  leads: FunnelLead[];
  funnelId: string;
  /** Campaign sequence steps — powers the "Step" filter. */
  steps?: FunnelStep[];
  /** Shared filter restored from the campaign config (persisted server-side). */
  initialFilters?: FilterGroup;
  sortBy?: LeadSortKey;
  onSortChange?: (key: LeadSortKey) => void;
  onLeadAdvanced?: () => void;
  onLeadClick?: (leadIndex: number) => void;
}

const PAGE_SIZE = 25;

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            i < current ? "bg-signal-blue-text" : "bg-section"
          )}
        />
      ))}
      <span className="text-[10px] text-ink-muted ml-1">{current}/{total}</span>
    </div>
  );
}

const actionOptions: { outcome: string; label: string }[] = [
  { outcome: "contacted", label: "Mark Contacted" },
  { outcome: "no_answer", label: "Mark No Answer" },
  { outcome: "interested", label: "Mark Interested" },
  { outcome: "bounced", label: "Mark Bounced" },
];

function LeadActionMenu({
  lead,
  funnelId,
  onAdvanced,
}: {
  lead: FunnelLead;
  funnelId: string;
  onAdvanced?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleAdvance = useCallback(async (outcome: string) => {
    setLoading(true);
    try {
      await advanceLead(funnelId, lead.id, outcome);
      onAdvanced?.();
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }, [funnelId, lead.id, onAdvanced]);

  // Already converted? Show a quick link to the opp instead of the menu.
  if (lead.opportunityId) {
    return (
      <Link
        href={`/dashboard/opportunities/${lead.opportunityId}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-signal-blue/15 text-signal-blue-text text-[10px] font-medium hover:opacity-90"
        title="Open linked opportunity"
      >
        <Briefcase size={10} /> Opp
      </Link>
    );
  }

  if (isTerminalStatus(lead.status)) {
    return <span className="text-[10px] text-ink-faint">&mdash;</span>;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        disabled={loading}
        className="p-1 rounded-md hover:bg-section transition-colors text-ink-muted hover:text-ink disabled:opacity-50"
      >
        <MoreHorizontal size={14} strokeWidth={1.5} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-surface rounded-[10px] border border-border-subtle shadow-lg py-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              setShowConvert(true);
            }}
            className="w-full text-left px-3 py-1.5 text-[11px] font-medium text-signal-blue-text hover:bg-hover transition-colors flex items-center gap-1.5"
          >
            <Briefcase size={11} /> Convert to Opportunity
          </button>
          <div className="my-1 border-t border-border-subtle" />
          {actionOptions.map((opt) => (
            <button
              key={opt.outcome}
              onClick={(e) => { e.stopPropagation(); void handleAdvance(opt.outcome); }}
              disabled={loading}
              className="w-full text-left px-3 py-1.5 text-[11px] text-ink-secondary hover:bg-hover hover:text-ink transition-colors disabled:opacity-50"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      {showConvert && (
        <ConvertToOpportunityModal
          leadId={lead.id}
          defaultName={`${lead.company || lead.name} — Opportunity`}
          onClose={() => setShowConvert(false)}
          onConverted={() => onAdvanced?.()}
        />
      )}
    </div>
  );
}

interface SelectedCompany {
  name: string;
  domain?: string | null;
  linkedinUrl?: string | null;
}

/** Bulk action bar shown when ≥1 company is selected in the grouped view.
 *  "Magic Enrich" dropdown — only "Find job posts" is wired up today. */
function MagicEnrichBar({
  funnelId,
  companies,
  onClear,
  onDone,
}: {
  funnelId: string;
  companies: SelectedCompany[];
  onClear: () => void;
  onDone: (summary: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { refresh: refreshCredits } = useCredits();

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function findJobPosts() {
    setOpen(false);
    setBusy(true);
    try {
      const res = await enrichJobPosts(funnelId, companies);
      refreshCredits(); // job scraping spent credits — update the header pill
      const summary =
        res.rolesCreated > 0
          ? `Added ${res.rolesCreated} hiring role${res.rolesCreated === 1 ? "" : "s"} across ${res.leadsEnriched} lead${res.leadsEnriched === 1 ? "" : "s"} · ${res.jobsFound} jobs found in ${res.companiesSearched} companies`
          : `No new open roles found across ${res.companiesSearched} compan${res.companiesSearched === 1 ? "y" : "ies"}`;
      onDone(summary);
    } catch (err) {
      onDone(err instanceof Error ? err.message : "Magic Enrich failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 mb-3 px-3 py-2 rounded-[10px] bg-signal-blue/10 border border-signal-blue-text/20">
      <span className="text-[12px] font-medium text-ink">
        {companies.length} compan{companies.length === 1 ? "y" : "ies"} selected
      </span>
      <button onClick={onClear} className="text-[11px] text-ink-muted hover:text-ink transition-colors">
        Clear
      </button>
      <div className="ml-auto relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {busy ? "Enriching…" : "Magic Enrich"}
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1.5 z-50 w-[260px] bg-surface rounded-[12px] border border-border-subtle shadow-lg py-1.5">
            <button
              onClick={() => void findJobPosts()}
              className="w-full text-left px-3 py-2 hover:bg-hover transition-colors flex items-start gap-2.5"
            >
              <Search size={14} className="text-signal-blue-text mt-0.5 shrink-0" />
              <span>
                <span className="block text-[12px] font-medium text-ink">Find job posts</span>
                <span className="block text-[10.5px] text-ink-muted leading-snug">
                  Search if these companies are hiring and add the roles to each lead.
                </span>
              </span>
            </button>
            <div className="my-1 border-t border-border-subtle" />
            <div className="w-full text-left px-3 py-2 flex items-start gap-2.5 opacity-50 cursor-not-allowed">
              <Bot size={14} className="text-ink-muted mt-0.5 shrink-0" />
              <span>
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
                  Enrich company data
                  <span className="text-[9px] font-medium rounded-full px-1.5 py-px bg-section text-ink-muted">Soon</span>
                </span>
                <span className="block text-[10.5px] text-ink-muted leading-snug">AI-enrich firmographics & insights.</span>
              </span>
            </div>
            <div className="w-full text-left px-3 py-2 flex items-start gap-2.5 opacity-50 cursor-not-allowed">
              <UserPlus size={14} className="text-ink-muted mt-0.5 shrink-0" />
              <span>
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
                  Find more contacts
                  <span className="text-[9px] font-medium rounded-full px-1.5 py-px bg-section text-ink-muted">Soon</span>
                </span>
                <span className="block text-[10.5px] text-ink-muted leading-snug">Discover additional people at these companies.</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function FunnelLeadTable({ leads, funnelId, steps = [], initialFilters, sortBy, onSortChange, onLeadAdvanced, onLeadClick }: FunnelLeadTableProps) {
  // Close-style query builder. Restored from the campaign config (a FilterGroup);
  // a legacy/other shape falls back to empty.
  const [filterGroup, setFilterGroup] = useState<FilterGroup>(
    initialFilters && Array.isArray((initialFilters as Partial<FilterGroup>).conditions)
      ? (initialFilters as FilterGroup)
      : EMPTY_FILTER,
  );
  const [search, setSearch] = useState("");

  // Persist the shared filter to the campaign config (debounced) so the filtered
  // view is the same for every rep and survives a refresh. The first render
  // (hydrating from the server value) must not trigger a save-back.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!hydratedRef.current) { hydratedRef.current = true; return; }
    const t = setTimeout(() => {
      void saveLeadFilters(funnelId, filterGroup as unknown as Record<string, unknown>).catch((err) =>
        console.error("Failed to save lead filters:", err),
      );
    }, 600);
    return () => clearTimeout(t);
  }, [filterGroup, funnelId]);
  const [stepFilter, setStepFilter] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [groupByCompany, setGroupByCompany] = useState(true);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [enrichToast, setEnrichToast] = useState<string | null>(null);
  const { startCall, activeCall, lastLoggedCall } = useCallContext();
  const { statuses } = useLeadStatuses();

  // When a call placed against a lead in THIS campaign has been logged, reload
  // so the call counter + step dots reflect it immediately.
  const handledLogRef = useRef<number | null>(null);
  useEffect(() => {
    if (!lastLoggedCall || lastLoggedCall.funnelId !== funnelId) return;
    if (handledLogRef.current === lastLoggedCall.at) return;
    handledLogRef.current = lastLoggedCall.at;
    onLeadAdvanced?.();
  }, [lastLoggedCall, funnelId, onLeadAdvanced]);

  // Activity counts: prefer the server-computed totals (present even in the
  // lite leads payload, which omits per-lead events); fall back to deriving them
  // from events on the full lead view.
  const activityMap = useMemo(() => {
    const map = new Map<string, { calls: number; emails: number }>();
    for (const lead of leads) {
      if (lead.callCount != null || lead.emailCount != null) {
        map.set(lead.id, { calls: lead.callCount ?? 0, emails: lead.emailCount ?? 0 });
      } else {
        map.set(lead.id, computeActivityCounts(lead.events || []));
      }
    }
    return map;
  }, [leads]);

  // Enum option lists for the filter builder (status comes from useLeadStatuses).
  const sourceOptions = useMemo(() => [...new Set(leads.map((l) => l.source).filter(Boolean))].sort(), [leads]);
  const industryOptions = useMemo(() => [...new Set(leads.map((l) => l.companyIndustry).filter(Boolean) as string[])].sort(), [leads]);
  const locationOptions = useMemo(() => [...new Set(leads.map((l) => l.companyLocation).filter(Boolean) as string[])].sort(), [leads]);

  // How many leads sit at each company — powers the "Leads in company" field.
  const companyLeadCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of leads) {
      const key = (l.company || "Unknown").toLowerCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [leads]);

  const dynamicOptions = useMemo(
    () => ({
      status: statuses.map((s) => ({ value: s.key, label: s.label })),
      source: sourceOptions.map((s) => ({ value: s, label: s })),
      industry: industryOptions.map((s) => ({ value: s, label: s })),
      location: locationOptions.map((s) => ({ value: s, label: s })),
    }),
    [statuses, sourceOptions, industryOptions, locationOptions],
  );

  // Resolve a filter field key → value for a given lead (incl. derived fields).
  const getLeadValue = useCallback(
    (l: FunnelLead, key: string): unknown => {
      switch (key) {
        case "callCount": return activityMap.get(l.id)?.calls ?? 0;
        case "emailCount": return activityMap.get(l.id)?.emails ?? 0;
        case "leadsInCompany": return companyLeadCounts.get((l.company || "Unknown").toLowerCase()) ?? 0;
        default: return (l as unknown as Record<string, unknown>)[key];
      }
    },
    [activityMap, companyLeadCounts],
  );

  // Apply the query-builder filter + free-text search + sequence-step filter.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (stepFilter !== null && (l.currentStep || 1) !== stepFilter) return false;
      if (q && !(
        l.name.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q) ||
        (l.email || "").toLowerCase().includes(q) ||
        (l.title || "").toLowerCase().includes(q)
      )) return false;
      return matchesFilter(filterGroup, (key) => getLeadValue(l, key));
    });
  }, [leads, filterGroup, search, stepFilter, getLeadValue]);

  // Group leads by company
  const companyGroups = useMemo(() => {
    const groups = new Map<string, FunnelLead[]>();
    for (const lead of filtered) {
      const key = lead.company || "Unknown";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(lead);
    }
    return groups;
  }, [filtered]);

  // Resolve {name, domain, linkedinUrl} for a company group (for Magic Enrich).
  const companyMeta = useCallback((companyName: string): SelectedCompany => {
    const group = companyGroups.get(companyName) || [];
    const domain = group.reduce<string | undefined>((found, l) => {
      if (found) return found;
      if (l.companyDomain) return l.companyDomain;
      const emailDomain = l.email?.split("@")[1];
      if (emailDomain && !["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"].includes(emailDomain)) return emailDomain;
      return undefined;
    }, undefined);
    const linkedinUrl = group.find((l) => l.companyLinkedin)?.companyLinkedin;
    return { name: companyName, domain: domain || null, linkedinUrl: linkedinUrl || null };
  }, [companyGroups]);

  function toggleSelectCompany(name: string) {
    setSelectedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const allCompanyKeys = useMemo(() => [...companyGroups.keys()], [companyGroups]);
  const allCompaniesSelected = allCompanyKeys.length > 0 && allCompanyKeys.every((k) => selectedCompanies.has(k));

  function toggleSelectAllCompanies() {
    if (allCompaniesSelected) setSelectedCompanies(new Set());
    else setSelectedCompanies(new Set(allCompanyKeys));
  }

  const selectedCompanyList = useMemo(
    () => [...selectedCompanies].filter((n) => companyGroups.has(n)).map((n) => companyMeta(n)),
    [selectedCompanies, companyGroups, companyMeta],
  );

  const resetPage = useCallback(() => setCurrentPage(1), []);
  const displayItems = groupByCompany ? [...companyGroups.keys()] : filtered;
  const { limited, startingRow, rowLimit, unfilteredTotal, handleRowLimitChange } = useRowLimit(
    groupByCompany ? [...companyGroups.keys()] as any[] : filtered,
    resetPage,
  );

  const totalPages = Math.max(1, Math.ceil(limited.length / pageSize));
  const paginatedPage = Math.min(currentPage, totalPages);
  const paginatedKeys = limited.slice((paginatedPage - 1) * pageSize, paginatedPage * pageSize);
  const paginated = groupByCompany ? [] as FunnelLead[] : paginatedKeys as unknown as FunnelLead[];

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const allSelected = filtered.every((l) => selectedIds.has(l.id));
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((l) => l.id)));
  }

  function handleRowClick(lead: FunnelLead) {
    if (!onLeadClick) return;
    const absoluteIndex = leads.findIndex((l) => l.id === lead.id);
    if (absoluteIndex !== -1) onLeadClick(absoluteIndex);
  }

  function handleCall(e: React.MouseEvent, lead: FunnelLead) {
    e.stopPropagation();
    if (!lead.phone) return;
    if (lead.doNotCall && !confirmDncCall(lead.name)) return;
    startCall(lead.phone, {
      contactName: lead.name || null,
      companyName: lead.company || null,
      leadId: lead.id || null,
      funnelId,
    });
  }

  function handleEmail(e: React.MouseEvent, email: string) {
    e.stopPropagation();
    window.open(`mailto:${email}`);
  }

  function normalizeLinkedInUrl(url: string): string {
    if (url.startsWith("http")) return url;
    // Raw LinkedIn member ID — prefix with full URL
    return `https://www.linkedin.com/in/${url}`;
  }

  function handleLinkedIn(e: React.MouseEvent, url: string) {
    e.stopPropagation();
    window.open(normalizeLinkedInUrl(url), "_blank");
  }

  const allSelected = filtered.length > 0 && filtered.every((l) => selectedIds.has(l.id));

  return (
    <div>
      {/* Smart Views + filter builder + search */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SmartViewBar
          scope="campaign"
          funnelId={funnelId}
          current={filterGroup}
          onApply={(g) => { setFilterGroup(g); setCurrentPage(1); }}
        />
        <FilterBuilder
          value={filterGroup}
          onChange={(g) => { setFilterGroup(g); setCurrentPage(1); }}
          dynamicOptions={dynamicOptions}
        />
        <div className="relative ml-auto">
          <Search size={13} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search leads..."
            className="pl-8 pr-3 py-1.5 rounded-full bg-section border border-border-subtle text-[11px] text-ink placeholder:text-ink-faint w-48 focus:outline-none focus:border-border-default"
          />
        </div>
      </div>

      {/* Count + step filter + group toggle + sort */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-[12px] font-medium text-ink">
          {filtered.length} leads
          {groupByCompany && <span className="text-ink-muted"> in {companyGroups.size} companies</span>}
        </span>
        <LeadStepFilter
          steps={steps}
          value={stepFilter}
          onChange={(s) => { setStepFilter(s); setCurrentPage(1); }}
        />
        <button
          onClick={() => { setGroupByCompany(!groupByCompany); setExpandedCompanies(new Set()); setCurrentPage(1); }}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-medium border transition-colors",
            groupByCompany
              ? "bg-signal-blue/10 text-signal-blue-text border-signal-blue-text/20"
              : "text-ink-muted border-border-subtle hover:bg-hover"
          )}
        >
          <Building2 size={11} />
          Group by company
        </button>
        {onSortChange && sortBy && (
          <div className="ml-auto">
            <LeadSortMenu value={sortBy} onChange={onSortChange} />
          </div>
        )}
      </div>

      {/* Magic Enrich bulk bar (grouped view) */}
      {groupByCompany && selectedCompanyList.length > 0 && (
        <MagicEnrichBar
          funnelId={funnelId}
          companies={selectedCompanyList}
          onClear={() => setSelectedCompanies(new Set())}
          onDone={(summary) => {
            setEnrichToast(summary);
            setSelectedCompanies(new Set());
            onLeadAdvanced?.();
          }}
        />
      )}

      {/* Enrich result toast */}
      {enrichToast && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-[10px] bg-signal-green/10 border border-signal-green-text/20">
          <Check size={13} className="text-signal-green-text shrink-0" />
          <span className="text-[11.5px] text-ink-secondary flex-1">{enrichToast}</span>
          <button onClick={() => setEnrichToast(null)} className="text-[11px] text-ink-muted hover:text-ink transition-colors">
            Dismiss
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface rounded-[14px] border border-border-subtle overflow-hidden">
        {groupByCompany ? (
          /* ── Grouped by Company View ── */
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border-subtle bg-section/50 hover:bg-section/50">
                  <TableHead className="w-9 px-3">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={allCompaniesSelected}
                      onChange={toggleSelectAllCompanies}
                      title="Select all companies"
                    />
                  </TableHead>
                  <TableHead className="w-7" />
                  <TableHead className="text-left w-[220px]">Company</TableHead>
                  <TableHead className="text-left w-[130px]">Status</TableHead>
                  <TableHead className="text-left w-[150px]">Industry</TableHead>
                  <TableHead className="text-center w-[90px]">Employees</TableHead>
                  <TableHead className="text-left w-[150px]">Location</TableHead>
                  <TableHead className="text-center w-[80px]">Contacts</TableHead>
                  <TableHead className="text-center w-[100px]">Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(paginatedKeys as unknown as string[]).map((companyName) => {
                  const companyLeads = companyGroups.get(companyName) || [];
                  const isExpanded = expandedCompanies.has(companyName);
                  const firstLead = companyLeads[0];

                  // Find best domain from leads
                  const domain = companyLeads.reduce<string | undefined>((found, l) => {
                    if (found) return found;
                    if (l.companyDomain) return l.companyDomain;
                    const emailDomain = l.email?.split("@")[1];
                    if (emailDomain && !["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"].includes(emailDomain)) return emailDomain;
                    return undefined;
                  }, undefined);

                  // Aggregate company-level data from first lead that has it
                  const industry = companyLeads.find((l) => l.companyIndustry)?.companyIndustry;
                  const employeeCount = companyLeads.find((l) => l.companyEmployeeCount)?.companyEmployeeCount;
                  const location = companyLeads.find((l) => l.companyLocation)?.companyLocation;

                  // Aggregate activity across all company leads
                  const totalCalls = companyLeads.reduce((sum, l) => sum + (activityMap.get(l.id)?.calls ?? 0), 0);
                  const totalEmails = companyLeads.reduce((sum, l) => sum + (activityMap.get(l.id)?.emails ?? 0), 0);

                  // Status is company-level (synced across contacts). Prefer a
                  // meaningful status over "new"/"pending" if any contact differs.
                  const companyStatus =
                    companyLeads.find((l) => l.status !== "new" && l.status !== "pending")?.status ||
                    firstLead?.status || "new";

                  return (
                    <Fragment key={companyName}>
                      {/* Company row */}
                      <TableRow
                        className="cursor-pointer hover:bg-hover/50"
                        onClick={() => {
                          setExpandedCompanies((prev) => {
                            const next = new Set(prev);
                            if (next.has(companyName)) next.delete(companyName);
                            else next.add(companyName);
                            return next;
                          });
                        }}
                      >
                        <TableCell className="w-9 px-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={selectedCompanies.has(companyName)}
                            onChange={() => toggleSelectCompany(companyName)}
                          />
                        </TableCell>
                        <TableCell className="w-7 px-0">
                          <ChevronRight size={14} className={cn("text-ink-muted transition-transform", isExpanded && "rotate-90")} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <CompanyAvatar name={companyName} size="md" domain={domain} />
                            <div>
                              <span className="text-[12px] font-medium text-ink">{companyName}</span>
                              {domain && <div className="text-[10px] text-ink-faint">{domain}</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusDotClass(companyStatus, statuses))} />
                            <span className="text-[11px] text-ink-secondary truncate">{getStatusLabel(companyStatus, statuses)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-[11px] text-ink-secondary">{industry || "\u2013"}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-[11px] text-ink-secondary">
                            {employeeCount ? employeeCount.toLocaleString() : "\u2013"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-[11px] text-ink-muted">{location || "\u2013"}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users size={11} className="text-ink-faint" />
                            <span className="text-[11px] text-ink-secondary">{companyLeads.length}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex items-center gap-0.5">
                              <Phone size={10} strokeWidth={1.5} className={cn(totalCalls > 0 ? "text-ink-secondary" : "text-ink-faint")} />
                              <span className={cn("text-[10px]", totalCalls > 0 ? "text-ink-secondary" : "text-ink-faint")}>{totalCalls}</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <Mail size={10} strokeWidth={1.5} className={cn(totalEmails > 0 ? "text-ink-secondary" : "text-ink-faint")} />
                              <span className={cn("text-[10px]", totalEmails > 0 ? "text-ink-secondary" : "text-ink-faint")}>{totalEmails}</span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded contacts */}
                      {isExpanded && companyLeads.map((lead) => {
                        const activity = activityMap.get(lead.id) || { calls: 0, emails: 0 };
                        const isOverdue = lead.nextDate.getTime() < Date.now() && !isTerminalStatus(lead.status);

                        return (
                          <TableRow
                            key={lead.id}
                            className={cn("bg-section/20", onLeadClick && "cursor-pointer hover:bg-hover/50")}
                            onClick={() => handleRowClick(lead)}
                          >
                            {/* Lead detail rendered as one clean strip — it isn't
                                column-aligned to the company's Industry/Employees/
                                Location headers (those describe the company row). */}
                            <TableCell colSpan={9} className="py-2">
                              <div className="flex items-center gap-3 pl-[60px] pr-2">
                                {/* Name + title — red when Do-Not-Contact. Status
                                    is company-level so it isn't repeated here. */}
                                <div className="flex-1 min-w-0">
                                  <span className={cn("text-[12px] font-medium inline-flex items-center gap-1.5", lead.doNotCall ? "text-signal-red-text" : "text-ink")}>
                                    {lead.name}
                                    {lead.doNotCall && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-signal-red/10 text-signal-red-text text-[9px] font-semibold uppercase tracking-wide">
                                        <Ban size={9} strokeWidth={2} /> DNC
                                      </span>
                                    )}
                                  </span>
                                  <div className="text-[10px] text-ink-muted truncate">{lead.title}</div>
                                </div>

                                {/* Step progress */}
                                <div className="w-[64px] shrink-0 flex justify-center">
                                  <ProgressDots current={lead.currentStep} total={lead.totalSteps} />
                                </div>

                                {/* Touch counts — how many times called / emailed */}
                                <div className="flex items-center gap-2.5 w-[78px] shrink-0">
                                  <span className="flex items-center gap-1 text-[11px] text-ink-muted tabular-nums" title={`${activity.calls} calls logged`}>
                                    <Phone size={11} strokeWidth={1.5} /> {activity.calls}
                                  </span>
                                  <span className="flex items-center gap-1 text-[11px] text-ink-muted tabular-nums" title={`${activity.emails} emails sent`}>
                                    <Mail size={11} strokeWidth={1.5} /> {activity.emails}
                                  </span>
                                </div>

                                {/* Next due */}
                                <div className="w-[100px] shrink-0">
                                  <span className={cn("text-[11px]", isOverdue ? "text-signal-red-text" : "text-ink-muted")}>
                                    {lead.nextDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                    {isOverdue ? " overdue" : ""}
                                  </span>
                                </div>

                                {/* Quick actions */}
                                <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={(e) => lead.phone ? handleCall(e, lead) : e.stopPropagation()} disabled={!lead.phone || !!activeCall} title="Call"
                                    className={cn("p-1 rounded-md transition-colors", lead.phone ? "text-signal-green-text hover:bg-signal-green/10" : "text-ink-faint cursor-not-allowed")}>
                                    <Phone size={12} strokeWidth={1.5} />
                                  </button>
                                  <button onClick={(e) => lead.email ? handleEmail(e, lead.email) : e.stopPropagation()} disabled={!lead.email} title="Email"
                                    className={cn("p-1 rounded-md transition-colors", lead.email ? "text-signal-blue-text hover:bg-signal-blue/10" : "text-ink-faint cursor-not-allowed")}>
                                    <Mail size={12} strokeWidth={1.5} />
                                  </button>
                                  {lead.linkedinUrl && (
                                    <button onClick={(e) => handleLinkedIn(e, lead.linkedinUrl!)} title="LinkedIn" className="p-1 rounded-md text-[#0A66C2] hover:bg-[#0A66C2]/10 transition-colors">
                                      <Linkedin size={12} strokeWidth={1.5} />
                                    </button>
                                  )}
                                  <LeadActionMenu lead={lead} funnelId={funnelId} onAdvanced={onLeadAdvanced} />
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </>
        ) : (
          /* ── Flat View (ungrouped) ── */
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border-subtle bg-section/50 hover:bg-section/50">
                <TableHead className="w-8 px-3">
                  <input type="checkbox" className="rounded" checked={allSelected} onChange={toggleSelectAll} />
                </TableHead>
                <TableHead className="text-left w-[240px]">Name</TableHead>
                <TableHead className="text-center w-[110px]">Status</TableHead>
                <TableHead className="text-center w-[80px]">Step</TableHead>
                <TableHead className="text-center w-[110px]">Activity</TableHead>
                <TableHead className="text-left w-[160px]">Next Due</TableHead>
                <TableHead className="text-left w-[100px]">Source</TableHead>
                <TableHead className="text-center w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((lead) => {
                const activity = activityMap.get(lead.id) || { calls: 0, emails: 0 };
                const isOverdue =
                  lead.nextDate.getTime() < Date.now() &&
                  !isTerminalStatus(lead.status);

                return (
                  <TableRow
                    key={lead.id}
                    className={cn("group", onLeadClick && "cursor-pointer hover:bg-hover")}
                    onClick={() => handleRowClick(lead)}
                  >
                    <TableCell className="w-8 px-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded"
                      />
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <CompanyAvatar name={lead.company} size="md" domain={lead.companyDomain || lead.email?.split("@")[1]} />
                        <div>
                          <span className={cn("text-[12px] font-medium", onLeadClick ? "text-signal-blue-text" : "text-ink")}>
                            {lead.company}
                          </span>
                          <div className="text-[10px] text-ink-muted">
                            <span className={cn("inline-flex items-center gap-1", lead.doNotCall && "text-signal-red-text font-medium")}>
                              {lead.doNotCall && <Ban size={9} strokeWidth={2} />}{lead.name}
                            </span> &middot; {lead.title}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className={cn("w-1.5 h-1.5 rounded-full", getStatusDotClass(lead.status, statuses))} />
                        <span className="text-[11px] text-ink-secondary">{getStatusLabel(lead.status, statuses)}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <ProgressDots current={lead.currentStep} total={lead.totalSteps} />
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex items-center gap-1">
                          <Phone size={11} strokeWidth={1.5} className={cn(activity.calls > 0 ? "text-ink-secondary" : "text-ink-faint")} />
                          <span className={cn("text-[11px]", activity.calls > 0 ? "text-ink-secondary" : "text-ink-faint")}>{activity.calls}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail size={11} strokeWidth={1.5} className={cn(activity.emails > 0 ? "text-ink-secondary" : "text-ink-faint")} />
                          <span className={cn("text-[11px]", activity.emails > 0 ? "text-ink-secondary" : "text-ink-faint")}>{activity.emails}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div>
                        <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-section text-ink-secondary">
                          {lead.nextAction}
                        </span>
                        <div className={cn("text-[11px] mt-0.5", isOverdue ? "text-signal-red-text" : "text-ink-muted")}>
                          {lead.nextDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          {isOverdue ? " \u00b7 overdue" : ""}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-[10px] text-ink-muted">{lead.source}</span>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          onClick={(e) => lead.phone ? handleCall(e, lead) : e.stopPropagation()}
                          disabled={!lead.phone || !!activeCall}
                          className={cn("p-1.5 rounded-md transition-colors", lead.phone ? "text-signal-green-text hover:bg-signal-green/10" : "text-ink-faint cursor-not-allowed")}
                        >
                          <Phone size={13} strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={(e) => lead.email ? handleEmail(e, lead.email) : e.stopPropagation()}
                          disabled={!lead.email}
                          className={cn("p-1.5 rounded-md transition-colors", lead.email ? "text-signal-blue-text hover:bg-signal-blue/10" : "text-ink-faint cursor-not-allowed")}
                        >
                          <Mail size={13} strokeWidth={1.5} />
                        </button>
                        {lead.linkedinUrl && (
                          <button
                            onClick={(e) => handleLinkedIn(e, lead.linkedinUrl!)}
                            className="p-1.5 rounded-md text-[#0A66C2] hover:bg-[#0A66C2]/10 transition-colors"
                          >
                            <Linkedin size={13} strokeWidth={1.5} />
                          </button>
                        )}
                        <LeadActionMenu lead={lead} funnelId={funnelId} onAdvanced={onLeadAdvanced} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {filtered.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-[12px] text-ink-muted">No leads match your filters</p>
          </div>
        )}
        {filtered.length > 0 && (
          <DataTablePagination
            currentPage={paginatedPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={limited.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            startingRow={startingRow}
            rowLimit={rowLimit}
            unfilteredTotal={unfilteredTotal}
            onRowLimitChange={handleRowLimitChange}
          />
        )}
      </div>
    </div>
  );
}
