"use client";

import { useState, useMemo, Fragment } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { CompanyFilters } from "./company-filters";
import { CompanyRowExpanded } from "./company-row-expanded";
import { EnrichmentStatusDot } from "@/components/icps/enrichment/enrichment-status-dot";
import type { ICPCompany } from "@/lib/types/company";
import type { EnrichedLead } from "@/lib/types/lead";
import type { OrgChartPreview } from "@/lib/types/company";
import type { SignalType } from "@/lib/types/icp";
import type { EnrichmentStatus } from "@/lib/types/company";

interface CompanyTableProps {
  companies: ICPCompany[];
  leads: EnrichedLead[];
  orgCharts: OrgChartPreview[];
}

type SortField = "name" | "employeeCount" | "relevanceScore" | "leadsEnriched";

const PAGE_SIZE = 10;

function CompanyLogo({ domain, name }: { domain: string; name: string }) {
  const [imgError, setImgError] = useState(false);
  const initials = name.slice(0, 2).toUpperCase();

  if (imgError) {
    return (
      <div className="w-6 h-6 rounded-full bg-signal-blue flex items-center justify-center flex-shrink-0">
        <span className="text-[9px] font-bold text-signal-blue-text">{initials}</span>
      </div>
    );
  }

  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={name}
      width={24}
      height={24}
      className="w-6 h-6 rounded-full flex-shrink-0 object-contain"
      onError={() => setImgError(true)}
    />
  );
}

export function CompanyTable({ companies, leads, orgCharts }: CompanyTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeSignals, setActiveSignals] = useState<SignalType[]>([]);
  const [enrichmentFilter, setEnrichmentFilter] = useState<EnrichmentStatus | null>(null);
  const [sortField, setSortField] = useState<SortField>("relevanceScore");
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  function toggleSignal(type: SignalType) {
    setActiveSignals((prev) =>
      prev.includes(type) ? prev.filter((s) => s !== type) : [...prev, type]
    );
  }

  const filtered = useMemo(() => {
    let result = companies;
    if (activeSignals.length > 0) {
      result = result.filter((c) => c.signals.some((s) => activeSignals.includes(s.type)));
    }
    if (enrichmentFilter) {
      result = result.filter((c) => c.enrichmentStatus === enrichmentFilter);
    }
    result = [...result].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === "string" && typeof bv === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return result;
  }, [companies, activeSignals, enrichmentFilter, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedPage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((paginatedPage - 1) * PAGE_SIZE, paginatedPage * PAGE_SIZE);

  function handleSort(field: SortField) {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
    setCurrentPage(1);
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
    const allSelected = filtered.every((c) => selectedIds.has(c.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  }

  function getScoreColor(score: number) {
    if (score >= 90) return "bg-signal-green text-signal-green-text";
    if (score >= 80) return "bg-signal-blue text-signal-blue-text";
    return "bg-signal-slate text-signal-slate-text";
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortAsc ? <ChevronUp size={10} className="inline ml-0.5" /> : <ChevronDown size={10} className="inline ml-0.5" />;
  };

  const allSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));

  return (
    <div>
      {/* Filters */}
      <div className="mb-4">
        <CompanyFilters
          activeSignals={activeSignals}
          onToggleSignal={toggleSignal}
          enrichmentFilter={enrichmentFilter}
          onSetEnrichment={setEnrichmentFilter}
        />
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-signal-blue/30 rounded-[10px]">
          <span className="text-[11px] font-medium text-ink">{selectedIds.size} selected</span>
          <button className="px-3 py-1 rounded-[16px] bg-ink text-on-ink text-[10px] font-medium">
            Enrich Selected
          </button>
          <button className="px-3 py-1 rounded-[16px] bg-section text-ink-secondary text-[10px] font-medium">
            Export Selected
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface rounded-[14px] border border-border-subtle overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border-subtle bg-section/50 hover:bg-section/50">
              <TableHead className="w-8 px-3">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="text-left cursor-pointer" onClick={() => handleSort("name")}>
                Company <SortIcon field="name" />
              </TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => handleSort("employeeCount")}>
                Employees <SortIcon field="employeeCount" />
              </TableHead>
              <TableHead className="text-center">Signals</TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => handleSort("leadsEnriched")}>
                Leads <SortIcon field="leadsEnriched" />
              </TableHead>
              <TableHead className="text-center cursor-pointer" onClick={() => handleSort("relevanceScore")}>
                Relevance <SortIcon field="relevanceScore" />
              </TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((company) => {
              const isExpanded = expandedId === company.id;
              const companyLeads = leads.filter((l) => l.companyId === company.id);
              const orgChart = orgCharts.find((o) => o.companyId === company.id) || null;

              return (
                <Fragment key={company.id}>
                  <TableRow
                    className={cn(
                      "cursor-pointer",
                      isExpanded && "bg-hover/20"
                    )}
                    onClick={() => { setExpandedId(isExpanded ? null : company.id); setShowSelector(false); }}
                  >
                    <TableCell className="w-8 px-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(company.id)}
                        onChange={(e) => { e.stopPropagation(); toggleSelect(company.id); }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CompanyLogo domain={company.domain} name={company.name} />
                        <span className="text-[12px] font-medium text-ink">{company.name}</span>
                        <span className="text-[10px] text-ink-faint">{company.domain}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-ink-secondary">{company.employeeCount.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-[10px] font-medium bg-section text-ink-muted rounded-full px-1.5 py-0.5">{company.signals.length}</span>
                    </TableCell>
                    <TableCell className="text-right text-ink-secondary">
                      {company.leadsEnriched}/{company.leadsTotal}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn("text-[10px] font-medium rounded-full px-1.5 py-0.5", getScoreColor(company.relevanceScore))}>
                        {company.relevanceScore}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <EnrichmentStatusDot
                          status={company.enrichmentStatus}
                          count={company.enrichmentStatus === "partial" ? `${company.leadsEnriched}/${company.leadsTotal}` : undefined}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={7} className="p-0">
                        <CompanyRowExpanded
                          company={company}
                          leads={companyLeads}
                          orgChart={orgChart}
                          showSelector={showSelector}
                          onToggleSelector={() => setShowSelector(!showSelector)}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
        <DataTablePagination
          currentPage={paginatedPage}
          totalPages={totalPages}
          pageSize={PAGE_SIZE}
          totalItems={filtered.length}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
