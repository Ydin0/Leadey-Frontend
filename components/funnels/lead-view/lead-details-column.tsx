"use client";

import { useState, type ReactNode } from "react";
import { NativeSelect } from "@/components/ui/native-select";
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
  Copy,
  Clock,
  ChevronRight,
  Linkedin,
  Filter,
  Plus,
  X,
  DollarSign,
  Trash2,
  Star,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn, formatPhoneIntl } from "@/lib/utils";
import { localTimeFromPhone } from "@/lib/utils/lead-timezone";
import { confirmDncCall } from "@/lib/utils/dnc";
import type { ContactExtra, FunnelLead } from "@/lib/types/funnel";
import type {
  FunnelLeadCompany,
  FunnelLeadContact,
  FunnelLeadCustomField,
} from "@/lib/types/funnel-focus";
import type { LeadStatusOption } from "@/lib/utils/lead-status";
import { Section, MiniBtn } from "./lead-section";
import { LeadTasksSection } from "./lead-tasks-section";
import { LeadUpcomingMeetingsSection } from "./lead-upcoming-meetings-section";
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
  /** Bumped by the parent after a Magic Enrich to force the hiring-roles refetch. */
  hiringRefreshToken?: number;
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
  /** Switch the profile to another contact (make them the primary/focused). */
  onMakePrimary?: (contactId: string) => void;
  onCall: (phone: string, name: string) => void;
  /** Opens the in-app email composer addressed to this contact. */
  onEmail: (email: string, name: string) => void;
  onDnc: (contactId: string, value: boolean) => void | Promise<void>;
  /** Persist edited contact details — drives the per-contact edit (pencil). */
  onContactSave?: (
    contactId: string,
    patch: {
      name?: string; title?: string; email?: string; phone?: string; linkedinUrl?: string;
      extraEmails?: ContactExtra[]; extraPhones?: ContactExtra[];
    },
  ) => Promise<void>;
  /** Delete a contact (lead row) from this campaign — offered on non-primary
   *  contacts only, behind an inline confirm. */
  onContactDelete?: (contactId: string) => Promise<void>;
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
  /** Bumped after booking a meeting so the Upcoming meetings section refetches. */
  meetingsRefreshKey?: number;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/** One row in the edit form's email/phone lists. `key` is a stable client-only
 *  id for React/dnd-kit — never persisted. */
type DraftEntry = ContactExtra & { key: string };

type ContactDraft = {
  name: string; title: string; linkedinUrl: string;
  /** Ordered lists — index 0 is the PRIMARY value (what dialing/sending use);
   *  the rest are the labeled extras. Drag rows to reorder / change primary. */
  emails: DraftEntry[]; phones: DraftEntry[];
};

let draftKeySeq = 0;
const draftKey = () => `dk_${++draftKeySeq}`;

function makeContactDraft(c: FunnelLeadContact): ContactDraft {
  return {
    name: c.name,
    title: c.title || "",
    linkedinUrl: c.linkedinUrl || "",
    emails: [
      { key: draftKey(), label: "", value: c.email || "" },
      ...(c.extraEmails ?? []).map((e) => ({ ...e, key: draftKey() })),
    ],
    phones: [
      { key: draftKey(), label: "", value: c.phone || "" },
      ...(c.extraPhones ?? []).map((p) => ({ ...p, key: draftKey() })),
    ],
  };
}

const contactInputClass =
  "w-full bg-surface border border-border-subtle rounded-md px-2 py-1.5 text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default";

