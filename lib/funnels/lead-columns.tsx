"use client";

import type { ReactNode } from "react";
import { Ban, Linkedin, Phone, Mail, Users, Briefcase, Clock } from "lucide-react";
import { cn, formatPhoneIntl } from "@/lib/utils";
import { leadLocalTime } from "@/lib/utils/lead-timezone";
import { getStatusDotClass, getStatusLabel, isTerminalStatus, type LeadStatusOption } from "@/lib/utils/lead-status";
import { CompanyAvatar } from "@/components/funnels/focus/company-avatar";
import type { FunnelLead } from "@/lib/types/funnel";
import type { FilterFieldDef } from "@/lib/types/lead-filter";

/** Context handed to each column renderer so cells stay pure data-display
 *  (row actions + selection live in fixed columns owned by the table). */
export interface LeadColumnCtx {
  statuses: LeadStatusOption[];
  activity: (id: string) => { calls: number; emails: number };
  /** Resolve any field key (incl. `custom:<key>`) to a value for this lead. */
  value: (lead: FunnelLead, key: string) => unknown;
  /** When the table rows are clickable, the contact/company reads as a link. */
  linkified: boolean;
}

export type LeadColumnGroup = "Lead" | "Company" | "Sequence" | "Activity" | "Custom";

export interface LeadColumn {
  key: string;
  label: string;
  group: LeadColumnGroup;
  align?: "left" | "center";
  /** Min width (px) — the flat table is a fixed CSS grid driven by these. */
  width: number;
  defaultVisible: boolean;
  render: (lead: FunnelLead, ctx: LeadColumnCtx) => ReactNode;
  /** Company-level header label (grouped view), when it differs from `label`. */
  companyLabel?: string;
  /** Company-level renderer for the grouped (by-company) view. Columns without
   *  this are lead-specific and simply don't appear when grouping. */
  companyRender?: (group: FunnelLead[], ctx: LeadColumnCtx) => ReactNode;
}

/** Best non-generic domain for a company group (mirrors the table's logic). */
function groupDomain(group: FunnelLead[]): string | undefined {
  return group.reduce<string | undefined>((found, l) => {
    if (found) return found;
    if (l.companyDomain) return l.companyDomain;
    const ed = l.email?.split("@")[1];
    if (ed && !["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"].includes(ed)) return ed;
    return undefined;
  }, undefined);
}
function firstWith<T>(group: FunnelLead[], pick: (l: FunnelLead) => T | undefined | null): T | undefined {
  for (const l of group) { const v = pick(l); if (v != null && v !== "") return v as T; }
  return undefined;
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={cn("w-1.5 h-1.5 rounded-full", i < current ? "bg-signal-blue-text" : "bg-section")} />
      ))}
      <span className="text-[10px] text-ink-muted ml-1">{current}/{total}</span>
    </div>
  );
}

const dash = <span className="text-ink-faint">&mdash;</span>;
function fmtDate(d?: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
const text = (v: unknown): ReactNode => {
  const s = v == null || v === "" ? "" : String(v);
  return s ? <span className="text-[11px] text-ink-secondary truncate">{s}</span> : dash;
};
function localTimeCell(lead: FunnelLead): ReactNode {
  const lt = leadLocalTime(lead);
  if (!lt) return dash;
  // Out-of-hours (before 8am / after 8pm local) reads dimmer.
  const off = lt.hour < 8 || lt.hour >= 20;
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-[11px] whitespace-nowrap", off ? "text-ink-faint" : "text-ink-secondary")}
      title={`Local time · ${lt.tz}${off ? " (likely outside working hours)" : ""}`}
    >
      <Clock size={11} strokeWidth={1.5} className={off ? "text-ink-faint" : "text-ink-muted"} /> {lt.label}
    </span>
  );
}

const roleCount = (n: number): ReactNode =>
  n > 0 ? (
    <span className="inline-flex items-center gap-1 text-[11px] text-ink-secondary tabular-nums" title={`${n} open role${n === 1 ? "" : "s"}`}>
      <Briefcase size={11} strokeWidth={1.5} className="text-ink-faint" /> {n}
    </span>
  ) : dash;

