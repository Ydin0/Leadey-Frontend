"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { MoreHorizontal, Phone, Mail, Linkedin, Loader2, Building2, Sparkles, Search, Bot, UserPlus, Check, Columns3, Megaphone, Trash2, UserMinus } from "lucide-react";
import { confirmDncCall } from "@/lib/utils/dnc";
import { cn } from "@/lib/utils";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useRowLimit } from "@/lib/hooks/use-row-limit";
import { advanceLead, updateLeadStatus, enrichJobPosts, saveLeadFilters } from "@/lib/api/funnels";
import { useCredits } from "@/components/providers/credits-provider";
import { FilterSideOver } from "@/components/filters/filter-side-over";
import { SmartViewBar } from "@/components/filters/smart-view-bar";
import { EMPTY_FILTER, customFieldsToFilterFields, type FilterGroup, type FilterFieldDef } from "@/lib/types/lead-filter";
import { matchesFilter } from "@/lib/utils/eval-lead-filter";
import { listCustomFields } from "@/lib/api/custom-fields";
import { getStatusDotClass, type LeadStatusOption } from "@/lib/utils/lead-status";
import { useLeadStatuses } from "@/lib/hooks/use-lead-statuses";
import { computeActivityCounts } from "@/lib/utils/lead-activity";
import { useCallContext } from "@/components/calling/call-context";
import { ConvertToOpportunityModal } from "@/components/opportunities/convert-to-opportunity-modal";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import type { FunnelLead, FunnelStep } from "@/lib/types/funnel";
import { LeadSortMenu } from "./lead-sort-menu";
import { LeadStepFilter } from "./lead-step-filter";
import { ColumnSettingsDrawer } from "./column-settings-drawer";
import { usePrefetchFunnel } from "@/lib/queries/use-prefetch";
import { useActivityCounts, useOrgActivityCounts } from "@/lib/queries/use-activity-counts";
import { useQuery, useQueries } from "@tanstack/react-query";
import { qk } from "@/lib/queries/keys";
import { usePipelinesQuery, useCallOutcomesQuery } from "@/lib/queries/use-org-config";
import { getLeadFilterInsights, getTranscriptMatches } from "@/lib/api/leads";
import {
  buildLeadColumns, resolveColumns, loadColumnPrefs, saveColumnPrefs,
  type ColumnPrefs, type LeadColumnCtx,
} from "@/lib/funnels/lead-columns";
import type { LeadSortKey } from "@/lib/utils/sort-leads";

interface FunnelLeadTableProps {
  leads: FunnelLead[];
  /** The campaign the table lives in. Absent on the org-wide Leads page,
   *  where each row carries its own `lead.funnelId` instead. */
  funnelId?: string;
  /** Campaign sequence steps — powers the "Step" filter. */
  steps?: FunnelStep[];
  /** Shared filter restored from the campaign config (persisted server-side). */
  initialFilters?: FilterGroup;
  sortBy?: LeadSortKey;
  onSortChange?: (key: LeadSortKey) => void;
  onLeadAdvanced?: () => void;
  onLeadClick?: (leadIndex: number) => void;
  /** Org-wide mode: "Create campaign" from the given lead ids (the current
   *  filtered set from the toolbar button, or the selection from the bulk bar). */
  onCreateCampaign?: (leadIds: string[]) => void;
  /** Org-wide mode: add the selected lead ids to an existing campaign. */
  onAddToCampaign?: (leadIds: string[]) => void;
  /** Campaign mode: remove the selected leads from THIS campaign only (the
   *  parent owns the confirm modal + API call). Gated on leads.delete. */
  onRemoveLeads?: (leadIds: string[]) => void;
  /** Campaign mode: permanently delete the selected leads everywhere (typed
   *  confirmation owned by the parent). Gated on leads.delete. */
  onDeleteLeads?: (leadIds: string[]) => void;
}

const PAGE_SIZE = 25;

