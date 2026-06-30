"use client";

import { useState, type ReactNode } from "react";
import {
  Info,
  Users,
  List,
  MapPin,
  Link as LinkIcon,
  AlignLeft,
  Mail,
  Phone,
  Building2,
  Ban,
  Loader2,
  Pencil,
  Check,
  Clock,
  ChevronRight,
  Linkedin,
  Filter,
  Plus,
  X,
  DollarSign,
} from "lucide-react";
import { cn, formatPhoneIntl } from "@/lib/utils";
import { localTimeFromPhone } from "@/lib/utils/lead-timezone";
import { confirmDncCall } from "@/lib/utils/dnc";
import type { FunnelLead } from "@/lib/types/funnel";
import type {
  FunnelLeadCompany,
  FunnelLeadContact,
  FunnelLeadCustomField,
} from "@/lib/types/funnel-focus";
import type { LeadStatusOption } from "@/lib/utils/lead-status";
import { Section, MiniBtn } from "./lead-section";
import { LeadTasksSection } from "./lead-tasks-section";
import { LeadOpportunitySection } from "./lead-opportunity-section";
import { LeadLeadsList } from "./lead-leads-list";
import { LeadHiringRolesSection } from "./lead-hiring-roles-section";

/** Patch shape for the editable About section (keys match the backend route). */
export type CompanyInfoPatch = Partial<{
  companyDomain: string;
  companyIndustry: string;
  companyEmployeeCount: number | string;
  companyLocation: string;
  companyDescription: string;
  companyLinkedin: string;
  companyAnnualRevenue: string;
}>;

/** An org-defined custom field merged with this lead's value, for inline edit. */
export interface EditableCustomField {
  key: string;
  label: string;
  value: string;
  fieldType: "text" | "number" | "date" | "url" | "select";
  options: string[];
  isLink: boolean;
}