/** The full catalog of built-in lead columns (custom fields appended separately). */
export const BUILTIN_LEAD_COLUMNS: LeadColumn[] = [
  {
    key: "contact", label: "Contact", companyLabel: "Company", group: "Lead", align: "left", width: 240, defaultVisible: true,
    render: (lead, ctx) => (
      <div className="flex items-center gap-2.5 min-w-0">
        <CompanyAvatar name={lead.company} size="md" domain={lead.companyDomain || lead.email?.split("@")[1]} />
        <div className="min-w-0">
          <span className={cn("text-[12px] font-medium truncate block", ctx.linkified ? "text-signal-blue-text" : "text-ink")}>
            {lead.company}
          </span>
          <div className="text-[10px] text-ink-muted truncate">
            <span className={cn("inline-flex items-center gap-1", lead.doNotCall && "text-signal-red-text font-medium")}>
              {lead.doNotCall && <Ban size={9} strokeWidth={2} />}{lead.name}
            </span>
            {lead.title ? <> &middot; {lead.title}</> : null}
          </div>
        </div>
      </div>
    ),
    companyRender: (group) => {
      const company = group[0]?.company || "";
      const domain = groupDomain(group);
      return (
        <div className="flex items-center gap-2.5 min-w-0">
          <CompanyAvatar name={company} size="md" domain={domain} />
          <div className="min-w-0">
            <span className="text-[12px] font-medium text-ink truncate block">{company}</span>
            {domain && <div className="text-[10px] text-ink-faint truncate">{domain}</div>}
          </div>
        </div>
      );
    },
  },
  { key: "name", label: "Name", group: "Lead", align: "left", width: 150, defaultVisible: false, render: (l) => text(l.name) },
  { key: "title", label: "Title", group: "Lead", align: "left", width: 160, defaultVisible: false, render: (l) => text(l.title) },
  { key: "company", label: "Company", group: "Lead", align: "left", width: 170, defaultVisible: false, render: (l) => text(l.company) },
  {
    key: "email", label: "Email", group: "Lead", align: "left", width: 200, defaultVisible: false,
    render: (l) => (l.email ? <span className="text-[11px] text-ink-secondary truncate">{l.email}</span> : dash),
  },
  {
    key: "phone", label: "Phone", group: "Lead", align: "left", width: 140, defaultVisible: false,
    render: (l) => (l.phone ? <span className="text-[11px] text-ink-secondary tabular-nums">{formatPhoneIntl(l.phone)}</span> : dash),
  },
  {
    key: "linkedin", label: "LinkedIn", group: "Lead", align: "center", width: 80, defaultVisible: false,
    render: (l) => (l.linkedinUrl
      ? <a href={l.linkedinUrl.startsWith("http") ? l.linkedinUrl : `https://www.linkedin.com/in/${l.linkedinUrl}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#0A66C2] inline-flex"><Linkedin size={13} strokeWidth={1.5} /></a>
      : dash),
  },
  {
    key: "status", label: "Status", group: "Lead", align: "center", width: 120, defaultVisible: true,
    render: (l, ctx) => (
      <div className="flex items-center justify-center gap-1.5">
        <div className={cn("w-1.5 h-1.5 rounded-full", getStatusDotClass(l.status, ctx.statuses))} />
        <span className="text-[11px] text-ink-secondary">{getStatusLabel(l.status, ctx.statuses)}</span>
      </div>
    ),
    companyLabel: "Status",
    companyRender: (group, ctx) => {
      // Company status = the most meaningful status across its contacts.
      const status = group.find((l) => l.status !== "new" && l.status !== "pending")?.status || group[0]?.status || "new";
      return (
        <div className="flex items-center gap-1.5">
          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusDotClass(status, ctx.statuses))} />
          <span className="text-[11px] text-ink-secondary truncate">{getStatusLabel(status, ctx.statuses)}</span>
        </div>
      );
    },
  },
  {
    key: "score", label: "Score", group: "Lead", align: "center", width: 72, defaultVisible: false,
    render: (l) => <span className="text-[11px] text-ink-secondary tabular-nums">{l.score ?? 0}</span>,
  },
  {
    key: "source", label: "Source", group: "Lead", align: "left", width: 110, defaultVisible: true,
    render: (l) => text(l.source), companyLabel: "Source", companyRender: (g) => text(firstWith(g, (l) => l.source)),
  },
  {
    key: "contacts", label: "Contacts", group: "Company", align: "center", width: 84, defaultVisible: true,
    render: (l, ctx) => <span className="text-[11px] text-ink-secondary tabular-nums">{String(ctx.value(l, "leadsInCompany") ?? "")}</span>,
    companyLabel: "Contacts",
    companyRender: (g) => (
      <div className="flex items-center justify-center gap-1">
        <Users size={11} className="text-ink-faint" />
        <span className="text-[11px] text-ink-secondary">{g.length}</span>
      </div>
    ),
  },
  // Company
  {
    key: "industry", label: "Industry", group: "Company", align: "left", width: 160, defaultVisible: true,
    render: (l) => text(l.companyIndustry), companyRender: (g) => text(firstWith(g, (l) => l.companyIndustry)),
  },
  {
    key: "employees", label: "Employees", group: "Company", align: "center", width: 96, defaultVisible: true,
    render: (l) => (l.companyEmployeeCount ? <span className="text-[11px] text-ink-secondary tabular-nums">{l.companyEmployeeCount.toLocaleString()}</span> : dash),
    companyRender: (g) => { const n = firstWith(g, (l) => l.companyEmployeeCount); return n ? <span className="text-[11px] text-ink-secondary tabular-nums">{n.toLocaleString()}</span> : dash; },
  },
  {
    key: "location", label: "Location", group: "Company", align: "left", width: 150, defaultVisible: true,
    render: (l) => text(l.companyLocation), companyRender: (g) => text(firstWith(g, (l) => l.companyLocation)),
  },
  {
    key: "localTime", label: "Local time", group: "Company", align: "left", width: 150, defaultVisible: false,
    render: (l) => localTimeCell(l),
    companyRender: (g) => { const l = g.find((x) => leadLocalTime(x)) ?? g[0]; return l ? localTimeCell(l) : dash; },
  },
  {
    key: "domain", label: "Domain", group: "Company", align: "left", width: 150, defaultVisible: false,
    render: (l) => text(l.companyDomain), companyRender: (g) => text(groupDomain(g)),
  },
  {
    key: "revenue", label: "Annual revenue", group: "Company", align: "left", width: 130, defaultVisible: false,
    render: (l) => text(l.companyAnnualRevenue), companyRender: (g) => text(firstWith(g, (l) => l.companyAnnualRevenue)),
  },
  {
    key: "hiringRoles", label: "Hiring roles", group: "Company", align: "center", width: 96, defaultVisible: false,
    render: (l) => roleCount(l.companyHiringRoles?.length ?? 0),
    companyLabel: "Hiring roles",
    // A company's open roles — the largest set found across its contacts.
    companyRender: (g) => roleCount(g.reduce((m, l) => Math.max(m, l.companyHiringRoles?.length ?? 0), 0)),
  },
  // Sequence
  {
    key: "step", label: "Step", group: "Sequence", align: "center", width: 96, defaultVisible: true,
    render: (l) => <div className="flex justify-center"><ProgressDots current={l.currentStep} total={l.totalSteps} /></div>,
  },
  {
    key: "nextDue", label: "Next due", group: "Sequence", align: "left", width: 150, defaultVisible: true,
    render: (l) => {
      const overdue = l.nextDate.getTime() < Date.now() && !isTerminalStatus(l.status);
      return (
        <div>
          {l.nextAction && <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-section text-ink-secondary">{l.nextAction}</span>}
          <div className={cn("text-[11px] mt-0.5", overdue ? "text-signal-red-text" : "text-ink-muted")}>
            {l.nextDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}{overdue ? " · overdue" : ""}
          </div>
        </div>
      );
    },
  },
  // Activity
  {
    key: "activity", label: "Activity", group: "Activity", align: "center", width: 110, defaultVisible: true,
    render: (l, ctx) => {
      const a = ctx.activity(l.id);
      return (
        <div className="flex items-center justify-center gap-3">
          <span className={cn("flex items-center gap-1 text-[11px]", a.calls > 0 ? "text-ink-secondary" : "text-ink-faint")}><Phone size={11} strokeWidth={1.5} /> {a.calls}</span>
          <span className={cn("flex items-center gap-1 text-[11px]", a.emails > 0 ? "text-ink-secondary" : "text-ink-faint")}><Mail size={11} strokeWidth={1.5} /> {a.emails}</span>
        </div>
      );
    },
    companyLabel: "Activity",
    companyRender: (group, ctx) => {
      const calls = group.reduce((s, l) => s + ctx.activity(l.id).calls, 0);
      const emails = group.reduce((s, l) => s + ctx.activity(l.id).emails, 0);
      return (
        <div className="flex items-center justify-center gap-2">
          <span className={cn("flex items-center gap-0.5 text-[10px]", calls > 0 ? "text-ink-secondary" : "text-ink-faint")}><Phone size={10} strokeWidth={1.5} /> {calls}</span>
          <span className={cn("flex items-center gap-0.5 text-[10px]", emails > 0 ? "text-ink-secondary" : "text-ink-faint")}><Mail size={10} strokeWidth={1.5} /> {emails}</span>
        </div>
      );
    },
  },
  {
    key: "calls", label: "Calls", group: "Activity", align: "center", width: 72, defaultVisible: false,
    render: (l, ctx) => <span className="text-[11px] text-ink-secondary tabular-nums">{ctx.activity(l.id).calls}</span>,
  },
  {
    key: "emails", label: "Emails", group: "Activity", align: "center", width: 72, defaultVisible: false,
    render: (l, ctx) => <span className="text-[11px] text-ink-secondary tabular-nums">{ctx.activity(l.id).emails}</span>,
  },
  {
    key: "created", label: "Date added", group: "Activity", align: "left", width: 120, defaultVisible: false,
    render: (l) => text(fmtDate(l.createdAt)),
  },
];

/** Build the full catalog including one column per org custom field. */
export function buildLeadColumns(customFields: FilterFieldDef[]): LeadColumn[] {
  const customCols: LeadColumn[] = customFields.map((f) => ({
    key: f.key, // already "custom:<key>"
    label: f.label,
    group: "Custom" as const,
    align: "left" as const,
    width: 150,
    defaultVisible: false,
    render: (lead: FunnelLead, ctx: LeadColumnCtx) => text(ctx.value(lead, f.key)),
  }));
  return [...BUILTIN_LEAD_COLUMNS, ...customCols];
}

// ── Persistence (per-user, localStorage) ─────────────────────────────────
const STORAGE_KEY = "leadey:lead-columns:v1";

export interface ColumnPrefs {
  /** All known column keys in display order. */
  order: string[];
  /** Keys explicitly hidden. */
  hidden: string[];
}

export function loadColumnPrefs(): ColumnPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (Array.isArray(p?.order) && Array.isArray(p?.hidden)) return { order: p.order, hidden: p.hidden };
  } catch { /* ignore */ }
  return null;
}

export function saveColumnPrefs(prefs: ColumnPrefs): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}

/**
 * Merge stored prefs with the live catalog into an ordered list of columns,
 * each flagged visible/hidden. New catalog columns (e.g. a freshly-created
 * custom field) append at the end with their default visibility.
 */
export function resolveColumns(
  catalog: LeadColumn[],
  prefs: ColumnPrefs | null,
): { col: LeadColumn; visible: boolean }[] {
  const byKey = new Map(catalog.map((c) => [c.key, c]));
  const ordered: LeadColumn[] = [];
  const seen = new Set<string>();
  const known = new Set(prefs?.order ?? []); // keys the user's prefs already knew about
  if (prefs) {
    for (const k of prefs.order) {
      const c = byKey.get(k);
      if (c && !seen.has(k)) { ordered.push(c); seen.add(k); }
    }
  }
  for (const c of catalog) {
    if (!seen.has(c.key)) { ordered.push(c); seen.add(c.key); }
  }
  const hidden = new Set(prefs?.hidden ?? []);
  return ordered.map((col) => ({
    col,
    // Known columns follow the saved hidden set; brand-new columns (e.g. a
    // freshly-created custom field) fall back to their default visibility.
    visible: !prefs ? col.defaultVisible : known.has(col.key) ? !hidden.has(col.key) : col.defaultVisible,
  }));
}
