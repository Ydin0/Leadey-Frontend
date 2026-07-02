"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Building2, Loader2, Search, Users, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { apiRequestRaw } from "@/lib/api/client";
import { CompanyAvatar } from "@/components/funnels/focus/company-avatar";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { SortableHeader } from "@/components/ui/sortable-header";

interface MasterCompany {
  id: string;
  name: string;
  domain: string | null;
  linkedinUrl: string | null;
  industry: string | null;
  employeeCount: number | null;
  fundingStage: string | null;
  country: string | null;
  city: string | null;
  logo: string | null;
  lastSeenAt: string;
}

interface MasterContact {
  id: string;
  fullName: string | null;
  currentTitle: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  enrichmentStatus: string;
}

export default function CompaniesPage() {
  const isAuthReady = useAuthReady();
  const [companies, setCompanies] = useState<MasterCompany[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<MasterContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [stats, setStats] = useState({ companies: 0, contacts: 0 });

  // Sort
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(field: string) {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  }

  const fetchCompanies = useCallback(async (p: number) => {
    try {
      const params = new URLSearchParams({ page: String(p), limit: "25" });
      if (search) params.set("search", search);
      const result = await apiRequestRaw<{ data: MasterCompany[]; meta: { totalCount: number; totalPages: number } }>(`/master/companies?${params}`);
      setCompanies(result.data);
      setTotalCount(result.meta.totalCount);
      setTotalPages(result.meta.totalPages);
    } catch (err) {
      console.error("Failed to load companies:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (!isAuthReady) return;
    setLoading(true);
    fetchCompanies(page);
    apiRequestRaw<{ data: { companies: number; contacts: number } }>("/master/stats")
      .then((r) => setStats(r.data))
      .catch(() => {});
  }, [isAuthReady, page, fetchCompanies]);

  async function loadContacts(companyId: string) {
    if (expandedId === companyId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(companyId);
    setContactsLoading(true);
    try {
      const result = await apiRequestRaw<{ data: MasterContact[] }>(`/master/companies/${companyId}/contacts`);
      setContacts(result.data);
    } catch {
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  }

  // Client-side sort
  const sorted = sortField
    ? [...companies].sort((a, b) => {
        const av = (a as any)[sortField];
        const bv = (b as any)[sortField];
        if (typeof av === "string" && typeof bv === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
        return 0;
      })
    : companies;

  if (loading && companies.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-semibold text-ink">Companies</h1>
          <p className="text-[12px] text-ink-muted mt-0.5">
            {stats.companies.toLocaleString()} companies &middot; {stats.contacts.toLocaleString()} contacts in your database
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search companies by name, domain, or industry..."
            className="w-full pl-9 pr-3 py-2 rounded-full bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
          />
        </div>
        <span className="text-[11px] text-ink-muted">{totalCount} results</span>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-[14px] border border-border-subtle overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border-subtle bg-section/50 hover:bg-section/50">
              <TableHead className="w-[260px]">
                <SortableHeader label="Company" field="name" currentField={sortField} ascending={sortAsc} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[180px]">
                <SortableHeader label="Industry" field="industry" currentField={sortField} ascending={sortAsc} onSort={handleSort} />
              </TableHead>
              <TableHead className="text-center w-[100px]">
                <SortableHeader label="Employees" field="employeeCount" currentField={sortField} ascending={sortAsc} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[180px]">
                <SortableHeader label="Location" field="city" currentField={sortField} ascending={sortAsc} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[140px]">Funding</TableHead>
              <TableHead className="w-[100px]">LinkedIn</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((company) => (
              <>
                <TableRow
                  key={company.id}
                  className={cn("cursor-pointer", expandedId === company.id && "bg-hover/30")}
                  onClick={() => loadContacts(company.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <CompanyAvatar name={company.name} size="md" domain={company.domain || undefined} />
                      <div>
                        <Link
                          href={`/dashboard/companies/${encodeURIComponent(company.id)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[12px] font-medium text-ink hover:underline"
                        >
                          {company.name}
                        </Link>
                        {company.domain && (
                          <span className="text-[10px] text-ink-faint ml-1.5">{company.domain}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[11px] text-ink-secondary">{company.industry || "\u2013"}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-[11px] text-ink-secondary">
                      {company.employeeCount ? company.employeeCount.toLocaleString() : "\u2013"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[11px] text-ink-muted">
                      {[company.city, company.country].filter(Boolean).join(", ") || "\u2013"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {company.fundingStage ? (
                      <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-section text-ink-muted">
                        {company.fundingStage.replace(/_/g, " ")}
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-faint">\u2013</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {company.linkedinUrl && (
                      <a
                        href={company.linkedinUrl.startsWith("http") ? company.linkedinUrl : `https://linkedin.com/company/${company.linkedinUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#0A66C2] hover:underline text-[11px]"
                      >
                        LinkedIn
                      </a>
                    )}
                  </TableCell>
                </TableRow>

                {/* Expanded contacts */}
                {expandedId === company.id && (
                  <TableRow key={`${company.id}-contacts`} className="hover:bg-transparent">
                    <TableCell colSpan={6} className="p-0">
                      <div className="px-6 py-3 bg-section/20 border-t border-border-subtle">
                        {contactsLoading ? (
                          <div className="flex items-center gap-2 py-2">
                            <Loader2 size={12} className="animate-spin text-ink-muted" />
                            <span className="text-[11px] text-ink-muted">Loading contacts...</span>
                          </div>
                        ) : contacts.length === 0 ? (
                          <p className="text-[11px] text-ink-muted py-2">No contacts discovered for this company yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
                              <Users size={10} className="inline mr-1" />
                              {contacts.length} contacts
                            </p>
                            {contacts.map((c) => (
                              <div key={c.id} className="flex items-center justify-between py-1.5 text-[11px]">
                                <div className="flex items-center gap-3">
                                  <span className="font-medium text-ink w-40 truncate">{c.fullName || "Unknown"}</span>
                                  <span className="text-ink-muted w-48 truncate">{c.currentTitle || "\u2013"}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-ink-secondary w-48 truncate">{c.email || "\u2013"}</span>
                                  <span className="text-ink-muted w-32 truncate">{c.phone || "\u2013"}</span>
                                  <span className={cn(
                                    "text-[9px] font-medium rounded-full px-1.5 py-0.5",
                                    c.enrichmentStatus === "enriched" ? "bg-signal-green text-signal-green-text" : "bg-section text-ink-faint"
                                  )}>
                                    {c.enrichmentStatus === "enriched" ? "Enriched" : c.enrichmentStatus}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>

        {totalCount === 0 && !loading && (
          <div className="py-12 text-center">
            <Building2 size={24} className="text-ink-faint mx-auto mb-2" />
            <p className="text-[12px] text-ink-muted">No companies in your database yet. Run a scraper to start building your company directory.</p>
          </div>
        )}

        {totalCount > 0 && (
          <DataTablePagination
            currentPage={page}
            totalPages={totalPages}
            pageSize={25}
            totalItems={totalCount}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
