"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import type { FunnelLead, FunnelLeadStatus } from "@/lib/types/funnel";

interface FunnelLeadTableProps {
  leads: FunnelLead[];
}

const PAGE_SIZE = 10;

type FilterKey = "all" | "sent" | "opened" | "replied" | "bounced" | "completed";

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sent", label: "Active" },
  { key: "opened", label: "Opened" },
  { key: "replied", label: "Replied" },
  { key: "bounced", label: "Bounced" },
  { key: "completed", label: "Completed" },
];

const statusDot: Record<FunnelLeadStatus, string> = {
  pending: "bg-ink-faint",
  sent: "bg-signal-blue-text",
  opened: "bg-signal-blue-text",
  clicked: "bg-signal-blue-text",
  replied: "bg-signal-green-text",
  bounced: "bg-signal-red-text",
  completed: "bg-signal-green-text",
};

const statusLabel: Record<FunnelLeadStatus, string> = {
  pending: "Pending",
  sent: "Sent",
  opened: "Opened",
  clicked: "Clicked",
  replied: "Replied",
  bounced: "Bounced",
  completed: "Completed",
};

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

export function FunnelLeadTable({ leads }: FunnelLeadTableProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    let result = leads;
    if (activeFilter !== "all") {
      if (activeFilter === "sent") {
        result = result.filter((l) => ["sent", "opened", "clicked", "pending"].includes(l.status));
      } else {
        result = result.filter((l) => l.status === activeFilter);
      }
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.company.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q)
      );
    }

    const statusPriority: Record<FunnelLeadStatus, number> = {
      pending: 0,
      sent: 1,
      opened: 2,
      clicked: 3,
      replied: 4,
      bounced: 5,
      completed: 6,
    };

    return [...result].sort((a, b) => {
      const byStatus = statusPriority[a.status] - statusPriority[b.status];
      if (byStatus !== 0) return byStatus;
      return a.nextDate.getTime() - b.nextDate.getTime();
    });
  }, [leads, activeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedPage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((paginatedPage - 1) * PAGE_SIZE, paginatedPage * PAGE_SIZE);

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

  const allSelected = filtered.length > 0 && filtered.every((l) => selectedIds.has(l.id));

  return (
    <div>
      {/* Filters + Search */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => { setActiveFilter(f.key); setCurrentPage(1); }}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-medium transition-colors",
                activeFilter === f.key
                  ? "bg-ink text-on-ink"
                  : "bg-section text-ink-muted hover:text-ink-secondary"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
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

      {/* Table */}
      <div className="bg-surface rounded-[14px] border border-border-subtle overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border-subtle bg-section/50 hover:bg-section/50">
              <TableHead className="w-8 px-3">
                <input type="checkbox" className="rounded" checked={allSelected} onChange={toggleSelectAll} />
              </TableHead>
              <TableHead className="text-left">Lead</TableHead>
              <TableHead className="text-left">Email</TableHead>
              <TableHead className="text-center">Step</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-left">Next Action</TableHead>
              <TableHead className="text-left">Due</TableHead>
              <TableHead className="text-left">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="w-8 px-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(lead.id)}
                    onChange={() => toggleSelect(lead.id)}
                    className="rounded"
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <div className="text-[12px] font-medium text-ink">{lead.name}</div>
                    <div className="text-[10px] text-ink-muted">{lead.title} at {lead.company}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-[11px] text-ink-secondary">{lead.email}</span>
                </TableCell>
                <TableCell className="text-center">
                  <ProgressDots current={lead.currentStep} total={lead.totalSteps} />
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", statusDot[lead.status])} />
                    <span className="text-[11px] text-ink-secondary">{statusLabel[lead.status]}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-section text-ink-secondary">
                    {lead.nextAction}
                  </span>
                </TableCell>
                <TableCell>
                  {(() => {
                    const isOverdue =
                      lead.nextDate.getTime() < Date.now() &&
                      ["pending", "sent", "opened", "clicked"].includes(lead.status);

                    return (
                      <span className={cn("text-[11px]", isOverdue ? "text-signal-red-text" : "text-ink-muted")}>
                        {lead.nextDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        {isOverdue ? " · overdue" : ""}
                      </span>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  <span className="text-[10px] text-ink-muted">{lead.source}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-[12px] text-ink-muted">No leads match your filters</p>
          </div>
        )}
        {filtered.length > 0 && (
          <DataTablePagination
            currentPage={paginatedPage}
            totalPages={totalPages}
            pageSize={PAGE_SIZE}
            totalItems={filtered.length}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}
