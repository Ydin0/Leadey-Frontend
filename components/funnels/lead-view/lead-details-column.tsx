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

interface LeadDetailsColumnProps {
  funnelId: string;
  leadId: string;
  company: FunnelLeadCompany | null;
  contacts: FunnelLeadContact[];
  customFields: FunnelLeadCustomField[];
  opportunityId: string | null;
  onConvert: () => void;
  onOpportunityChanged: () => void;
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

export function LeadDetailsColumn({
  funnelId,
  leadId,
  company,
  contacts,
  customFields,
  opportunityId,
  onConvert,
  onOpportunityChanged,
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

          {/* About */}
          <Section icon={Info} title="About">
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
                  <a
                    href={company.website || `https://${company.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12.5px] text-accent hover:underline truncate"
                  >
                    {company.domain}
                  </a>
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
              {company?.description ? (
                <div className="flex items-start gap-2">
                  <AlignLeft size={13} className="text-ink-faint mt-0.5 shrink-0" />
                  <p className="text-[12.5px] text-ink-secondary leading-relaxed">{company.description}</p>
                </div>
              ) : (
                !company?.address &&
                !company?.domain &&
                !company?.industry && (
                  <p className="text-[12px] text-ink-faint">No company details available.</p>
                )
              )}
            </div>
          </Section>

          {/* Tasks (real) */}
          <LeadTasksSection funnelId={funnelId} leadId={leadId} />

          {/* Opportunities */}
          <LeadOpportunitySection
            opportunityId={opportunityId}
            onConvert={onConvert}
            onChanged={onOpportunityChanged}
          />

          {/* Contacts */}
          <Section icon={Users} title="Contacts" count={contacts.length}>
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
                <p className="text-[12px] text-ink-faint px-1">No other contacts at this company.</p>
              )}
            </div>
          </Section>

          {/* Hiring roles — full CRUD (title, salary, location, seniority, …) */}
          <LeadHiringRolesSection funnelId={funnelId} leadId={leadId} seedRoles={seedHiringRoles} />

          {/* Custom fields */}
          {customFields.length > 0 && (
            <Section icon={List} title="Custom fields" count={customFields.length}>
              <div className="flex flex-col gap-0.5">
                {customFields.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-1.5 px-1">
                    <span className="text-[11.5px] text-ink-muted w-[116px] shrink-0">{f.label}</span>
                    {f.isLink ? (
                      <a
                        href={f.value.startsWith("http") ? f.value : `https://${f.value}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11.5px] text-accent hover:underline truncate min-w-0"
                      >
                        {f.value}
                      </a>
                    ) : (
                      <span className="text-[11.5px] text-ink truncate min-w-0">{f.value}</span>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          <div className="h-6" />
        </div>
      )}
    </div>
  );
}
