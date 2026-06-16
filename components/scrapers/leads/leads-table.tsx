"use client";

import Link from "next/link";
import { ExternalLink, Sparkles, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { EnrichmentBadge } from "./enrichment-badge";
import type { ScraperContactRow } from "@/lib/types/contact";
import type { useCrossPageSelection } from "@/lib/hooks/use-cross-page-selection";

interface LeadsTableProps {
  contacts: ScraperContactRow[];
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  crossPageSelection?: ReturnType<typeof useCrossPageSelection>;
  onEnrichSingle: (contactId: string) => void;
  onRetryEnrichment?: (contactId: string) => void;
  startingRow?: number;
  rowLimit?: number | null;
  unfilteredTotal?: number;
  onRowLimitChange?: (startingRow: number, rowLimit: number | null) => void;
}

export function LeadsTable({
  contacts,
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  selectedIds,
  onSelectionChange,
  crossPageSelection,
  onEnrichSingle,
  onRetryEnrichment,
  startingRow = 0,
  rowLimit = null,
  unfilteredTotal,
  onRowLimitChange,
}: LeadsTableProps) {
  const pageIds = contacts.map((c) => c.id);
  const allSelected = crossPageSelection
    ? crossPageSelection.isAllMatching || crossPageSelection.isPageFullySelected(pageIds)
    : contacts.length > 0 && contacts.every((c) => selectedIds.has(c.id));
  const someSelected = crossPageSelection
    ? crossPageSelection.isSomePageSelected(pageIds)
    : contacts.some((c) => selectedIds.has(c.id)) && !allSelected;

  function toggleSelectAll() {
    if (crossPageSelection) {
      crossPageSelection.togglePageAll(pageIds);
    } else {
      if (allSelected) {
        onSelectionChange(new Set());
      } else {
        onSelectionChange(new Set(contacts.map((c) => c.id)));
      }
    }
  }

  function toggleSelect(id: string) {
    if (crossPageSelection) {
      crossPageSelection.toggleItem(id);
    } else {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectionChange(next);
    }
  }

  function isSelected(id: string) {
    if (crossPageSelection?.isAllMatching) return true;
    return selectedIds.has(id);
  }

  return (
    <div>
      <div className="bg-surface border border-border-subtle rounded-[14px] overflow-hidden">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleSelectAll}
                  className="rounded accent-accent"
                />
              </TableHead>
              <TableHead className="w-[22%]">Name</TableHead>
              <TableHead className="w-[16%]">Title</TableHead>
              <TableHead className="w-[14%]">Company</TableHead>
              <TableHead className="w-[14%]">Location</TableHead>
              <TableHead className="w-[16%]">Email</TableHead>
              <TableHead className="w-[10%]">Phone</TableHead>
              <TableHead className="w-[8%]">Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow
                key={contact.id}
                data-state={isSelected(contact.id) ? "selected" : undefined}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    checked={isSelected(contact.id)}
                    onChange={() => toggleSelect(contact.id)}
                    className="rounded accent-accent"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    {contact.profileImageUrl ? (
                      <img
                        src={contact.profileImageUrl}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-section flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-medium text-ink-muted">
                          {(contact.firstName?.[0] || "") + (contact.lastName?.[0] || "")}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/contacts/${contact.id}`}
                        className="text-[12px] font-medium text-ink truncate block hover:text-accent hover:underline"
                      >
                        {contact.fullName || `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Unknown"}
                      </Link>
                      {contact.headline && (
                        <p className="text-[10px] text-ink-muted truncate max-w-[180px]">
                          {contact.headline}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="overflow-hidden">
                  <span className="text-[11px] text-ink-secondary block truncate">
                    {contact.currentTitle || "-"}
                  </span>
                </TableCell>
                <TableCell className="overflow-hidden">
                  <span className="text-[11px] text-ink-secondary block truncate">
                    {contact.currentCompany || contact.companyName || "-"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-[11px] text-ink-muted truncate">
                    {contact.location || "-"}
                  </span>
                </TableCell>
                <TableCell className="overflow-hidden">
                  {contact.email ? (
                    <div className="truncate">
                      <span className="text-[11px] text-ink-secondary">{contact.email}</span>
                      {contact.emailStatus && contact.emailStatus !== "verified" && (
                        <span className="ml-1 text-[9px] text-ink-muted">({contact.emailStatus})</span>
                      )}
                    </div>
                  ) : contact.enrichmentStatus === "none" ? (
                    <button
                      onClick={() => onEnrichSingle(contact.id)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-signal-green/10 text-signal-green-text hover:bg-signal-green/20 transition-colors"
                    >
                      <Sparkles size={9} />
                      Enrich
                    </button>
                  ) : (
                    <span className="text-[11px] text-ink-muted">-</span>
                  )}
                </TableCell>
                <TableCell className="overflow-hidden">
                  {contact.phone ? (
                    <span className="text-[11px] text-ink-secondary truncate block">{contact.phone}</span>
                  ) : (
                    <span className="text-[11px] text-ink-muted">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <EnrichmentBadge status={contact.enrichmentStatus} />
                    {contact.enrichmentStatus === "failed" && onRetryEnrichment && (
                      <button
                        onClick={() => onRetryEnrichment(contact.id)}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium text-signal-blue-text hover:bg-signal-blue/10 transition-colors"
                        title="Retry enrichment"
                      >
                        <RotateCcw size={9} />
                        Retry
                      </button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {contact.linkedinUrl && (
                    <a
                      href={contact.linkedinUrl.startsWith("http") ? contact.linkedinUrl : `https://www.linkedin.com/in/${contact.linkedinUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink-muted hover:text-ink transition-colors"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-3">
          <DataTablePagination
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={onPageChange}
            startingRow={startingRow}
            rowLimit={rowLimit}
            unfilteredTotal={unfilteredTotal}
            onRowLimitChange={onRowLimitChange}
          />
        </div>
      )}
    </div>
  );
}
