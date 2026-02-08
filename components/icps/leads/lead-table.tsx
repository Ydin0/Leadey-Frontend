"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ExternalLink, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { LeadFilters } from "./lead-filters";
import { mockFunnelPickerOptions as mockFunnels } from "@/lib/mock-data/funnels";
import type { EnrichedLead, LeadStatus } from "@/lib/types/lead";
import type { Department, SeniorityLevel } from "@/lib/types/icp";

interface LeadTableProps {
  leads: EnrichedLead[];
}

const PAGE_SIZE = 10;

function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const config: Record<LeadStatus, { label: string; className: string }> = {
    discovered: { label: "Discovered", className: "bg-signal-slate text-signal-slate-text" },
    enriching: { label: "Enriching", className: "bg-signal-blue text-signal-blue-text" },
    enriched: { label: "Enriched", className: "bg-signal-green text-signal-green-text" },
    in_funnel: { label: "In Funnel", className: "bg-signal-blue text-signal-blue-text" },
  };
  const { label, className } = config[status];
  return (
    <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", className)}>
      {label}
    </span>
  );
}

export function LeadTable({ leads }: LeadTableProps) {
  const [activeDepartments, setActiveDepartments] = useState<Department[]>([]);
  const [activeSeniorities, setActiveSeniorities] = useState<SeniorityLevel[]>([]);
  const [activeStatuses, setActiveStatuses] = useState<LeadStatus[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFunnelPicker, setShowFunnelPicker] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const funnelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (funnelRef.current && !funnelRef.current.contains(e.target as Node)) {
        setShowFunnelPicker(false);
      }
    }
    if (showFunnelPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showFunnelPicker]);

  function toggleDepartment(dept: Department) {
    setActiveDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  }

  function toggleSeniority(level: SeniorityLevel) {
    setActiveSeniorities((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  }

  function toggleStatus(status: LeadStatus) {
    setActiveStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }

  const filtered = useMemo(() => {
    let result = leads;
    if (activeDepartments.length > 0) {
      result = result.filter((l) => activeDepartments.includes(l.department));
    }
    if (activeSeniorities.length > 0) {
      result = result.filter((l) => activeSeniorities.includes(l.seniority));
    }
    if (activeStatuses.length > 0) {
      result = result.filter((l) => activeStatuses.includes(l.status));
    }
    return result;
  }, [leads, activeDepartments, activeSeniorities, activeStatuses]);

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
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((l) => l.id)));
    }
  }

  const selectedLeads = leads.filter((l) => selectedIds.has(l.id));
  const hasDiscovered = selectedLeads.some((l) => l.status === "discovered");
  const hasEnriched = selectedLeads.some((l) => l.status === "enriched");

  function handleEnrichSelected() {
    const toEnrich = selectedLeads.filter((l) => l.status === "discovered").map((l) => l.id);
    console.log("Enrich selected leads:", toEnrich);
    setSelectedIds(new Set());
  }

  function handleSendToFunnel(funnelId: string) {
    const toSend = selectedLeads.filter((l) => l.status === "enriched").map((l) => l.id);
    console.log("Send to funnel:", funnelId, "leads:", toSend);
    setShowFunnelPicker(false);
    setSelectedIds(new Set());
  }

  const allSelected = filtered.length > 0 && filtered.every((l) => selectedIds.has(l.id));

  return (
    <div>
      <div className="mb-4">
        <LeadFilters
          activeDepartments={activeDepartments}
          onToggleDepartment={toggleDepartment}
          activeSeniorities={activeSeniorities}
          onToggleSeniority={toggleSeniority}
          activeStatuses={activeStatuses}
          onToggleStatus={toggleStatus}
        />
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-signal-blue/30 rounded-[10px]">
          <span className="text-[11px] font-medium text-ink">{selectedIds.size} selected</span>
          {hasDiscovered && (
            <button
              onClick={handleEnrichSelected}
              className="px-3 py-1 rounded-[16px] bg-ink text-on-ink text-[10px] font-medium"
            >
              Enrich Selected
            </button>
          )}
          {hasEnriched && (
            <div className="relative" ref={funnelRef}>
              <button
                onClick={() => setShowFunnelPicker(!showFunnelPicker)}
                className="flex items-center gap-1 px-3 py-1 rounded-[16px] bg-ink text-on-ink text-[10px] font-medium"
              >
                Send to Funnel
                <ChevronDown size={10} />
              </button>
              {showFunnelPicker && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-surface rounded-[10px] border border-border-default shadow-lg py-1 z-20">
                  {mockFunnels.map((funnel) => (
                    <button
                      key={funnel.id}
                      onClick={() => handleSendToFunnel(funnel.id)}
                      className="w-full text-left px-3 py-2 hover:bg-hover transition-colors"
                    >
                      <div className="text-[11px] font-medium text-ink">{funnel.name}</div>
                      <div className="text-[10px] text-ink-muted">{funnel.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1 rounded-[16px] bg-section text-ink-secondary text-[10px] font-medium"
          >
            Clear
          </button>
        </div>
      )}

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
              <TableHead className="text-left">Name</TableHead>
              <TableHead className="text-left">Title</TableHead>
              <TableHead className="text-left">Company</TableHead>
              <TableHead className="text-left">Location</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">LinkedIn</TableHead>
              <TableHead className="text-left">Contact</TableHead>
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
                  <span className="text-[12px] font-medium text-ink">{lead.name}</span>
                </TableCell>
                <TableCell className="text-ink-secondary">{lead.title}</TableCell>
                <TableCell className="text-ink-secondary">{lead.company}</TableCell>
                <TableCell className="text-ink-muted">{lead.location || "\u2013"}</TableCell>
                <TableCell className="text-center">
                  <LeadStatusBadge status={lead.status} />
                </TableCell>
                <TableCell className="text-center">
                  {lead.linkedinUrl ? (
                    <ExternalLink size={11} strokeWidth={1.5} className="text-linkedin mx-auto" />
                  ) : (
                    <span className="text-ink-faint">&ndash;</span>
                  )}
                </TableCell>
                <TableCell>
                  {lead.status === "enriched" || lead.status === "in_funnel" ? (
                    <span className="text-[11px] text-ink-secondary">{lead.email || "\u2013"}</span>
                  ) : (
                    <span className="text-[11px] text-ink-faint italic">Pending enrichment</span>
                  )}
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