interface LeadDetailsColumnProps {
  funnelId: string;
  leadId: string;
  company: FunnelLeadCompany | null;
  contacts: FunnelLeadContact[];
  customFields: FunnelLeadCustomField[];
  /** Org-defined custom fields with this lead's values (editable). */
  editableCustomFields?: EditableCustomField[];
  opportunityId: string | null;
  onConvert: () => void;
  onOpportunityChanged: () => void;
  /** Save edited company / About info (fans out to all same-company contacts). */
  onCompanySave?: (patch: CompanyInfoPatch) => Promise<void>;
  /** Save edited custom-field values (keyed by field key). */
  onCustomFieldsSave?: (values: Record<string, string>) => Promise<void>;
  /** Add another contact at this company. */
  onAddContact?: (name: string) => Promise<void>;
  onCall: (phone: string, name: string) => void;
  /** Opens the in-app email composer addressed to this contact. */
  onEmail: (email: string, name: string) => void;
  onDnc: (contactId: string, value: boolean) => void | Promise<void>;
  /** Persist edited contact details — drives the per-contact edit (pencil). */
  onContactSave?: (
    contactId: string,
    patch: { name?: string; title?: string; email?: string; phone?: string; linkedinUrl?: string },
  ) => Promise<void>;
  /** The contact whose activity the timeline is currently filtered to (or null). */
  activeContactId?: string | null;
  /** Click a contact to toggle the activity quick-filter to just that person. */
  onContactSelect?: (contactId: string) => void;
  leads: FunnelLead[];
  statuses: LeadStatusOption[];
  /** Per-lead campaign progress (LeadStepTracker), rendered atop the Details tab. */
  stepTracker?: ReactNode;
  /** Read-only hiring roles for a standalone contact (from scraped jobs). */
  seedHiringRoles?: import("@/lib/api/hiring-roles").HiringRole[];
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

type ContactDraft = { name: string; title: string; email: string; phone: string; linkedinUrl: string };

const contactInputClass =
  "w-full bg-surface border border-border-subtle rounded-md px-2 py-1.5 text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default";

function ContactRow({
  c,
  onCall,
  onEmail,
  onDnc,
  onSave,
  active,
  onSelect,
  fallbackLocation,
}: {
  c: FunnelLeadContact;
  onCall: (phone: string, name: string) => void;
  onEmail: (email: string, name: string) => void;
  onDnc?: (contactId: string, value: boolean) => void | Promise<void>;
  /** Persist edited contact details. When provided, an edit (pencil) action shows. */
  onSave?: (
    contactId: string,
    patch: { name?: string; title?: string; email?: string; phone?: string; linkedinUrl?: string },
  ) => Promise<void>;
  /** Highlighted when this contact is the active activity filter. */
  active?: boolean;
  /** Toggle the activity filter to this contact (rendered inside the details). */
  onSelect?: () => void;
  /** Company location, used as a fallback for local time when the phone has no
   *  recognisable prefix. */
  fallbackLocation?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContactDraft>({
    name: c.name,
    title: c.title || "",
    email: c.email || "",
    phone: c.phone || "",
    linkedinUrl: c.linkedinUrl || "",
  });

  function call() {
    if (!c.phone) return;
    if (c.doNotCall && !confirmDncCall(c.name)) return;
    onCall(c.phone, c.name);
  }

  async function applyDnc(value: boolean) {
    if (!onDnc) return;
    setBusy(true);
    try {
      await onDnc(c.id, value);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  function startEdit() {
    setDraft({ name: c.name, title: c.title || "", email: c.email || "", phone: c.phone || "", linkedinUrl: c.linkedinUrl || "" });
    setError(null);
    setEditing(true);
  }

  async function save() {
    if (!onSave) return;
    if (!draft.name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(c.id, {
        name: draft.name.trim(),
        title: draft.title.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        linkedinUrl: draft.linkedinUrl.trim(),
      });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-border-subtle bg-section/40 p-2.5 my-1">
        <div className="flex flex-col gap-1.5">
          <input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Full name" className={contactInputClass} />
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" className={contactInputClass} />
          <input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="Email" className={contactInputClass} />
          <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="Phone" className={contactInputClass} />
          <input value={draft.linkedinUrl} onChange={(e) => setDraft({ ...draft, linkedinUrl: e.target.value })} placeholder="LinkedIn URL" className={contactInputClass} />
        </div>
        {error && <p className="text-[10.5px] text-signal-red-text mt-1.5">{error}</p>}
        <div className="flex items-center justify-end gap-1.5 mt-2">
          <button onClick={() => setEditing(false)} disabled={saving} className="px-2.5 py-1 rounded-full text-[11px] text-ink-muted hover:bg-hover disabled:opacity-50">Cancel</button>
          <button onClick={() => void save()} disabled={saving || !draft.name.trim()} className="flex items-center gap-1 px-3 py-1 rounded-full bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
            Save
          </button>
        </div>
      </div>
    );
  }

  const localTime = c.phone ? localTimeFromPhone(c.phone, fallbackLocation) : null;

  return (
    <div className={cn("rounded-lg transition-colors", active ? "bg-accent/10 ring-1 ring-accent/30" : expanded ? "bg-section/40" : "hover:bg-hover/50")}>
      <div
        className="group flex items-center gap-2.5 py-2 px-1 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
        title="Show contact details"
      >
        <ChevronRight size={13} className={cn("text-ink-faint shrink-0 transition-transform", expanded && "rotate-90")} />
        <div className="w-7 h-7 rounded-full bg-section flex items-center justify-center text-[10px] font-medium text-ink-secondary shrink-0">
          {initials(c.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn("text-[12.5px] font-medium truncate", c.doNotCall ? "text-signal-red-text" : "text-ink")}>
              {c.name}
            </span>
            {c.isPrimary && (
              <span className="text-[9px] font-medium rounded-full px-1.5 py-px bg-signal-slate text-signal-slate-text">
                Primary
              </span>
            )}
            {active && (
              <span className="text-[9px] font-medium rounded-full px-1.5 py-px bg-accent/15 text-accent">
                Filtering
              </span>
            )}
            {c.doNotCall && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full bg-signal-red/15 text-signal-red-text text-[9px] font-semibold uppercase tracking-wide">
                <Ban size={9} strokeWidth={2} /> DNC
              </span>
            )}
          </div>
          {c.title && <div className="text-[11px] text-ink-muted truncate">{c.title}</div>}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          {c.email && (
            <MiniBtn
              icon={Mail}
              title={`Email ${c.email}`}
              onClick={() => onEmail(c.email as string, c.name)}
            />
          )}
          {c.phone && <MiniBtn icon={Phone} title={`Call ${c.phone}`} onClick={call} />}
          {onSave && (
            <button
              type="button"
              onClick={startEdit}
              title="Edit contact"
              className="flex items-center justify-center w-[22px] h-[22px] rounded-md text-ink-muted hover:bg-hover hover:text-ink transition-colors"
            >
              <Pencil size={12} />
            </button>
          )}
          {onDnc && (
            <button
              type="button"
              onClick={() => setConfirming((v) => !v)}
              title={c.doNotCall ? "Remove Do Not Contact" : "Mark Do Not Contact"}
              className={cn(
                "flex items-center justify-center w-[22px] h-[22px] rounded-md transition-colors",
                c.doNotCall
                  ? "bg-signal-red/15 text-signal-red-text"
                  : "text-ink-muted hover:bg-signal-red/10 hover:text-signal-red-text",
              )}
            >
              <Ban size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded per-contact details */}
      {expanded && (
        <div className="ml-[34px] mr-1 mb-2 pb-1 flex flex-col gap-2 text-[12px]">
          <DetailRow icon={Phone} muted={!c.phone}>
            {c.phone ? (
              <button onClick={() => onCall(c.phone as string, c.name)} className="text-ink hover:text-accent transition-colors tabular-nums">
                {formatPhoneIntl(c.phone)}
              </button>
            ) : <span className="text-ink-faint">No phone</span>}
          </DetailRow>
          <DetailRow icon={Mail} muted={!c.email}>
            {c.email ? (
              <button onClick={() => onEmail(c.email as string, c.name)} className="text-ink hover:text-accent transition-colors truncate">
                {c.email}
              </button>
            ) : <span className="text-ink-faint">No email</span>}
          </DetailRow>
          {c.linkedinUrl && (
            <DetailRow icon={Linkedin}>
              <a href={c.linkedinUrl.startsWith("http") ? c.linkedinUrl : `https://www.linkedin.com/in/${c.linkedinUrl}`} target="_blank" rel="noreferrer" className="text-accent hover:underline truncate">
                LinkedIn profile
              </a>
            </DetailRow>
          )}
          <DetailRow icon={Clock} muted={!localTime}>
            {localTime ? (
              <span className="text-ink-secondary">
                Estimated local time: <span className="text-ink font-medium">{localTime.label}</span>
                {(localTime.hour < 8 || localTime.hour >= 20) && <span className="text-ink-faint"> · off hours</span>}
              </span>
            ) : <span className="text-ink-faint">Local time unknown</span>}
          </DetailRow>
          {onSelect && (
            <button
              onClick={onSelect}
              className={cn(
                "inline-flex items-center gap-1.5 self-start mt-0.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                active ? "bg-accent/15 text-accent border-accent/30" : "bg-section text-ink-secondary border-border-subtle hover:bg-hover",
              )}
            >
              <Filter size={11} />
              {active ? "Showing this contact — show all" : "Show only this contact's activity"}
            </button>
          )}
        </div>
      )}

      {confirming && onDnc && (
        <div className="mx-1 mb-2 flex items-center justify-between gap-2 rounded-[8px] bg-signal-red/10 border border-signal-red-text/20 px-2.5 py-2">
          <span className="text-[10px] text-signal-red-text leading-snug">
            {c.doNotCall ? (
              <>Remove the Do Not Contact flag from <strong>{c.name}</strong>?</>
            ) : (
              <>Mark <strong>{c.name}</strong> as Do Not Contact? They stay in the campaign but show red and calls confirm first.</>
            )}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="px-2 py-0.5 rounded-full bg-section text-ink-secondary text-[10px] font-medium hover:bg-hover transition-colors border border-border-subtle disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => applyDnc(!c.doNotCall)}
              disabled={busy}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-signal-red-text text-on-ink text-[10px] font-medium hover:bg-signal-red-text/90 transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 size={9} className="animate-spin" /> : <Ban size={9} />}
              {c.doNotCall ? "Remove DNC" : "Confirm DNC"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, muted, children }: { icon: typeof Phone; muted?: boolean; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon size={13} className={cn("shrink-0", muted ? "text-ink-faint" : "text-ink-muted")} strokeWidth={1.5} />
      <div className="min-w-0 truncate">{children}</div>
    </div>
  );
}

const fieldInputClass =
  "w-full bg-surface border border-border-subtle rounded-md px-2 py-1.5 text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default";

type CompanyDraft = {
  domain: string; industry: string; employeeCount: string;
  location: string; description: string; linkedinUrl: string; annualRevenue: string;
};

function makeCompanyDraft(c: FunnelLeadCompany | null): CompanyDraft {
  return {
    domain: c?.domain || "",
    industry: c?.industry || "",
    employeeCount: c?.employeeCount ? String(c.employeeCount) : "",
    location: c?.address || "",
    description: c?.description || "",
    linkedinUrl: c?.linkedinUrl || "",
    annualRevenue: c?.annualRevenue || "",
  };
}

/** About / company-info panel — read-only by default, with inline edit when a
 *  save handler is provided. Edits fan out to all contacts at this company. */
function AboutSection({ company, onSave }: { company: FunnelLeadCompany | null; onSave?: (patch: CompanyInfoPatch) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CompanyDraft>(() => makeCompanyDraft(company));

  function start() { setDraft(makeCompanyDraft(company)); setError(null); setEditing(true); }

  async function save() {
    if (!onSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        companyDomain: draft.domain.trim(),
        companyIndustry: draft.industry.trim(),
        companyEmployeeCount: draft.employeeCount.trim(),
        companyLocation: draft.location.trim(),
        companyDescription: draft.description.trim(),
        companyLinkedin: draft.linkedinUrl.trim(),
        companyAnnualRevenue: draft.annualRevenue.trim(),
      });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const hasAny = !!(company?.address || company?.domain || company?.industry || company?.description || company?.linkedinUrl || company?.annualRevenue);

  return (
    <Section
      icon={Info}
      title="About"
      actions={onSave && !editing ? <MiniBtn icon={Pencil} title="Edit company info" onClick={start} /> : undefined}
    >
      {editing ? (
        <div className="flex flex-col gap-1.5 pl-1">
          <Labeled label="Website / domain"><input value={draft.domain} onChange={(e) => setDraft({ ...draft, domain: e.target.value })} placeholder="acme.com" className={fieldInputClass} /></Labeled>
          <Labeled label="Industry"><input value={draft.industry} onChange={(e) => setDraft({ ...draft, industry: e.target.value })} placeholder="e.g. SaaS" className={fieldInputClass} /></Labeled>
          <Labeled label="Employees"><input value={draft.employeeCount} onChange={(e) => setDraft({ ...draft, employeeCount: e.target.value.replace(/[^0-9]/g, "") })} inputMode="numeric" placeholder="e.g. 250" className={fieldInputClass} /></Labeled>
          <Labeled label="Annual revenue"><input value={draft.annualRevenue} onChange={(e) => setDraft({ ...draft, annualRevenue: e.target.value })} placeholder="e.g. $10M" className={fieldInputClass} /></Labeled>
          <Labeled label="Location"><input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="e.g. London, UK" className={fieldInputClass} /></Labeled>
          <Labeled label="Company LinkedIn"><input value={draft.linkedinUrl} onChange={(e) => setDraft({ ...draft, linkedinUrl: e.target.value })} placeholder="linkedin.com/company/…" className={fieldInputClass} /></Labeled>
          <Labeled label="Description"><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} placeholder="What does this company do?" className={cn(fieldInputClass, "resize-none")} /></Labeled>
          {error && <p className="text-[10.5px] text-signal-red-text mt-0.5">{error}</p>}
          <div className="flex items-center justify-end gap-1.5 mt-1">
            <button onClick={() => setEditing(false)} disabled={saving} className="px-2.5 py-1 rounded-full text-[11px] text-ink-muted hover:bg-hover disabled:opacity-50">Cancel</button>
            <button onClick={() => void save()} disabled={saving} className="flex items-center gap-1 px-3 py-1 rounded-full bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Save
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 pl-1">
          {company?.address && (
            <div className="flex items-start gap-2">
              <MapPin size={13} className="text-ink-faint mt-0.5 shrink-0" />
              <span className="text-[12.5px] text-ink-secondary">{company.address}</span>
            </div>
          )}
          {company?.domain && (
            <div className="flex items-center gap-2">
              <LinkIcon size={13} className="text-ink-faint shrink-0" />
              <a href={company.website || `https://${company.domain}`} target="_blank" rel="noreferrer" className="text-[12.5px] text-accent hover:underline truncate">{company.domain}</a>
            </div>
          )}
          {company?.industry && (
            <div className="flex items-center gap-2">
              <Building2 size={13} className="text-ink-faint shrink-0" />
              <span className="text-[12.5px] text-ink-secondary">
                {company.industry}
                {company.employeeCount ? ` · ${company.employeeCount.toLocaleString()} employees` : ""}
              </span>
            </div>
          )}
          {company?.annualRevenue && (
            <div className="flex items-center gap-2">
              <DollarSign size={13} className="text-ink-faint shrink-0" />
              <span className="text-[12.5px] text-ink-secondary">{company.annualRevenue}</span>
            </div>
          )}
          {company?.linkedinUrl && (
            <div className="flex items-center gap-2">
              <Linkedin size={13} className="text-ink-faint shrink-0" />
              <a href={company.linkedinUrl.startsWith("http") ? company.linkedinUrl : `https://${company.linkedinUrl}`} target="_blank" rel="noreferrer" className="text-[12.5px] text-accent hover:underline truncate">Company LinkedIn</a>
            </div>
          )}
          {company?.description ? (
            <div className="flex items-start gap-2">
              <AlignLeft size={13} className="text-ink-faint mt-0.5 shrink-0" />
              <p className="text-[12.5px] text-ink-secondary leading-relaxed">{company.description}</p>
            </div>
          ) : (
            !hasAny && <p className="text-[12px] text-ink-faint">No company details yet{onSave ? " — click the pencil to add them." : "."}</p>
          )}
        </div>
      )}
    </Section>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1">{label}</span>
      {children}
    </label>
  );
}

/** Custom-fields panel — editable org-defined fields plus read-only system
 *  fields (Lead Source, notes). */
function CustomFieldsSection({
  fields,
  readOnly,
  onSave,
}: {
  fields: EditableCustomField[];
  readOnly: FunnelLeadCustomField[];
  onSave?: (values: Record<string, string>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const editable = !!onSave && fields.length > 0;
  const filled = fields.filter((f) => f.value);
  const visibleCount = filled.length + readOnly.length;

  function start() {
    const d: Record<string, string> = {};
    for (const f of fields) d[f.key] = f.value;
    setDraft(d);
    setError(null);
    setEditing(true);
  }

  async function save() {
    if (!onSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (visibleCount === 0 && !editable) return null;

  return (
    <Section
      icon={List}
      title="Custom fields"
      count={visibleCount || null}
      actions={editable && !editing ? <MiniBtn icon={Pencil} title="Edit custom fields" onClick={start} /> : undefined}
    >
      {editing ? (
        <div className="flex flex-col gap-1.5 pl-1">
          {fields.map((f) => (
            <Labeled key={f.key} label={f.label}>
              {f.fieldType === "select" ? (
                <select value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} className={fieldInputClass}>
                  <option value="">—</option>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={f.fieldType === "date" ? "date" : f.fieldType === "number" ? "number" : "text"}
                  value={draft[f.key] ?? ""}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  placeholder={f.isLink ? "https://…" : ""}
                  className={fieldInputClass}
                />
              )}
            </Labeled>
          ))}
          {error && <p className="text-[10.5px] text-signal-red-text mt-0.5">{error}</p>}
          <div className="flex items-center justify-end gap-1.5 mt-1">
            <button onClick={() => setEditing(false)} disabled={saving} className="px-2.5 py-1 rounded-full text-[11px] text-ink-muted hover:bg-hover disabled:opacity-50">Cancel</button>
            <button onClick={() => void save()} disabled={saving} className="flex items-center gap-1 px-3 py-1 rounded-full bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Save
            </button>
          </div>
        </div>
      ) : visibleCount === 0 ? (
        <p className="text-[12px] text-ink-faint px-1">No custom fields set{editable ? " — click the pencil to add values." : "."}</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {[...filled.map((f) => ({ label: f.label, value: f.value, isLink: f.isLink })), ...readOnly].map((f, i) => (
            <div key={i} className="flex items-start gap-2.5 py-1.5 px-1">
              <span className="text-[11.5px] text-ink-muted w-[116px] shrink-0">{f.label}</span>
              {f.isLink ? (
                <a href={f.value.startsWith("http") ? f.value : `https://${f.value}`} target="_blank" rel="noreferrer" className="text-[11.5px] text-accent hover:underline truncate min-w-0">{f.value}</a>
              ) : (
                <span className="text-[11.5px] text-ink truncate min-w-0">{f.value}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/** Inline "add another contact" form shown under the Contacts section. */
function AddContactInline({ onAdd, onCancel }: { onAdd: (name: string) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onAdd(name.trim());
      setName("");
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contact");
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-section/40 p-2.5 mt-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") void submit(); if (e.key === "Escape") onCancel(); }}
        placeholder="Contact full name"
        className={fieldInputClass}
      />
      {error && <p className="text-[10.5px] text-signal-red-text mt-1.5">{error}</p>}
      <div className="flex items-center justify-end gap-1.5 mt-2">
        <button onClick={onCancel} disabled={saving} className="px-2.5 py-1 rounded-full text-[11px] text-ink-muted hover:bg-hover disabled:opacity-50">Cancel</button>
        <button onClick={() => void submit()} disabled={saving || !name.trim()} className="flex items-center gap-1 px-3 py-1 rounded-full bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 disabled:opacity-50">
          {saving ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />} Add
        </button>
      </div>
    </div>
  );
}

export function LeadDetailsColumn({
  funnelId,
  leadId,
  company,
  contacts,
  customFields,
  editableCustomFields,
  opportunityId,
  onConvert,
  onOpportunityChanged,
  onCompanySave,
  onCustomFieldsSave,
  onAddContact,
  onCall,
  onEmail,
  onDnc,
  onContactSave,
  activeContactId,
  onContactSelect,
  leads,
  statuses,
  stepTracker,
  seedHiringRoles,
}: LeadDetailsColumnProps) {
  const [tab, setTab] = useState<"details" | "leads">("details");
  const [addingContact, setAddingContact] = useState(false);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tabs */}
      <div className="flex items-center gap-5 px-1 border-b border-border-subtle shrink-0">
        {([
          ["details", "Details"],
          ["leads", `Leads ${leads.length}`],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "text-[13px] font-medium py-3 -mb-px border-b-2 transition-colors",
              tab === id ? "border-accent text-ink" : "border-transparent text-ink-muted hover:text-ink-secondary",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "leads" ? (
        <LeadLeadsList leads={leads} funnelId={funnelId} currentLeadId={leadId} statuses={statuses} />
      ) : (
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {stepTracker && <div className="pt-3">{stepTracker}</div>}

          {/* About — editable company info (fans out to all same-company contacts) */}
          <AboutSection company={company} onSave={onCompanySave} />

          {/* Tasks (real) */}
          <LeadTasksSection funnelId={funnelId} leadId={leadId} />

          {/* Opportunities */}
          <LeadOpportunitySection
            opportunityId={opportunityId}
            onConvert={onConvert}
            onChanged={onOpportunityChanged}
          />

          {/* Contacts */}
          <Section
            icon={Users}
            title="Contacts"
            count={contacts.length}
            actions={onAddContact ? <MiniBtn icon={Plus} title="Add contact" onClick={() => setAddingContact(true)} /> : undefined}
          >
            <div className="flex flex-col">
              {contacts.length ? (
                contacts.map((c) => (
                  <ContactRow
                    key={c.id}
                    c={c}
                    onCall={onCall}
                    onEmail={onEmail}
                    onDnc={onDnc}
                    onSave={onContactSave}
                    active={activeContactId === c.id}
                    onSelect={onContactSelect ? () => onContactSelect(c.id) : undefined}
                    fallbackLocation={company?.address ?? null}
                  />
                ))
              ) : (
                !addingContact && <p className="text-[12px] text-ink-faint px-1">No other contacts at this company.</p>
              )}
              {onAddContact && addingContact && (
                <AddContactInline onAdd={onAddContact} onCancel={() => setAddingContact(false)} />
              )}
            </div>
          </Section>

          {/* Hiring roles — full CRUD (title, salary, location, seniority, …) */}
          <LeadHiringRolesSection funnelId={funnelId} leadId={leadId} seedRoles={seedHiringRoles} />

          {/* Custom fields — editable org-defined values + read-only system fields */}
          <CustomFieldsSection
            fields={editableCustomFields ?? []}
            readOnly={customFields}
            onSave={onCustomFieldsSave}
          />

          <div className="h-6" />
        </div>
      )}
    </div>
  );
}
