"use client";

import { useState, useMemo, useRef, useEffect, useCallback, Fragment } from "react";
import { MoreHorizontal, Phone, Mail, Linkedin, Loader2, Building2, ChevronRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useRowLimit } from "@/lib/hooks/use-row-limit";
import { advanceLead } from "@/lib/api/funnels";
import { CompanyAvatar } from "@/components/funnels/focus/company-avatar";
import { FunnelLeadsFilterBar, DEFAULT_FUNNEL_LEADS_FILTERS, type FunnelLeadsFilters } from "./funnel-leads-filter-bar";
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
import type { FunnelLead } from "@/lib/types/funnel";

interface FunnelLeadTableProps {
  leads: FunnelLead[];
  funnelId: string;
  onLeadAdvanced?: () => void;
  onLeadClick?: (leadIndex: number) => void;
}

const PAGE_SIZE = 10;

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

export function FunnelLeadTable({ leads, funnelId, onLeadAdvanced, onLeadClick }: FunnelLeadTableProps) {
  const [filters, setFilters] = useState<FunnelLeadsFilters>(DEFAULT_FUNNEL_LEADS_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [groupByCompany, setGroupByCompany] = useState(true);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
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

  // Compute activity counts for all leads
  const activityMap = useMemo(() => {
    const map = new Map<string, { calls: number; emails: number }>();
    for (const lead of leads) {
      map.set(lead.id, computeActivityCounts(lead.events || []));
    }
    return map;
  }, [leads]);

  // Extract unique companies and sources for filter dropdowns
  const companyOptions = useMemo(() => [...new Set(leads.map((l) => l.company).filter(Boolean))].sort(), [leads]);
  const sourceOptions = useMemo(() => [...new Set(leads.map((l) => l.source).filter(Boolean))].sort(), [leads]);

  // Apply filters
  const filtered = useMemo(() => {
    let result = leads;
    const f = filters;

    if (f.statuses.length > 0) {
      result = result.filter((l) => (f.statuses as string[]).includes(l.status));
    }
    if (f.companies.length > 0) {
      result = result.filter((l) => f.companies.includes(l.company));
    }
    if (f.sources.length > 0) {
      result = result.filter((l) => f.sources.includes(l.source));
    }
    if (f.scoreMin !== null) {
      result = result.filter((l) => l.score >= f.scoreMin!);
    }
    if (f.hasEmail === "true") {
      result = result.filter((l) => !!l.email);
    } else if (f.hasEmail === "false") {
      result = result.filter((l) => !l.email);
    }
    if (f.hasPhone === "true") {
      result = result.filter((l) => !!l.phone);
    } else if (f.hasPhone === "false") {
      result = result.filter((l) => !l.phone);
    }
    if (f.isOverdue) {
      result = result.filter((l) =>
        l.nextDate.getTime() < Date.now() &&
        !isTerminalStatus(l.status)
      );
    }
    if (f.callCountMin !== null) {
      result = result.filter((l) => (activityMap.get(l.id)?.calls ?? 0) >= f.callCountMin!);
    }
    if (f.emailCountMin !== null) {
      result = result.filter((l) => (activityMap.get(l.id)?.emails ?? 0) >= f.emailCountMin!);
    }
    if (f.search) {
      const q = f.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.company.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q)
      );
    }

    // Sort: active statuses first, then by next date
    const statusPriority: Record<string, number> = {
      new: 0, contacted: 1, no_answer: 2, callback: 3, interested: 4,
      not_interested: 5, other_contact: 6, competitor: 7, dnc: 8,
      qualified: 9, bounced: 10, completed: 11,
    };
    const priorityOf = (s: string) => statusPriority[s] ?? 99;
    return [...result].sort((a, b) => {
      const byStatus = priorityOf(a.status) - priorityOf(b.status);
      if (byStatus !== 0) return byStatus;
      return a.nextDate.getTime() - b.nextDate.getTime();
    });
  }, [leads, filters, activityMap]);

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

  const resetPage = useCallback(() => setCurrentPage(1), []);
  const displayItems = groupByCompany ? [...companyGroups.keys()] : filtered;
  const { limited, startingRow, rowLimit, unfilteredTotal, handleRowLimitChange } = useRowLimit(
    groupByCompany ? [...companyGroups.keys()] as any[] : filtered,
    resetPage,
  );

  const totalPages = Math.max(1, Math.ceil(limited.length / PAGE_SIZE));
  const paginatedPage = Math.min(currentPage, totalPages);
  const paginatedKeys = limited.slice((paginatedPage - 1) * PAGE_SIZE, paginatedPage * PAGE_SIZE);
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
      {/* Filter bar */}
      <FunnelLeadsFilterBar
        filters={filters}
        onChange={(f) => { setFilters(f); setCurrentPage(1); }}
        companyOptions={companyOptions}
        sourceOptions={sourceOptions}
      />

      {/* Count + group toggle */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[12px] font-medium text-ink">
          {filtered.length} leads
          {groupByCompany && <span className="text-ink-muted"> in {companyGroups.size} companies</span>}
        </span>
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
      </div>

      {/* Table */}
      <div className="bg-surface rounded-[14px] border border-border-subtle overflow-hidden">
        {groupByCompany ? (
          /* ── Grouped by Company View ── */
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border-subtle bg-section/50 hover:bg-section/50">
                  <TableHead className="w-8" />
                  <TableHead className="text-left w-[240px]">Company</TableHead>
                  <TableHead className="text-left w-[160px]">Industry</TableHead>
                  <TableHead className="text-center w-[90px]">Employees</TableHead>
                  <TableHead className="text-left w-[160px]">Location</TableHead>
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
                        <TableCell className="w-8 px-3">
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
                            <TableCell colSpan={7} className="py-2">
                              <div className="flex items-center gap-3 pl-[60px] pr-2">
                                {/* Name + title */}
                                <div className="flex-1 min-w-0">
                                  <span className="text-[12px] font-medium text-ink">{lead.name}</span>
                                  <div className="text-[10px] text-ink-muted truncate">{lead.title}</div>
                                </div>

                                {/* Status */}
                                <div className="flex items-center gap-1.5 w-[120px] shrink-0">
                                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusDotClass(lead.status, statuses))} />
                                  <span className="text-[11px] text-ink-secondary truncate">{getStatusLabel(lead.status, statuses)}</span>
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
                          <div className="text-[10px] text-ink-muted">{lead.name} &middot; {lead.title}</div>
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
            pageSize={PAGE_SIZE}
            totalItems={limited.length}
            onPageChange={setCurrentPage}
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