function ContactRow({
  c,
  onCall,
  onEmail,
  onDnc,
  onSave,
  onDelete,
  onMakePrimary,
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
    patch: {
      name?: string; title?: string; email?: string; phone?: string; linkedinUrl?: string;
      extraEmails?: ContactExtra[]; extraPhones?: ContactExtra[];
    },
  ) => Promise<void>;
  /** Delete this contact from the campaign (non-primary contacts only). */
  onDelete?: (contactId: string) => Promise<void>;
  /** Switch the profile to this contact (make them the primary/focused one). */
  onMakePrimary?: (contactId: string) => void;
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContactDraft>(() => makeContactDraft(c));
  // Drag starts only from each row's grip handle, so the inputs stay usable.
  const dragSensors = useSensors(useSensor(PointerSensor));

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
    setDraft(makeContactDraft(c));
    setError(null);
    setEditing(true);
  }

  async function save() {
    if (!onSave) return;
    if (!draft.name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      // Row 0 of each list is the primary; the rest become the labeled extras.
      const emails = draft.emails.map((e) => ({ label: e.label.trim(), value: e.value.trim() }));
      const phones = draft.phones.map((p) => ({ label: p.label.trim(), value: p.value.trim() }));
      await onSave(c.id, {
        name: draft.name.trim(),
        title: draft.title.trim(),
        linkedinUrl: draft.linkedinUrl.trim(),
        email: emails[0]?.value ?? "",
        phone: phones[0]?.value ?? "",
        extraEmails: emails.slice(1).filter((e) => e.value),
        extraPhones: phones.slice(1).filter((p) => p.value),
      });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function applyDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(c.id);
      // Stay busy — the row disappears when the leads reload.
    } catch {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  function setEntry(kind: "emails" | "phones", index: number, next: DraftEntry) {
    setDraft((d) => ({ ...d, [kind]: d[kind].map((x, i) => (i === index ? next : x)) }));
  }
  function removeEntry(kind: "emails" | "phones", index: number) {
    setDraft((d) => ({ ...d, [kind]: d[kind].filter((_, i) => i !== index) }));
  }
  function addEntry(kind: "emails" | "phones") {
    setDraft((d) => ({ ...d, [kind]: [...d[kind], { key: draftKey(), label: "", value: "" }] }));
  }
  function onDragEnd(kind: "emails" | "phones", event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraft((d) => {
      const list = d[kind];
      const from = list.findIndex((x) => x.key === String(active.id));
      const to = list.findIndex((x) => x.key === String(over.id));
      if (from < 0 || to < 0) return d;
      return { ...d, [kind]: arrayMove(list, from, to) };
    });
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-border-subtle bg-section/40 p-2.5 my-1">
        <div className="flex flex-col gap-1.5">
          <input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Full name" className={contactInputClass} />
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" className={contactInputClass} />

          <span className="text-[9.5px] uppercase tracking-wider text-ink-faint font-medium px-0.5 mt-1">Emails — drag to reorder, top is primary</span>
          <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={(e) => onDragEnd("emails", e)}>
            <SortableContext items={draft.emails.map((x) => x.key)} strategy={verticalListSortingStrategy}>
              {draft.emails.map((entry, i) => (
                <SortableValueRow
                  key={entry.key}
                  entry={entry}
                  isPrimary={i === 0}
                  placeholder={i === 0 ? "Email" : "Additional email"}
                  onChange={(next) => setEntry("emails", i, next)}
                  onRemove={() => removeEntry("emails", i)}
                />
              ))}
            </SortableContext>
          </DndContext>

          <span className="text-[9.5px] uppercase tracking-wider text-ink-faint font-medium px-0.5 mt-1">Phone numbers — drag to reorder, top is primary</span>
          <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={(e) => onDragEnd("phones", e)}>
            <SortableContext items={draft.phones.map((x) => x.key)} strategy={verticalListSortingStrategy}>
              {draft.phones.map((entry, i) => (
                <SortableValueRow
                  key={entry.key}
                  entry={entry}
                  isPrimary={i === 0}
                  placeholder={i === 0 ? "Phone" : "Additional phone"}
                  onChange={(next) => setEntry("phones", i, next)}
                  onRemove={() => removeEntry("phones", i)}
                />
              ))}
            </SortableContext>
          </DndContext>

          <input value={draft.linkedinUrl} onChange={(e) => setDraft({ ...draft, linkedinUrl: e.target.value })} placeholder="LinkedIn URL" className={cn(contactInputClass, "mt-1")} />
          <div className="flex items-center gap-3 mt-0.5 px-0.5">
            <button
              type="button"
              onClick={() => addEntry("emails")}
              className="inline-flex items-center gap-1 text-[10.5px] font-medium text-ink-muted hover:text-ink transition-colors"
            >
              <Plus size={10} /> Add email
            </button>
            <button
              type="button"
              onClick={() => addEntry("phones")}
              className="inline-flex items-center gap-1 text-[10.5px] font-medium text-ink-muted hover:text-ink transition-colors"
            >
              <Plus size={10} /> Add phone
            </button>
          </div>
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
              <span className="text-[9px] font-medium rounded-full px-1.5 py-px bg-accent/15 text-link">
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
          {onMakePrimary && !c.isPrimary && (
            <MiniBtn
              icon={Star}
              title="Make primary contact"
              onClick={() => onMakePrimary(c.id)}
            />
          )}
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
          {onDelete && !c.isPrimary && (
            <button
              type="button"
              onClick={() => setConfirmingDelete((v) => !v)}
              title="Delete contact"
              className="flex items-center justify-center w-[22px] h-[22px] rounded-md text-ink-muted hover:bg-signal-red/10 hover:text-signal-red-text transition-colors"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded per-contact details */}
      {expanded && (
        <div className="ml-[34px] mr-1 mb-2 pb-1 flex flex-col gap-2 text-[12px]">
          <DetailRow icon={Phone} muted={!c.phone} action={c.phone ? <CopyBtn value={c.phone} what="phone number" /> : undefined}>
            {c.phone ? (
              <button onClick={() => onCall(c.phone as string, c.name)} className="text-ink hover:text-accent transition-colors tabular-nums">
                {formatPhoneIntl(c.phone)}
              </button>
            ) : <span className="text-ink-faint">No phone</span>}
          </DetailRow>
          {(c.extraPhones ?? []).map((p, i) => (
            <DetailRow key={`xp-${i}`} icon={Phone} action={<CopyBtn value={p.value} what="phone number" />}>
              <button onClick={() => onCall(p.value, c.name)} className="text-ink hover:text-accent transition-colors tabular-nums">
                {formatPhoneIntl(p.value)}
              </button>
              {p.label && <ExtraLabel text={p.label} />}
            </DetailRow>
          ))}
          <DetailRow icon={Mail} muted={!c.email} action={c.email ? <CopyBtn value={c.email} what="email" /> : undefined}>
            {c.email ? (
              <button onClick={() => onEmail(c.email as string, c.name)} className="text-ink hover:text-accent transition-colors truncate">
                {c.email}
              </button>
            ) : <span className="text-ink-faint">No email</span>}
          </DetailRow>
          {(c.extraEmails ?? []).map((e, i) => (
            <DetailRow key={`xe-${i}`} icon={Mail} action={<CopyBtn value={e.value} what="email" />}>
              <button onClick={() => onEmail(e.value, c.name)} className="text-ink hover:text-accent transition-colors truncate">
                {e.value}
              </button>
              {e.label && <ExtraLabel text={e.label} />}
            </DetailRow>
          ))}
          {c.linkedinUrl && (
            <DetailRow icon={Linkedin}>
              <a href={c.linkedinUrl.startsWith("http") ? c.linkedinUrl : `https://www.linkedin.com/in/${c.linkedinUrl}`} target="_blank" rel="noreferrer" className="text-link hover:underline truncate">
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
                active ? "bg-accent/15 text-link border-accent/30" : "bg-section text-ink-secondary border-border-subtle hover:bg-hover",
              )}
            >
              <Filter size={11} />
              {active ? "Showing this contact — show all" : "Show only this contact's activity"}
            </button>
          )}
        </div>
      )}

      {confirmingDelete && onDelete && (
        <div className="mx-1 mb-2 flex items-center justify-between gap-2 rounded-[8px] bg-signal-red/10 border border-signal-red-text/20 px-2.5 py-2">
          <span className="text-[10px] text-signal-red-text leading-snug">
            Delete <strong>{c.name}</strong> from this campaign? Their activity in this campaign is removed too. This can&apos;t be undone.
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className="px-2 py-0.5 rounded-full bg-section text-ink-secondary text-[10px] font-medium hover:bg-hover transition-colors border border-border-subtle disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => void applyDelete()}
              disabled={deleting}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-signal-red-text text-on-ink text-[10px] font-medium hover:bg-signal-red-text/90 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 size={9} className="animate-spin" /> : <Trash2 size={9} />}
              Delete
            </button>
          </div>
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

/** One draggable email/phone row in the edit form. The list is ordered — the
 *  top row is the primary value (used for calling/sending); dragging another
 *  row to the top promotes it. Drag starts from the grip handle only. */
function SortableValueRow({
  entry,
  isPrimary,
  placeholder,
  onChange,
  onRemove,
}: {
  entry: DraftEntry;
  isPrimary: boolean;
  placeholder: string;
  onChange: (next: DraftEntry) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.key });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-1.5", isDragging && "relative z-10 opacity-60")}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        title="Drag to reorder — the top row is the primary"
        className="flex items-center justify-center w-[16px] h-[22px] rounded text-ink-faint hover:text-ink-muted cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical size={12} />
      </button>
      {isPrimary ? (
        <span
          title="The primary value — what calling and sending use"
          className="w-[84px] shrink-0 text-center text-[9px] font-medium rounded-full px-1.5 py-[3px] bg-signal-slate text-signal-slate-text uppercase tracking-wide"
        >
          Primary
        </span>
      ) : (
        <input
          value={entry.label}
          onChange={(e) => onChange({ ...entry, label: e.target.value })}
          placeholder="Label"
          title='Label, e.g. "Work" or "Personal"'
          className={cn(contactInputClass, "w-[84px] shrink-0")}
        />
      )}
      <input
        value={entry.value}
        onChange={(e) => onChange({ ...entry, value: e.target.value })}
        placeholder={placeholder}
        className={contactInputClass}
      />
      {isPrimary ? (
        <span className="w-[22px] shrink-0" />
      ) : (
        <button
          type="button"
          onClick={onRemove}
          title="Remove"
          className="flex items-center justify-center w-[22px] h-[22px] rounded-md text-ink-faint hover:bg-hover hover:text-signal-red-text transition-colors shrink-0"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

/** Tiny chip naming an additional email/phone (Work, Personal, …). */
function ExtraLabel({ text }: { text: string }) {
  return (
    <span className="ml-1.5 align-middle text-[9px] font-medium rounded-full px-1.5 py-px bg-section text-ink-muted uppercase tracking-wide">
      {text}
    </span>
  );
}

function DetailRow({ icon: Icon, muted, action, children }: { icon: typeof Phone; muted?: boolean; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon size={13} className={cn("shrink-0", muted ? "text-ink-faint" : "text-ink-muted")} strokeWidth={1.5} />
      <div className="min-w-0 flex-1 truncate">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Tiny click-to-copy affordance for contact values (phone, email). */
function CopyBtn({ value, what }: { value: string; what: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={copied ? "Copied!" : `Copy ${what}`}
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={cn(
        "flex items-center justify-center w-[20px] h-[20px] rounded-md transition-colors",
        copied ? "text-signal-green-text" : "text-ink-faint hover:bg-hover hover:text-ink-secondary",
      )}
    >
      {copied ? <Check size={11} strokeWidth={2} /> : <Copy size={11} strokeWidth={1.5} />}
    </button>
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

  const hasAny = !!(company?.address || company?.domain || company?.industry || company?.employeeCount || company?.description || company?.linkedinUrl || company?.annualRevenue);

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
            <div className="flex items-start gap-2 min-w-0">
              <MapPin size={13} className="text-ink-faint mt-0.5 shrink-0" />
              <span className="text-[12.5px] text-ink-secondary min-w-0 [overflow-wrap:anywhere]">{company.address}</span>
            </div>
          )}
          {company?.domain && (
            <div className="flex items-center gap-2">
              <LinkIcon size={13} className="text-ink-muted shrink-0" />
              <a href={company.website || `https://${company.domain}`} target="_blank" rel="noreferrer" className="text-[12.5px] font-medium text-link hover:underline truncate">{company.domain}</a>
            </div>
          )}
          {(company?.industry || company?.employeeCount) && (
            <div className="flex items-center gap-2">
              <Building2 size={13} className="text-ink-muted shrink-0" />
              <span className="text-[12.5px] text-ink-secondary">
                {[
                  company.industry,
                  company.employeeCount ? `${company.employeeCount.toLocaleString()} employees` : "",
                ].filter(Boolean).join(" · ")}
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
              <Linkedin size={13} className="text-ink-muted shrink-0" />
              <a href={company.linkedinUrl.startsWith("http") ? company.linkedinUrl : `https://${company.linkedinUrl}`} target="_blank" rel="noreferrer" className="text-[12.5px] font-medium text-link hover:underline truncate">Company LinkedIn</a>
            </div>
          )}
          {company?.description ? (
            <div className="flex items-start gap-2 min-w-0">
              <AlignLeft size={13} className="text-ink-faint mt-0.5 shrink-0" />
              {/* overflow-wrap:anywhere — imported descriptions can be one giant
                  unbreakable token (form answers joined with underscores), which
                  otherwise can't wrap and overflows the column. */}
              <p className="text-[12.5px] text-ink-secondary leading-relaxed min-w-0 [overflow-wrap:anywhere]">{company.description}</p>
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
                <NativeSelect value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} className={fieldInputClass}>
                  <option value="">—</option>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </NativeSelect>
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
                <a href={f.value.startsWith("http") ? f.value : `https://${f.value}`} target="_blank" rel="noreferrer" className="text-[11.5px] text-link hover:underline min-w-0 break-all">{f.value}</a>
              ) : (
                <span className="text-[11.5px] text-ink min-w-0 break-words whitespace-pre-wrap">{f.value}</span>
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
  hiringRefreshToken,
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
  onContactDelete,
  onMakePrimary,
  activeContactId,
  onContactSelect,
  leads,
  statuses,
  stepTracker,
  seedHiringRoles,
  meetingsRefreshKey,
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
        // overflow-x-hidden: overflow-y-auto alone implies overflow-x auto,
        // so one long unbroken value made the whole column scroll sideways.
        <div className="flex-1 overflow-y-auto overflow-x-hidden -mx-1 px-1">
          {stepTracker && <div className="pt-3">{stepTracker}</div>}

          {/* About — editable company info (fans out to all same-company contacts) */}
          <AboutSection company={company} onSave={onCompanySave} />

          {/* Tasks (real) */}
          <LeadTasksSection funnelId={funnelId} leadId={leadId} />

          {/* Meetings — connected calendars + Calendly, merged with Fathom /
              Fireflies recordings (transcript + AI summary + call scorecard). */}
          <LeadUpcomingMeetingsSection funnelId={funnelId} leadId={leadId} refreshKey={meetingsRefreshKey} />

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
                    onDelete={onContactDelete}
                    onMakePrimary={onMakePrimary}
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
          <LeadHiringRolesSection funnelId={funnelId} leadId={leadId} seedRoles={seedHiringRoles} refreshToken={hiringRefreshToken} />

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
