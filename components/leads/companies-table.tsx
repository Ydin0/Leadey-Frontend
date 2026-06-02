"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Building2, Loader2, X as XIcon, Linkedin } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { SortableHeader } from "@/components/ui/sortable-header";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { NativeSelect } from "@/components/ui/native-select";
import { getCompaniesList, type CompanyListRow } from "@/lib/api/companies";

const PAGE_SIZE = 25;

const SIZE_BUCKETS: { value: string; label: string; min: number; max: number }[] = [
  { value: "1-50", label: "1–50", min: 1, max: 50 },
  { value: "51-200", label: "51–200", min: 51, max: 200 },
  { value: "201-1000", label: "201–1,000", min: 201, max: 1000 },
  { value: "1001+", label: "1,001+", min: 1001, max: Infinity },
];

type SortField = "name" | "industry" | "employeeCount" | "fundingStage" | "leadCount" | "inCampaignCount";

export function CompaniesTable({ onSelect }: { onSelect: (name: string) => void }) {
  const [rows, setRows] = useState<CompanyListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");
  const [funding, setFunding] = useState("");
  const [size, setSize] = useState("");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("leadCount");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCompaniesList()
      .then((d) => !cancelled && setRows(d))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const industries = useMemo(
    () => Array.from(new Set(rows.map((r) => r.industry).filter(Boolean))).sort() as string[],
    [rows],
  );
  const fundingStages = useMemo(
    () => Array.from(new Set(rows.map((r) => r.fundingStage).filter(Boolean))).sort() as string[],
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const bucket = SIZE_BUCKETS.find((b) => b.value === size);
    let out = rows.filter((r) => {
      if (q && !(`${r.name} ${r.domain ?? ""}`.toLowerCase().includes(q))) return false;
      if (industry && r.industry !== industry) return false;
      if (funding && r.fundingStage !== funding) return false;
      if (bucket) {
        const n = r.employeeCount ?? -1;
        if (n < bucket.min || n > bucket.max) return false;
      }
      return true;
    });
    out = [...out].sort((a, b) => {
      let av: string | number = "", bv: string | number = "";
      switch (sortField) {
        case "name": av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break;
        case "industry": av = (a.industry ?? "").toLowerCase(); bv = (b.industry ?? "").toLowerCase(); break;
        case "fundingStage": av = (a.fundingStage ?? "").toLowerCase(); bv = (b.fundingStage ?? "").toLowerCase(); break;
        case "employeeCount": av = a.employeeCount ?? 0; bv = b.employeeCount ?? 0; break;
        case "inCampaignCount": av = a.inCampaignCount; bv = b.inCampaignCount; break;
        default: av = a.leadCount; bv = b.leadCount;
      }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return out;
  }, [rows, search, industry, funding, size, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(field: string) {
    if (field === sortField) setSortAsc((v) => !v);
    else { setSortField(field as SortField); setSortAsc(false); }
  }
  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setPage(1); };
  }

  const hasFilters = !!(search || industry || funding || size);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-2 bg-section border border-border-subtle rounded-full px-3 py-1.5 w-[260px]">
          <Search size={13} className="text-ink-muted shrink-0" />
          <input
            value={search}
            onChange={(e) => resetPage(setSearch)(e.target.value)}
            placeholder="Search companies…"
            className="bg-transparent text-[12px] text-ink outline-none w-full placeholder:text-ink-faint"
          />
        </div>
        <NativeSelect value={industry} onChange={(e) => resetPage(setIndustry)(e.target.value)} className="w-auto min-w-[140px]">
          <option value="">All industries</option>
          {industries.map((i) => <option key={i} value={i}>{i}</option>)}
        </NativeSelect>
        <NativeSelect value={funding} onChange={(e) => resetPage(setFunding)(e.target.value)} className="w-auto min-w-[130px]">
          <option value="">All funding</option>
          {fundingStages.map((f) => <option key={f} value={f}>{f}</option>)}
        </NativeSelect>
        <NativeSelect value={size} onChange={(e) => resetPage(setSize)(e.target.value)} className="w-auto min-w-[120px]">
          <option value="">Any size</option>
          {SIZE_BUCKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
        </NativeSelect>
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setIndustry(""); setFunding(""); setSize(""); setPage(1); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium text-ink-muted hover:bg-hover transition-colors"
          >
            <XIcon size={12} /> Clear
          </button>
        )}
        <span className="text-[11px] text-ink-faint ml-auto">{filtered.length.toLocaleString()} companies</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-ink-muted" />
        </div>
      ) : (
        <div className="bg-surface rounded-[14px] border border-border-subtle overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[260px]"><SortableHeader label="Company" field="name" currentField={sortField} ascending={sortAsc} onSort={handleSort} /></TableHead>
                <TableHead className="w-[170px]"><SortableHeader label="Industry" field="industry" currentField={sortField} ascending={sortAsc} onSort={handleSort} /></TableHead>
                <TableHead className="w-[110px]"><SortableHeader label="Employees" field="employeeCount" currentField={sortField} ascending={sortAsc} onSort={handleSort} /></TableHead>
                <TableHead className="w-[150px]">Location</TableHead>
                <TableHead className="w-[120px]"><SortableHeader label="Funding" field="fundingStage" currentField={sortField} ascending={sortAsc} onSort={handleSort} /></TableHead>
                <TableHead className="w-[90px] text-right"><SortableHeader label="Leads" field="leadCount" currentField={sortField} ascending={sortAsc} onSort={handleSort} className="justify-end" /></TableHead>
                <TableHead className="w-[110px] text-right"><SortableHeader label="In campaign" field="inCampaignCount" currentField={sortField} ascending={sortAsc} onSort={handleSort} className="justify-end" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((c) => (
                <TableRow
                  key={c.name}
                  onClick={() => onSelect(c.name)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-[7px] bg-section flex items-center justify-center overflow-hidden shrink-0">
                        {c.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.logo} alt="" width={28} height={28} className="object-cover w-7 h-7" />
                        ) : (
                          <Building2 size={13} className="text-ink-secondary" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-ink truncate">{c.name}</p>
                        {c.domain && <p className="text-[10px] text-ink-muted truncate">{c.domain}</p>}
                      </div>
                      {c.linkedinUrl && (
                        <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-linkedin shrink-0">
                          <Linkedin size={12} />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-[11px] text-ink-secondary">{c.industry || <span className="text-ink-faint">—</span>}</TableCell>
                  <TableCell className="text-[11px] text-ink-secondary tabular-nums">{c.employeeCount ? c.employeeCount.toLocaleString() : <span className="text-ink-faint">—</span>}</TableCell>
                  <TableCell className="text-[11px] text-ink-secondary truncate">{[c.city, c.country].filter(Boolean).join(", ") || <span className="text-ink-faint">—</span>}</TableCell>
                  <TableCell>
                    {c.fundingStage ? (
                      <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-section text-ink-muted">{c.fundingStage}</span>
                    ) : <span className="text-ink-faint text-[11px]">—</span>}
                  </TableCell>
                  <TableCell className="text-right text-[12px] font-medium text-ink tabular-nums">{c.leadCount}</TableCell>
                  <TableCell className="text-right">
                    <span className={cn("text-[12px] tabular-nums", c.inCampaignCount > 0 ? "text-signal-green-text font-medium" : "text-ink-faint")}>
                      {c.inCampaignCount}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-10 text-center text-[12px] text-ink-muted">
                    {rows.length === 0 ? "No companies yet — discovered companies appear here." : "No companies match these filters."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <DataTablePagination
            currentPage={page}
            totalPages={totalPages}
            pageSize={PAGE_SIZE}
            totalItems={filtered.length}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
