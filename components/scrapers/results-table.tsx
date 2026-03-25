"use client";

import { useMemo, useCallback } from "react";
import { ExternalLink, MapPin, Wifi } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { CompanyCell } from "./company-cell";
import { HiringTeamPopover } from "./hiring-team-popover";
import type { SearchResultRow } from "@/lib/types/scraper";
import type { useCrossPageSelection } from "@/lib/hooks/use-cross-page-selection";

interface ResultsTableProps {
  rows: SearchResultRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  crossPageSelection?: ReturnType<typeof useCrossPageSelection>;
}

const scoreColor = (score: number) =>
  score >= 80 ? "bg-signal-green text-signal-green-text"
    : score >= 65 ? "bg-signal-blue text-signal-blue-text"
    : "bg-signal-slate text-signal-slate-text";

const enrichmentBadge: Record<string, string> = {
  none: "bg-section text-ink-faint",
  pending: "bg-signal-blue/30 text-signal-blue-text",
  enriched: "bg-signal-green text-signal-green-text",
  failed: "bg-signal-red/30 text-signal-red-text",
};

function formatSalary(row: SearchResultRow): string {
  if (row.salary) return row.salary;
  if (row.minSalaryUsd || row.maxSalaryUsd) {
    const min = row.minSalaryUsd ? `$${(row.minSalaryUsd / 1000).toFixed(0)}k` : "";
    const max = row.maxSalaryUsd ? `$${(row.maxSalaryUsd / 1000).toFixed(0)}k` : "";
    return min && max ? `${min} - ${max}` : min || max;
  }
  return "--";
}

export function ResultsTable({
  rows,
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
  selectedIds,
  onSelectionChange,
  crossPageSelection,
}: ResultsTableProps) {
  const pageIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allSelected = crossPageSelection
    ? crossPageSelection.isAllMatching || crossPageSelection.isPageFullySelected(pageIds)
    : rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someSelected = crossPageSelection
    ? crossPageSelection.isSomePageSelected(pageIds)
    : rows.some((r) => selectedIds.has(r.id)) && !allSelected;

  const toggleSelectAll = useCallback(() => {
    if (crossPageSelection) {
      crossPageSelection.togglePageAll(pageIds);
    } else {
      if (allSelected) {
        onSelectionChange(new Set());
      } else {
        onSelectionChange(new Set(rows.map((r) => r.id)));
      }
    }
  }, [crossPageSelection, pageIds, allSelected, rows, onSelectionChange]);

  const toggleSelect = useCallback((id: string) => {
    if (crossPageSelection) {
      crossPageSelection.toggleItem(id);
    } else {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectionChange(next);
    }
  }, [crossPageSelection, selectedIds, onSelectionChange]);

  const isSelected = useCallback((id: string) => {
    if (crossPageSelection?.isAllMatching) return true;
    return selectedIds.has(id);
  }, [crossPageSelection?.isAllMatching, selectedIds]);

  return (
    <div>
      <div className="bg-surface rounded-[14px] border border-border-subtle overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleSelectAll}
                  className="rounded border-border-subtle"
                />
              </TableHead>
              <TableHead className="min-w-[200px]">Company</TableHead>
              <TableHead className="min-w-[180px]">Job Title</TableHead>
              <TableHead className="min-w-[80px]">Hiring Team</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead className="w-20">Posted</TableHead>
              <TableHead className="w-16">Score</TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-[12px] text-ink-muted">
                  No results yet. Run this search to discover job postings.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(isSelected(row.id) && "bg-signal-blue/5")}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={isSelected(row.id)}
                      onChange={(e) => { e.stopPropagation(); toggleSelect(row.id); }}
                      className="rounded border-border-subtle"
                    />
                  </TableCell>
                  <TableCell>
                    <CompanyCell
                      name={row.company}
                      domain={row.companyDomain}
                      industry={row.companyIndustry}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="text-[12px] font-medium text-ink">{row.jobTitle}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        {row.seniority && (
                          <span className="text-[10px] font-medium rounded-full px-1.5 py-0 bg-section text-ink-muted">
                            {row.seniority}
                          </span>
                        )}
                        {row.employmentStatus && (
                          <span className="text-[10px] text-ink-faint">
                            {row.employmentStatus.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <HiringTeamPopover team={row.hiringTeam || []} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {row.location ? (
                        <>
                          <MapPin size={10} className="text-ink-faint flex-shrink-0" />
                          <span className="text-[11px] text-ink-secondary truncate max-w-[120px]">{row.location}</span>
                        </>
                      ) : (
                        <span className="text-[10px] text-ink-faint">--</span>
                      )}
                      {row.isRemote && (
                        <span className="text-[10px] font-medium rounded-full px-1.5 py-0 bg-signal-blue/20 text-signal-blue-text ml-1">
                          <Wifi size={8} className="inline mr-0.5" />Remote
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[11px] text-ink-secondary">{formatSalary(row)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[11px] text-ink-muted">
                      {row.postedAt ? formatRelativeTime(row.postedAt) : "--"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", scoreColor(row.score))}>
                      {row.score}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "text-[10px] font-medium rounded-full px-2 py-0.5",
                      enrichmentBadge[row.enrichmentStatus] || enrichmentBadge.none
                    )}>
                      {row.enrichmentStatus === "none" ? "new" : row.enrichmentStatus}
                    </span>
                  </TableCell>
                  <TableCell>
                    {row.jobUrl && (
                      <a
                        href={row.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-hover/50 text-ink-faint hover:text-ink-muted transition-colors"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-3">
          <DataTablePagination
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalCount}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </div>
  );
}