function LeadActionMenu({
  lead,
  funnelId,
  statuses,
  onAdvanced,
}: {
  lead: FunnelLead;
  funnelId: string;
  statuses: LeadStatusOption[];
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

  // Status changes go through the status endpoint (accepts every org status
  // plus "pending") — the previous menu posted statuses to the ADVANCE
  // endpoint, which rejects them, so the actions silently did nothing.
  const handleSetStatus = useCallback(async (status: string) => {
    setLoading(true);
    try {
      await updateLeadStatus(funnelId, lead.id, status);
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
          {/* Reopen a lead the sequence (or a rep) closed — e.g. auto-"completed"
              leads users previously couldn't change back. */}
          {lead.status !== "pending" && (
            <button
              onClick={(e) => { e.stopPropagation(); void handleSetStatus("pending"); }}
              disabled={loading}
              className="w-full text-left px-3 py-1.5 text-[11px] text-ink-secondary hover:bg-hover hover:text-ink transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-ink-faint" />
              Reopen (back to Pending)
            </button>
          )}
          {statuses.filter((s) => s.key !== lead.status).map((s) => (
            <button
              key={s.key}
              onClick={(e) => { e.stopPropagation(); void handleSetStatus(s.key); }}
              disabled={loading}
              className="w-full text-left px-3 py-1.5 text-[11px] text-ink-secondary hover:bg-hover hover:text-ink transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", getStatusDotClass(s.key, statuses))} />
              Mark {s.label}
            </button>
          ))}
        </div>
      )}
      {showConvert && (
        <ConvertToOpportunityModal
          leadId={lead.id}
          defaultName={lead.company || lead.name}
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

/** Floating bottom bulk-action bar shown when ≥1 company is selected in the
 *  grouped view (mirrors the scrapers tables). "Magic Enrich" dropdown — only
 *  "Find job posts" is wired up today. */
function MagicEnrichBar({
  funnelId,
  companies,
  totalCount,
  pageFullySelected,
  allSelected,
  onSelectAll,
  onClear,
  onDone,
  onRemove,
  onDelete,
}: {
  funnelId: string;
  companies: SelectedCompany[];
  /** Total companies matching the current filters (across all pages). */
  totalCount: number;
  /** Whether every company on the current page is selected. */
  pageFullySelected: boolean;
  /** Whether every matching company (all pages) is selected. */
  allSelected: boolean;
  /** Select every matching company across all pages. */
  onSelectAll: () => void;
  onClear: () => void;
  onDone: (summary: string) => void;
  /** Remove the selected companies' leads from this campaign (parent confirms). */
  onRemove?: () => void;
  /** Permanently delete the selected companies' leads (parent typed-confirms). */
  onDelete?: () => void;
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
      const base =
        res.rolesCreated > 0
          ? `Added ${res.rolesCreated} hiring role${res.rolesCreated === 1 ? "" : "s"} across ${res.leadsEnriched} lead${res.leadsEnriched === 1 ? "" : "s"} · ${res.jobsFound} jobs found in ${res.companiesSearched} companies`
          : `No new open roles found across ${res.companiesSearched} compan${res.companiesSearched === 1 ? "y" : "ies"}`;
      // Be explicit when we only processed the first batch of a larger selection.
      const summary = res.capped
        ? `${base} · Searched ${res.companiesSearched} of ${res.companiesRequested} selected — run again to enrich the rest.`
        : base;
      onDone(summary);
    } catch (err) {
      onDone(err instanceof Error ? err.message : "Magic Enrich failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-[14px] bg-surface border border-border-default shadow-lg">
      <span className="text-[12px] font-medium text-signal-blue-text">
        {companies.length.toLocaleString()} compan{companies.length === 1 ? "y" : "ies"} selected
      </span>

      {/* Select-all-matching banner — only once the page is fully ticked, so the
          header checkbox stays a page-scoped control for finer selection. */}
      {pageFullySelected && !allSelected && totalCount > companies.length && (
        <>
          <span className="text-[10px] text-ink-faint">|</span>
          <button onClick={onSelectAll} className="text-[11px] font-medium text-signal-blue-text hover:underline">
            Select all {totalCount.toLocaleString()}
          </button>
        </>
      )}
      {allSelected && totalCount > 1 && (
        <>
          <span className="text-[10px] text-ink-faint">|</span>
          <span className="text-[11px] text-signal-blue-text">All companies</span>
        </>
      )}

      <button onClick={onClear} className="text-[11px] text-ink-muted hover:text-ink transition-colors">
        Clear
      </button>

      <div className="w-px h-5 bg-border-subtle mx-1" />

      {onRemove && (
        <button
          onClick={onRemove}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors"
        >
          <UserMinus size={12} /> Remove from campaign
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-signal-red/10 border border-signal-red-text/20 text-[11px] font-medium text-signal-red-text hover:bg-signal-red/20 transition-colors"
        >
          <Trash2 size={12} /> Delete
        </button>
      )}

      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {busy ? "Enriching…" : "Magic Enrich"}
        </button>
        {open && (
          <div className="absolute right-0 bottom-full mb-1.5 z-50 w-[260px] bg-surface rounded-[12px] border border-border-subtle shadow-lg py-1.5">
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

export function FunnelLeadTable({ leads, funnelId, steps = [], initialFilters, sortBy, onSortChange, onLeadAdvanced, onLeadClick, onCreateCampaign, onAddToCampaign, onRemoveLeads, onDeleteLeads }: FunnelLeadTableProps) {
  const prefetchFunnel = usePrefetchFunnel();
  // Close-style query builder. Restored from the campaign config (a FilterGroup);
  // a legacy/other shape falls back to empty.
  const [filterGroup, setFilterGroup] = useState<FilterGroup>(
    initialFilters && Array.isArray((initialFilters as Partial<FilterGroup>).conditions)
      ? (initialFilters as FilterGroup)
      : EMPTY_FILTER,
  );
  const [search, setSearch] = useState("");
  const [customFields, setCustomFields] = useState<FilterFieldDef[]>([]);

  // ── Configurable columns (flat lead view) — Close-style picker + persistence.
  // Org and campaign views keep separate prefs (the org table has a Campaign
  // column that would render empty inside a single campaign).
  const columnPrefsKey = funnelId ? undefined : "leadey:lead-columns:org:v1";
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [columnPrefs, setColumnPrefs] = useState<ColumnPrefs | null>(null);
  useEffect(() => { setColumnPrefs(loadColumnPrefs(columnPrefsKey)); }, [columnPrefsKey]);

  // Org custom fields → extra filterable fields in the builder.
  useEffect(() => {
    listCustomFields()
      .then((defs) => setCustomFields(customFieldsToFilterFields(defs)))
      .catch(() => {});
  }, []);

  // Persist the shared filter to the campaign config (debounced) so the filtered
  // view is the same for every rep and survives a refresh. The first render
  // (hydrating from the server value) must not trigger a save-back.
  const hydratedRef = useRef(false);
  useEffect(() => {
    // Org-wide view has no campaign config to persist to — Smart Views
    // (scope "org") cover saved filters there.
    if (!funnelId) return;
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
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [enrichToast, setEnrichToast] = useState<string | null>(null);
  const { startCall, activeCall, lastLoggedCall } = useCallContext();
  const { statuses } = useLeadStatuses();

  // When a call placed against a lead in THIS campaign has been logged, reload
  // so the call counter + step dots reflect it immediately.
  const handledLogRef = useRef<number | null>(null);
  useEffect(() => {
    if (!lastLoggedCall) return;
    // Campaign view only cares about its own campaign's calls; the org view
    // spans every campaign, so any logged call refreshes it.
    if (funnelId && lastLoggedCall.funnelId !== funnelId) return;
    if (handledLogRef.current === lastLoggedCall.at) return;
    handledLogRef.current = lastLoggedCall.at;
    onLeadAdvanced?.();
  }, [lastLoggedCall, funnelId, onLeadAdvanced]);

  // Activity counts: the DEFERRED endpoint is authoritative (the payload now
  // ships zeros so the table paints instantly); fall back to payload counts
  // (older backend) and finally to deriving from events on the full view.
  const { data: campaignCounts } = useActivityCounts(funnelId ?? "", { enabled: !!funnelId });
  const { data: orgCounts } = useOrgActivityCounts({ enabled: !funnelId });
  const deferredCounts = funnelId ? campaignCounts : orgCounts;

  // ── Derived filter data for fields the lead rows don't carry ──
  // Opportunity stage + AI call outcomes come as a sparse per-lead map;
  // transcript keywords resolve to server-matched lead-id sets. All fetched
  // only while the filter actually uses those fields.
  const usedFilterFields = useMemo(
    () => new Set(filterGroup.conditions.map((c) => c.field)),
    [filterGroup],
  );
  const needsInsights = usedFilterFields.has("oppStage") || usedFilterFields.has("callOutcome");
  const { data: filterInsights } = useQuery({
    queryKey: qk.leadFilterInsights(funnelId ?? "org"),
    queryFn: () => getLeadFilterInsights(funnelId ?? undefined),
    staleTime: 60_000,
    enabled: needsInsights,
  });
  const transcriptKeywords = useMemo(
    () => [...new Set(
      filterGroup.conditions
        .filter((c) => c.field === "transcriptKeywords" && typeof c.value === "string" && c.value.trim().length >= 2)
        .map((c) => (c.value as string).trim().toLowerCase()),
    )],
    [filterGroup],
  );
  const transcriptQueries = useQueries({
    queries: transcriptKeywords.map((kw) => ({
      queryKey: qk.transcriptMatches(funnelId ?? "org", kw),
      queryFn: () => getTranscriptMatches(kw, funnelId ?? undefined),
      staleTime: 60_000,
    })),
  });
  const transcriptSets = useMemo(() => {
    const m = new Map<string, Set<string>>();
    transcriptKeywords.forEach((kw, i) => {
      const ids = transcriptQueries[i]?.data;
      if (ids) m.set(kw, new Set(ids));
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- useQueries returns a new array each render; key on the data refs
  }, [transcriptKeywords, ...transcriptQueries.map((q) => q.data)]);
  const { data: pipelinesData } = usePipelinesQuery({ enabled: true });
  const { data: callOutcomesData } = useCallOutcomesQuery({ enabled: true });
  const activityMap = useMemo(() => {
    const map = new Map<string, { calls: number; emails: number }>();
    for (const lead of leads) {
      const deferred = deferredCounts?.[lead.id];
      if (deferred) {
        map.set(lead.id, deferred);
      } else if (lead.callCount != null || lead.emailCount != null) {
        map.set(lead.id, { calls: lead.callCount ?? 0, emails: lead.emailCount ?? 0 });
      } else {
        map.set(lead.id, computeActivityCounts(lead.events || []));
      }
    }
    return map;
  }, [leads, deferredCounts]);

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

  // Campaign options for the org all-leads "Campaign" filter — derived from the
  // loaded leads (org mode loads them all), value = funnelId, label = name.
  const campaignOptions = useMemo(() => {
    if (funnelId) return [];
    const m = new Map<string, string>();
    for (const l of leads) if (l.funnelId) m.set(l.funnelId, l.funnelName || l.funnelId);
    return [...m.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [leads, funnelId]);

  const dynamicOptions = useMemo(
    () => ({
      campaign: campaignOptions,
      // Always offer the operational statuses leads actually hold, even when
      // the org has hidden them from its display list — otherwise leads the
      // sequence moved to "completed" (or fresh "pending" leads) become
      // impossible to filter for.
      status: [
        ...(statuses.some((s) => s.key === "pending") ? [] : [{ value: "pending", label: "Pending" }]),
        ...statuses.map((s) => ({ value: s.key, label: s.label })),
        ...(statuses.some((s) => s.key === "completed") ? [] : [{ value: "completed", label: "Completed" }]),
      ],
      source: sourceOptions.map((s) => ({ value: s, label: s })),
      industry: industryOptions.map((s) => ({ value: s, label: s })),
      location: locationOptions.map((s) => ({ value: s, label: s })),
      // Opportunity stages across every pipeline (deduped by name — the
      // evaluators match case-insensitively on the stage name).
      oppStage: [...new Map(
        (pipelinesData ?? []).flatMap((p) => p.stages).map((st) => [st.label.toLowerCase(), { value: st.label, label: st.label }]),
      ).values()],
      callOutcome: (callOutcomesData ?? []).map((o) => ({ value: o.key, label: o.label })),
    }),
    [statuses, sourceOptions, industryOptions, locationOptions, campaignOptions, pipelinesData, callOutcomesData],
  );

  // Resolve a filter field key → value for a given lead (incl. derived fields).
  const getLeadValue = useCallback(
    (l: FunnelLead, key: string): unknown => {
      if (key.startsWith("custom:")) {
        const ck = key.slice("custom:".length);
        return l.customFields?.find((f) => f.key === ck)?.value ?? "";
      }
      switch (key) {
        case "callCount": return activityMap.get(l.id)?.calls ?? 0;
        case "emailCount": return activityMap.get(l.id)?.emails ?? 0;
        case "leadsInCompany": return companyLeadCounts.get((l.company || "Unknown").toLowerCase()) ?? 0;
        case "hasOpportunity": return !!l.opportunityId;
        case "oppStage": return filterInsights?.[l.id]?.oppStage ?? "";
        case "callOutcome": return filterInsights?.[l.id]?.callOutcomes ?? [];
        case "transcriptKeywords": {
          // The evaluator substring-matches — return the keywords this lead's
          // transcripts matched (server-resolved), joined.
          const hits: string[] = [];
          for (const [kw, set] of transcriptSets) if (set.has(l.id)) hits.push(kw);
          return hits.join(" \u0001 ");
        }
        default: return (l as unknown as Record<string, unknown>)[key];
      }
    },
    [activityMap, companyLeadCounts, filterInsights, transcriptSets],
  );

  // ── Column catalog + resolved (ordered/visible) state for the flat view ──
  const columnCatalog = useMemo(
    () => buildLeadColumns(customFields, { campaign: !funnelId }),
    [customFields, funnelId],
  );
  const resolvedColumns = useMemo(() => resolveColumns(columnCatalog, columnPrefs), [columnCatalog, columnPrefs]);
  const visibleColumns = useMemo(() => resolvedColumns.filter((r) => r.visible).map((r) => r.col), [resolvedColumns]);
  // The grouped (by-company) view shows only the company-applicable visible
  // columns, so a user's company column choices carry across both views.
  const companyColumns = useMemo(() => visibleColumns.filter((c) => c.companyRender), [visibleColumns]);
  const columnCtx: LeadColumnCtx = useMemo(() => ({
    statuses,
    activity: (id: string) => activityMap.get(id) ?? { calls: 0, emails: 0 },
    value: getLeadValue,
    linkified: !!onLeadClick,
  }), [statuses, activityMap, getLeadValue, onLeadClick]);

  const applyColumns = useCallback((order: string[], hidden: string[]) => {
    const prefs = { order, hidden };
    setColumnPrefs(prefs);
    saveColumnPrefs(prefs, columnPrefsKey);
  }, [columnPrefsKey]);
  const resetColumns = useCallback(() => {
    const prefs = {
      order: columnCatalog.map((c) => c.key),
      hidden: columnCatalog.filter((c) => !c.defaultVisible).map((c) => c.key),
    };
    setColumnPrefs(prefs);
    saveColumnPrefs(prefs, columnPrefsKey);
  }, [columnCatalog, columnPrefsKey]);

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

  // "Select all" is scoped to the row-limited window (`limited`), NOT every
  // company — so a row limit of e.g. 1000 selects exactly those 1000 for a
  // Magic Enrich, instead of the full 3,413.
  const limitedCompanyKeys = limited as unknown as string[];
  const allCompaniesSelected =
    limitedCompanyKeys.length > 0 && limitedCompanyKeys.every((k) => selectedCompanies.has(k));
  const selectAllMatching = useCallback(
    () => setSelectedCompanies(new Set(limited as unknown as string[])),
    [limited],
  );

  // Header checkbox is PAGE-scoped: ticking it selects only the companies shown
  // on this page (finer control). "Select all {N}" in the bottom bar then opts
  // into every matching company across all pages.
  const pageCompanyKeys = paginatedKeys as unknown as string[];
  const pageAllSelected = pageCompanyKeys.length > 0 && pageCompanyKeys.every((k) => selectedCompanies.has(k));
  const pageSomeSelected = pageCompanyKeys.some((k) => selectedCompanies.has(k));
  const headerCbRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerCbRef.current) headerCbRef.current.indeterminate = pageSomeSelected && !pageAllSelected;
  }, [pageSomeSelected, pageAllSelected]);

  function toggleSelectPageCompanies() {
    setSelectedCompanies((prev) => {
      const next = new Set(prev);
      if (pageAllSelected) pageCompanyKeys.forEach((k) => next.delete(k));
      else pageCompanyKeys.forEach((k) => next.add(k));
      return next;
    });
  }

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

  /** Warm the lead view's data on row hover so the click paints instantly. */
  function handleRowHover(lead: FunnelLead) {
    if (!onLeadClick) return;
    const fid = lead.funnelId ?? funnelId;
    if (fid) prefetchFunnel(fid, { fullLeadId: lead.id });
  }

  function handleCall(e: React.MouseEvent, lead: FunnelLead) {
    e.stopPropagation();
    if (!lead.phone) return;
    if (lead.doNotCall && !confirmDncCall(lead.name)) return;
    startCall(lead.phone, {
      contactName: lead.name || null,
      companyName: lead.company || null,
      leadId: lead.id || null,
      funnelId: lead.funnelId ?? funnelId ?? null,
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

  // Org-wide selection → lead ids, whichever view is active: grouped selection
  // is companies (expand to their leads), flat selection is lead rows.
  const selectedLeadIds = useMemo(() => {
    if (groupByCompany) {
      const ids: string[] = [];
      for (const name of selectedCompanies) {
        for (const l of companyGroups.get(name) ?? []) ids.push(l.id);
      }
      return ids;
    }
    return filtered.filter((l) => selectedIds.has(l.id)).map((l) => l.id);
  }, [groupByCompany, selectedCompanies, companyGroups, filtered, selectedIds]);
  const orgMode = !funnelId;

  return (
    <div>
      {/* Smart Views + filter builder + search */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SmartViewBar
          scope={funnelId ? "campaign" : "org"}
          funnelId={funnelId}
          current={filterGroup}
          onApply={(g) => { setFilterGroup(g); setCurrentPage(1); }}
        />
        <FilterSideOver
          value={filterGroup}
          onChange={(g) => { setFilterGroup(g); setCurrentPage(1); }}
          dynamicOptions={dynamicOptions}
          extraFields={customFields}
          excludeKeys={orgMode ? [] : ["funnelId"]}
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
          onClick={() => { setGroupByCompany(!groupByCompany); setCurrentPage(1); }}
          aria-pressed={groupByCompany}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-medium border transition-colors",
            groupByCompany
              ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/40 shadow-sm"
              : "text-ink-muted border-border-subtle hover:bg-hover"
          )}
        >
          {groupByCompany ? <Check size={12} strokeWidth={2.5} /> : <Building2 size={11} />}
          Group by company
        </button>
        <div className="ml-auto flex items-center gap-2">
          {onSortChange && sortBy && <LeadSortMenu value={sortBy} onChange={onSortChange} />}
          <button
            onClick={() => setColumnsOpen(true)}
            title="Choose which columns to show"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[11px] font-medium border border-border-subtle text-ink-secondary hover:bg-hover transition-colors"
          >
            <Columns3 size={12} strokeWidth={1.5} />
            Columns
          </button>
          {onCreateCampaign && (
            <button
              onClick={() => onCreateCampaign(filtered.map((l) => l.id))}
              disabled={filtered.length === 0}
              title="Create a new campaign containing every lead matching the current filters"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Megaphone size={12} strokeWidth={1.75} />
              Create campaign · {filtered.length.toLocaleString()}
            </button>
          )}
        </div>
      </div>

      {/* Org-wide bulk bar — create/add-to campaign from the selection */}
      {orgMode && selectedLeadIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-[14px] bg-surface border border-border-default shadow-lg">
          <span className="text-[12px] font-medium text-signal-blue-text">
            {selectedLeadIds.length.toLocaleString()} lead{selectedLeadIds.length === 1 ? "" : "s"} selected
          </span>
          <button
            onClick={() => { setSelectedCompanies(new Set()); setSelectedIds(new Set()); }}
            className="text-[11px] text-ink-muted hover:text-ink transition-colors"
          >
            Clear
          </button>
          <div className="w-px h-5 bg-border-subtle mx-1" />
          {onAddToCampaign && (
            <button
              onClick={() => onAddToCampaign(selectedLeadIds)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary border border-border-subtle text-[11px] font-medium hover:bg-hover transition-colors"
            >
              <UserPlus size={12} /> Add to campaign
            </button>
          )}
          {onCreateCampaign && (
            <button
              onClick={() => onCreateCampaign(selectedLeadIds)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 transition-opacity"
            >
              <Megaphone size={12} /> Create campaign
            </button>
          )}
          {onDeleteLeads && (
            <button
              onClick={() => onDeleteLeads(selectedLeadIds)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-signal-red/10 border border-signal-red-text/20 text-[11px] font-medium text-signal-red-text hover:bg-signal-red/20 transition-colors"
            >
              <Trash2 size={12} /> Delete
            </button>
          )}
        </div>
      )}

      {/* Magic Enrich bulk bar (grouped view, campaign-scoped) — floats at the bottom */}
      {funnelId && groupByCompany && selectedCompanyList.length > 0 && (
        <MagicEnrichBar
          funnelId={funnelId}
          companies={selectedCompanyList}
          totalCount={limitedCompanyKeys.length}
          pageFullySelected={pageAllSelected}
          allSelected={allCompaniesSelected}
          onSelectAll={selectAllMatching}
          onClear={() => setSelectedCompanies(new Set())}
          onDone={(summary) => {
            setEnrichToast(summary);
            setSelectedCompanies(new Set());
            onLeadAdvanced?.();
          }}
          onRemove={onRemoveLeads ? () => onRemoveLeads(selectedLeadIds) : undefined}
          onDelete={onDeleteLeads ? () => onDeleteLeads(selectedLeadIds) : undefined}
        />
      )}

      {/* Campaign-mode bulk bar (flat view) — remove from campaign / delete. */}
      {funnelId && !groupByCompany && selectedLeadIds.length > 0 && (onRemoveLeads || onDeleteLeads) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-[14px] bg-surface border border-border-default shadow-lg">
          <span className="text-[12px] font-medium text-signal-blue-text">
            {selectedLeadIds.length.toLocaleString()} lead{selectedLeadIds.length === 1 ? "" : "s"} selected
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-[11px] text-ink-muted hover:text-ink transition-colors"
          >
            Clear
          </button>
          <div className="w-px h-5 bg-border-subtle mx-1" />
          {onRemoveLeads && (
            <button
              onClick={() => onRemoveLeads(selectedLeadIds)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors"
            >
              <UserMinus size={12} /> Remove from campaign
            </button>
          )}
          {onDeleteLeads && (
            <button
              onClick={() => onDeleteLeads(selectedLeadIds)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-signal-red/10 border border-signal-red-text/20 text-[11px] font-medium text-signal-red-text hover:bg-signal-red/20 transition-colors"
            >
              <Trash2 size={12} /> Delete
            </button>
          )}
        </div>
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
                      ref={headerCbRef}
                      type="checkbox"
                      className="rounded"
                      checked={pageAllSelected}
                      onChange={toggleSelectPageCompanies}
                      title="Select all companies on this page"
                    />
                  </TableHead>
                  {companyColumns.map((col) => (
                    <TableHead key={col.key} style={{ width: col.width, minWidth: col.width }}>
                      <div className={cn("flex items-center", col.align === "center" ? "justify-center" : "justify-start")}>
                        {col.companyLabel ?? col.label}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(paginatedKeys as unknown as string[]).map((companyName) => {
                  const companyLeads = companyGroups.get(companyName) || [];

                  return (
                      /* Company row \u2014 opens the lead profile (a company view
                         with all its contacts) directly. */
                      <TableRow
                        key={companyName}
                        className="cursor-pointer hover:bg-hover/50"
                        onClick={() => companyLeads[0] && handleRowClick(companyLeads[0])}
                        onMouseEnter={() => companyLeads[0] && handleRowHover(companyLeads[0])}
                      >
                        <TableCell className="w-9 px-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={selectedCompanies.has(companyName)}
                            onChange={() => toggleSelectCompany(companyName)}
                          />
                        </TableCell>
                        {companyColumns.map((col) => (
                          <TableCell key={col.key} style={{ width: col.width, minWidth: col.width }}>
                            <div className={cn("flex items-center min-w-0", col.align === "center" ? "justify-center" : "justify-start")}>
                              {col.companyRender!(companyLeads, columnCtx)}
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        ) : (
          /* ── Flat View (ungrouped) — configurable columns ── */
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border-subtle bg-section/50 hover:bg-section/50">
                <TableHead className="w-8 px-3">
                  <input type="checkbox" className="rounded" checked={allSelected} onChange={toggleSelectAll} />
                </TableHead>
                {visibleColumns.map((col) => (
                  <TableHead key={col.key} style={{ width: col.width, minWidth: col.width }}>
                    <div className={cn("flex items-center", col.align === "center" ? "justify-center" : "justify-start")}>
                      {col.label}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-[120px]">
                  <div className="flex items-center justify-center">Actions</div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((lead) => {
                return (
                  <TableRow
                    key={lead.id}
                    className={cn("group", onLeadClick && "cursor-pointer hover:bg-hover")}
                    onClick={() => handleRowClick(lead)}
                    onMouseEnter={() => handleRowHover(lead)}
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

                    {visibleColumns.map((col) => (
                      <TableCell key={col.key} style={{ width: col.width, minWidth: col.width }}>
                        <div className={cn("flex items-center min-w-0", col.align === "center" ? "justify-center" : "justify-start")}>
                          {col.render(lead, columnCtx)}
                        </div>
                      </TableCell>
                    ))}

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
                        <LeadActionMenu lead={lead} funnelId={(lead.funnelId ?? funnelId)!} statuses={statuses} onAdvanced={onLeadAdvanced} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
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

      {/* Column settings drawer (Close-style) */}
      <ColumnSettingsDrawer
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        resolved={resolvedColumns}
        onChange={applyColumns}
        onReset={resetColumns}
      />
    </div>
  );
}
