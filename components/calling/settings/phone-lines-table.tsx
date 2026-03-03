"use client";

import { useState, useMemo } from "react";
import { Phone } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { PhoneLineStatusBadge } from "@/components/calling/shared/phone-line-status-badge";
import { mockCountryOptions } from "@/lib/mock-data/calling";
import type { PhoneLine } from "@/lib/types/calling";
import type { PhoneLineFilterState } from "./phone-line-filters";

const PAGE_SIZE = 10;

interface PhoneLinesTableProps {
  lines: PhoneLine[];
  filters: PhoneLineFilterState;
  onSelectLine: (line: PhoneLine) => void;
  onProvision: () => void;
}

export function PhoneLinesTable({ lines, filters, onSelectLine, onProvision }: PhoneLinesTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return lines.filter((line) => {
      if (filters.status !== "all" && line.status !== filters.status) return false;
      if (filters.country !== "all" && line.countryCode !== filters.country) return false;
      if (filters.assignment === "assigned" && !line.assignedTo) return false;
      if (filters.assignment === "unassigned" && line.assignedTo) return false;
      return true;
    });
  }, [lines, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((l) => l.id)));
    }
  }

  const typeBadge: Record<string, string> = {
    local: "bg-signal-slate text-signal-slate-text",
    "toll-free": "bg-signal-blue text-signal-blue-text",
    mobile: "bg-signal-green text-signal-green-text",
  };

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={Phone}
        title="No Phone Lines"
        description="Provision your first number to start making calls from within Leadey."
        actionLabel="Provision Number"
        onAction={onProvision}
      />
    );
  }

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle overflow-hidden">
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-2 bg-signal-blue/20 border-b border-border-subtle flex items-center gap-3">
          <span className="text-[11px] text-ink-secondary">{selectedIds.size} selected</span>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1 rounded-[16px] bg-signal-red text-signal-red-text text-[11px] font-medium hover:bg-signal-red/80 transition-colors"
          >
            Suspend Selected
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1 rounded-[16px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
          >
            Release Selected
          </button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <input
                type="checkbox"
                checked={paginated.length > 0 && selectedIds.size === paginated.length}
                onChange={toggleAll}
                className="rounded"
              />
            </TableHead>
            <TableHead>Number</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Monthly Cost</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map((line) => {
            const countryOption = mockCountryOptions.find((c) => c.code === line.countryCode);
            return (
              <TableRow
                key={line.id}
                className="cursor-pointer"
                onClick={() => onSelectLine(line)}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(line.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelect(line.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded"
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-[12px] font-medium text-ink">{line.number}</p>
                    <p className="text-[11px] text-ink-muted">{line.friendlyName}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-[12px] text-ink">
                    {countryOption?.flag ?? ""} {line.countryCode}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", typeBadge[line.type] ?? "")}>
                    {line.type}
                  </span>
                </TableCell>
                <TableCell>
                  <PhoneLineStatusBadge status={line.status} />
                </TableCell>
                <TableCell>
                  <span className="text-[12px] text-ink">
                    {line.assignedToName || <span className="text-ink-faint">Unassigned</span>}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-[12px] text-ink">${line.monthlyCost.toFixed(2)}</span>
                </TableCell>
                <TableCell>
                  <span className="text-[11px] text-ink-muted">{formatRelativeTime(line.createdAt)}</span>
                </TableCell>
              </TableRow>
            );
          })}
          {paginated.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                <p className="text-[12px] text-ink-muted">No lines match the current filters.</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        totalItems={filtered.length}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
