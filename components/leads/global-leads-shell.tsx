"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, Building2, Mail, Phone, Search, ChevronDown, X, Check, Loader2,
  Rocket, FolderInput, Linkedin, Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ImportsView } from "@/components/leads/imports-view";
import {
  getOrgLeads, getOrgLeadCompanies, getLeadsFacets, createCampaignFromLeads,
  type OrgLead, type LeadCompanyRow, type LeadsFacets, type LeadFilters,
} from "@/lib/api/leads";

type Tab = "companies" | "leads" | "imports";

const STATUS_LABEL: Record<string, string> = {
  pending: "Active", new: "New", contacted: "Contacted", replied: "Replied",
  qualified: "Qualified", completed: "Completed", bounced: "Bounced", dnc: "DNC",
};

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-[14px] border border-border-subtle bg-surface px-5 py-4">
      <div className="flex items-center gap-2 text-[11px] text-ink-muted">
        <Icon size={14} className={tone} />
        {label}
      </div>
      <div className="text-[24px] font-semibold text-ink mt-1 tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}

function PersonAvatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return (
    <div className="w-7 h-7 rounded-full bg-section flex items-center justify-center text-[10px] font-medium text-ink-muted shrink-0">
      {initials || "?"}
    </div>
  );
}

export function GlobalLeadsShell() {
  const router = useRouter();
  const isAuthReady = useAuthReady();

  const [tab, setTab] = useState<Tab>("companies");
  const [facets, setFacets] = useState<LeadsFacets | null>(null);
  const [filters, setFilters] = useState<LeadFilters>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [leads, setLeads] = useState<OrgLead[]>([]);
  const [companies, setCompanies] = useState<LeadCompanyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showStatus = useCallback((type: "success" | "error", text: string) => {
    setStatus({ type, text });
    setTimeout(() => setStatus(null), 4000);
  }, []);

  // Debounce the search into the filters.
  useEffect(() => {
    const t = setTimeout(() => { setFilters((f) => ({ ...f, search: search.trim() || undefined })); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!isAuthReady) return;
    getLeadsFacets().then(setFacets).catch(() => {});
  }, [isAuthReady]);

  const load = useCallback(async () => {
    if (!isAuthReady || tab === "imports") return;
    setLoading(true);
    try {
      if (tab === "companies") {
        const r = await getOrgLeadCompanies({ ...filters, page, pageSize: 25 });
        setCompanies(r.data);
        setTotal(r.meta.totalCount);
        setTotalPages(r.meta.totalPages);
      } else {
        const r = await getOrgLeads({ ...filters, page, pageSize: 50 });
        setLeads(r.data);
        setTotal(r.meta.totalCount);
        setTotalPages(r.meta.totalPages);
      }
    } catch {
      showStatus("error", "Could not load leads");
    } finally {
      setLoading(false);
    }
  }, [isAuthReady, tab, filters, page, showStatus]);

  useEffect(() => { void load(); }, [load]);

  const setFilter = (patch: Partial<LeadFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const toggle = (k: keyof LeadFilters) => setFilter({ [k]: filters[k] ? undefined : true });

  // Active filter chips
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.search) chips.push({ key: "s", label: `“${filters.search}”`, clear: () => { setSearch(""); } });
  if (filters.funnelId) chips.push({ key: "f", label: facets?.campaigns.find((c) => c.id === filters.funnelId)?.name ?? "Campaign", clear: () => setFilter({ funnelId: undefined }) });
  if (filters.sourceType) chips.push({ key: "src", label: filters.sourceType, clear: () => setFilter({ sourceType: undefined }) });
  if (filters.status) chips.push({ key: "st", label: STATUS_LABEL[filters.status] ?? filters.status, clear: () => setFilter({ status: undefined }) });
  if (filters.company) chips.push({ key: "co", label: filters.company, clear: () => setFilter({ company: undefined }) });
  if (filters.industry) chips.push({ key: "ind", label: filters.industry, clear: () => setFilter({ industry: undefined }) });
  if (filters.hasEmail) chips.push({ key: "he", label: "Has email", clear: () => setFilter({ hasEmail: undefined }) });
  if (filters.hasPhone) chips.push({ key: "hp", label: "Has phone", clear: () => setFilter({ hasPhone: undefined }) });
  if (filters.hasLinkedin) chips.push({ key: "hl", label: "Has LinkedIn", clear: () => setFilter({ hasLinkedin: undefined }) });
  if (filters.doNotCall) chips.push({ key: "dnc", label: "DNC only", clear: () => setFilter({ doNotCall: undefined }) });
  const clearAll = () => { setSearch(""); setFilters({}); setPage(1); };

  return (
    <div className="max-w-[1640px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Leads</h1>
          <p className="text-[13px] text-ink-muted mt-0.5">Every lead and company across your organisation. Filter, then spin up a campaign.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-ink text-on-ink text-[12px] font-medium hover:opacity-90 transition-opacity"
        >
          <Rocket size={14} /> Create campaign from filter
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard icon={Users} label="Total leads" value={facets?.total ?? 0} tone="text-signal-blue-text" />
        <StatCard icon={Building2} label="Companies" value={facets?.companies ?? 0} tone="text-accent" />
        <StatCard icon={Mail} label="With email" value={facets?.withEmail ?? 0} tone="text-signal-green-text" />
        <StatCard icon={Phone} label="With phone" value={facets?.withPhone ?? 0} tone="text-signal-blue-text" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-section rounded-full p-[3px] w-fit mb-4">
        {([["companies", "Companies", Building2], ["leads", "Leads", Users], ["imports", "Imports", FolderInput]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => { setTab(id); setPage(1); }}
            className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all", tab === id ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink-secondary")}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === "imports" ? (
        <ImportsView showStatus={showStatus} />
      ) : (
        <>
          {/* Filter bar */}
          <div className="rounded-[14px] border border-border-subtle bg-surface/60 backdrop-blur-sm px-4 py-3.5 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-surface border border-border-default rounded-full px-3.5 py-2 w-[300px]">
                <Search size={15} className="text-ink-muted shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, company, email, title…"
                  className="bg-transparent border-0 outline-0 text-[13px] text-ink placeholder:text-ink-faint w-full"
                />
              </div>

              {facets && facets.campaigns.length > 0 && (
                <Dropdown
                  label="Campaign"
                  value={filters.funnelId}
                  options={[{ value: undefined, label: "All campaigns" }, ...facets.campaigns.map((c) => ({ value: c.id, label: c.name }))]}
                  onSelect={(v) => setFilter({ funnelId: v })}
                />
              )}
              {facets && facets.sources.length > 0 && (
                <Dropdown
                  label="Source"
                  value={filters.sourceType}
                  options={[{ value: undefined, label: "All sources" }, ...facets.sources.map((s) => ({ value: s, label: s }))]}
                  onSelect={(v) => setFilter({ sourceType: v })}
                />
              )}
              {facets && facets.statuses.length > 0 && (
                <Dropdown
                  label="Status"
                  value={filters.status}
                  options={[{ value: undefined, label: "Any status" }, ...facets.statuses.map((s) => ({ value: s, label: STATUS_LABEL[s] ?? s }))]}
                  onSelect={(v) => setFilter({ status: v })}
                />
              )}

              <div className="w-px h-[22px] bg-border-subtle" />
              <Toggle label="Has email" on={!!filters.hasEmail} onClick={() => toggle("hasEmail")} />
              <Toggle label="Has phone" on={!!filters.hasPhone} onClick={() => toggle("hasPhone")} />
              <Toggle label="Has LinkedIn" on={!!filters.hasLinkedin} onClick={() => toggle("hasLinkedin")} />
              <Toggle label="DNC only" on={!!filters.doNotCall} onClick={() => toggle("doNotCall")} />
            </div>

            {chips.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-border-subtle">
                <span className="text-[11px] text-ink-muted mr-1">{total.toLocaleString()} match</span>
                {chips.map((c) => (
                  <button key={c.key} onClick={c.clear} className="inline-flex items-center gap-1.5 text-[11px] bg-section text-ink-secondary rounded-full px-2.5 py-1 hover:bg-hover transition-colors">
                    {c.label} <X size={11} />
                  </button>
                ))}
                <button onClick={clearAll} className="text-[11px] text-ink-muted px-1.5 hover:text-ink-secondary">Clear all</button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="rounded-[14px] border border-border-subtle bg-surface p-6"><p className="text-[12px] text-ink-muted">Loading…</p></div>
          ) : tab === "companies" ? (
            <CompaniesTable rows={companies} onPick={(company) => { setTab("leads"); setFilter({ company }); }} />
          ) : (
            <LeadsTable rows={leads} />
          )}

          {!loading && total > 0 && (
            <div className="mt-3">
              <DataTablePagination currentPage={page} totalPages={totalPages} pageSize={tab === "companies" ? 25 : 50} totalItems={total} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      {showCreate && (
        <CreateCampaignModal
          count={total}
          filters={filters}
          onClose={() => setShowCreate(false)}
          onDone={(funnelId) => router.push(`/dashboard/funnels/${funnelId}`)}
        />
      )}

      {status && (
        <div className={cn("fixed bottom-6 right-6 z-50 rounded-[10px] px-4 py-2.5 text-[12px] font-medium shadow-lg", status.type === "success" ? "bg-signal-green text-signal-green-text" : "bg-signal-red text-signal-red-text")}>
          {status.text}
        </div>
      )}
    </div>
  );
}

/** Favicon-based round company logo with an initials fallback — identical to
 *  the campaign Companies table so both lists look exactly the same. */
function CompanyLogo({ domain, name }: { domain: string | null; name: string }) {
  const [imgError, setImgError] = useState(false);
  const initials = (name || "?").slice(0, 2).toUpperCase();
  if (!domain || imgError) {
    return (
      <div className="w-6 h-6 rounded-full bg-signal-blue flex items-center justify-center flex-shrink-0">
        <span className="text-[9px] font-bold text-signal-blue-text">{initials}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?sz=128&domain=${domain}`}
      alt={name}
      width={24}
      height={24}
      className="w-6 h-6 rounded-full flex-shrink-0 object-contain"
      onError={() => setImgError(true)}
    />
  );
}

function CompaniesTable({ rows, onPick }: { rows: LeadCompanyRow[]; onPick: (company: string) => void }) {
  if (rows.length === 0) return <Empty />;
  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border-subtle bg-section/50 hover:bg-section/50">
            <TableHead className="text-left w-[260px]">Company</TableHead>
            <TableHead className="text-right w-[90px]">Leads</TableHead>
            <TableHead className="text-right w-[110px]">Campaigns</TableHead>
            <TableHead className="text-right w-[110px]">With phone</TableHead>
            <TableHead className="text-left w-[150px]">Industry</TableHead>
            <TableHead className="text-left">Location</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.company} className="cursor-pointer" onClick={() => onPick(r.company)}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <CompanyLogo domain={r.domain} name={r.company} />
                  <span className="text-[12px] font-medium text-ink">{r.company || "—"}</span>
                  {r.domain && <span className="text-[10px] text-ink-faint">{r.domain}</span>}
                </div>
              </TableCell>
              <TableCell className="text-right text-ink-secondary tabular-nums">{r.leadCount}</TableCell>
              <TableCell className="text-right text-ink-secondary tabular-nums">{r.campaigns}</TableCell>
              <TableCell className="text-right text-ink-secondary tabular-nums">{r.withPhone}</TableCell>
              <TableCell className="text-ink-secondary">{r.industry || <span className="text-ink-faint">—</span>}</TableCell>
              <TableCell className="text-ink-muted">{r.location || <span className="text-ink-faint">—</span>}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LeadsTable({ rows }: { rows: OrgLead[] }) {
  if (rows.length === 0) return <Empty />;
  return (
    <div className="rounded-[14px] border border-border-subtle bg-surface overflow-hidden">
      <div className="grid items-center gap-4 px-5 py-3 border-b border-border-subtle text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted" style={{ gridTemplateColumns: "minmax(200px,1.4fr) minmax(160px,1.2fr) minmax(160px,1.2fr) 90px 130px" }}>
        <span>Name</span><span>Title</span><span>Company</span><span className="text-center">Channels</span><span>Campaign</span>
      </div>
      {rows.map((l) => (
        <Link
          key={l.id}
          href={`/dashboard/funnels/${l.funnelId}/leads/${l.id}`}
          className="grid items-center gap-4 px-5 py-3 border-b border-border-subtle last:border-b-0 hover:bg-accent/[0.05] transition-colors"
          style={{ gridTemplateColumns: "minmax(200px,1.4fr) minmax(160px,1.2fr) minmax(160px,1.2fr) 90px 130px" }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <PersonAvatar name={l.name} />
            <div className="min-w-0">
              <div className={cn("text-[13px] font-medium truncate", l.doNotCall ? "text-signal-red-text" : "text-ink")}>{l.name}</div>
              {l.companyLocation && <div className="text-[11px] text-ink-faint truncate">{l.companyLocation}</div>}
            </div>
            {l.doNotCall && <Ban size={11} className="text-signal-red-text shrink-0" />}
          </div>
          <span className="text-[12px] text-ink-secondary truncate">{l.title || "—"}</span>
          <span className="text-[12px] text-ink-secondary truncate">{l.company}</span>
          <span className="flex items-center justify-center gap-1.5">
            <Mail size={13} className={l.email ? "text-signal-green-text" : "text-ink-faint/40"} />
            <Phone size={13} className={l.phone ? "text-signal-blue-text" : "text-ink-faint/40"} />
            <Linkedin size={13} className={l.linkedinUrl ? "text-linkedin" : "text-ink-faint/40"} />
          </span>
          <span className="text-[11px] text-ink-muted truncate">{l.funnelName || "—"}</span>
        </Link>
      ))}
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-[14px] border border-border-subtle bg-surface px-10 py-14 text-center">
      <div className="flex items-center justify-center w-[52px] h-[52px] rounded-[14px] bg-section mx-auto mb-4"><Users size={22} className="text-ink-muted" /></div>
      <div className="text-[16px] font-semibold text-ink">No leads match your filters</div>
      <p className="text-[13px] text-ink-muted mt-1.5">Adjust the filters above, or import leads into a campaign.</p>
    </div>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium border transition-colors", on ? "bg-section border-border-default text-ink" : "bg-transparent border-border-subtle text-ink-muted hover:border-border-default")}>
      {on && <Check size={12} />} {label}
    </button>
  );
}

function Dropdown({ label, value, options, onSelect }: {
  label: string;
  value: string | undefined;
  options: { value: string | undefined; label: string }[];
  onSelect: (v: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  const current = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors", value ? "bg-section border-border-default text-ink" : "bg-transparent border-border-subtle text-ink-muted hover:border-border-default")}>
        {value ? current?.label : label}
        <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[180px] max-h-[280px] overflow-y-auto bg-surface border border-border-default rounded-[10px] shadow-lg p-1.5">
          {options.map((o) => (
            <button key={o.label} onClick={() => { onSelect(o.value); setOpen(false); }} className={cn("flex items-center justify-between w-full rounded-md px-2.5 py-1.5 text-[12px] text-left transition-colors", o.value === value ? "bg-section text-ink" : "text-ink-secondary hover:bg-hover")}>
              <span className="truncate">{o.label}</span>
              {o.value === value && <Check size={13} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateCampaignModal({ count, filters, onClose, onDone }: {
  count: number;
  filters: LeadFilters;
  onClose: () => void;
  onDone: (funnelId: string) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await createCampaignFromLeads({ name: name.trim(), filters });
      onDone(res.funnelId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create campaign");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40" onClick={onClose}>
      <div className="bg-surface rounded-[14px] border border-border-subtle p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-1">
          <Rocket size={16} className="text-accent" />
          <h3 className="text-[15px] font-semibold text-ink">Create campaign from filter</h3>
        </div>
        <p className="text-[12px] text-ink-muted mb-4">
          {count.toLocaleString()} matching {count === 1 ? "lead" : "leads"} will be added to a new campaign (deduplicated). You can build the sequence after.
        </p>
        <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Campaign name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
          autoFocus
          placeholder="e.g. CEOs · UK · Has phone"
          className="w-full px-3 py-2 rounded-[10px] bg-section text-[13px] text-ink outline-none border border-border-subtle focus:border-accent"
        />
        {error && <p className="text-[11px] text-signal-red-text mt-2">{error}</p>}
        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-full bg-section text-ink-secondary text-[12px] font-medium hover:bg-hover transition-colors">Cancel</button>
          <button onClick={() => void submit()} disabled={!name.trim() || busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-on-ink text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Rocket size={13} />}
            Create campaign
          </button>
        </div>
      </div>
    </div>
  );
}
