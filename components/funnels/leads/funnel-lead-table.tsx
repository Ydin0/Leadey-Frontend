"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Search, MoreHorizontal, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { advanceLead } from "@/lib/api/funnels";
import { CompanyAvatar } from "@/components/funnels/focus/company-avatar";
import { focusDataMap } from "@/lib/mock-data/funnel-focus";
import { statusDot, statusLabel, TERMINAL_STATUSES } from "@/lib/utils/lead-status";
import type { FunnelLead } from "@/lib/types/funnel";
import type { LeadStatus } from "@/lib/types/funnel-focus";

interface FunnelLeadTableProps {
  leads: FunnelLead[];
  funnelId: string;
  onLeadAdvanced?: () => void;
  onLeadClick?: (leadIndex: number) => void;
}

const PAGE_SIZE = 10;

type FilterKey = "all" | "active" | "no_answer" | "interested" | "dnc" | "completed";

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "no_answer", label: "No Answer" },
  { key: "interested", label: "Interested" },
  { key: "dnc", label: "DNC" },
  { key: "completed", label: "Completed" },
];


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
      // silently fail — user can retry
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }, [funnelId, lead.id, onAdvanced]);

  if (TERMINAL_STATUSES.has(lead.status)) {
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
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] bg-surface rounded-[10px] border border-border-subtle shadow-lg py-1">
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
    </div>
  );
}

export function FunnelLeadTable({ leads, funnelId, onLeadAdvanced, onLeadClick }: FunnelLeadTableProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    let result = leads;
    if (activeFilter !== "all") {
      if (activeFilter === "active") {
        result = result.filter((l) => ["new", "contacted", "callback"].includes(l.status));
      } else if (activeFilter === "no_answer") {
        result = result.filter((l) => l.status === "no_answer");
      } else if (activeFilter === "interested") {
        result = result.filter((l) => ["interested", "qualified"].includes(l.status));
      } else if (activeFilter === "dnc") {
        result = result.filter((l) => ["dnc", "not_interested", "competitor"].includes(l.status));
      } else if (activeFilter === "completed") {
        result = result.filter((l) => l.status === "completed");
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

    const statusPriority: Record<LeadStatus, number> = {
      new: 0,
      contacted: 1,
      no_answer: 2,
      callback: 3,
      interested: 4,
      not_interested: 5,
      other_contact: 6,
      competitor: 7,
      dnc: 8,
      qualified: 9,
      bounced: 10,
      completed: 11,
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

  function handleRowClick(lead: FunnelLead) {
    if (!onLeadClick) return;
    const absoluteIndex = leads.findIndex((l) => l.id === lead.id);
    if (absoluteIndex !== -1) onLeadClick(absoluteIndex);
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
              <TableHead className="text-left">Name</TableHead>
              <TableHead className="text-left">Contacts</TableHead>
              <TableHead className="text-center">Step</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-left">Next Action</TableHead>
              <TableHead className="text-left">Due</TableHead>
              <TableHead className="text-left">Source</TableHead>
              <TableHead className="w-12 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((lead) => {
              const focusData = focusDataMap[lead.id];
              const contactCount = focusData?.contacts.length ?? 0;
              const primaryContact = focusData?.contacts.find((c) => c.isPrimary);

              return (
                <TableRow
                  key={lead.id}
                  className={cn(onLeadClick && "cursor-pointer hover:bg-hover")}
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
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[12px] font-medium",
                            onLeadClick ? "text-signal-blue-text" : "text-ink"
                          )}>
                            {lead.company}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {lead.phone && (
                              <Phone size={12} strokeWidth={1.5} className="text-ink-faint hover:text-ink" />
                            )}
                            <Mail size={12} strokeWidth={1.5} className="text-ink-faint hover:text-ink" />
                          </div>
                        </div>
                        <div className="text-[10px] text-ink-muted">{lead.name} &middot; {lead.title}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-[11px] text-ink-secondary">
                      {primaryContact?.name ?? lead.name}
                      {contactCount > 1 && (
                        <span className="ml-1 text-[9px] font-medium rounded-full px-1.5 py-0.5 bg-section text-ink-muted">
                          +{contactCount - 1}
                        </span>
                      )}
                    </div>
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
                        ["new", "contacted", "callback", "no_answer"].includes(lead.status);

                      return (
                        <span className={cn("text-[11px]", isOverdue ? "text-signal-red-text" : "text-ink-muted")}>
                          {lead.nextDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          {isOverdue ? " \u00b7 overdue" : ""}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] text-ink-muted">{lead.source}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <LeadActionMenu lead={lead} funnelId={funnelId} onAdvanced={onLeadAdvanced} />
                  </TableCell>
                </TableRow>
              );
            })}
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
