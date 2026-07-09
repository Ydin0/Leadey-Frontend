"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LeadActionBar } from "./lead-action-bar";
import { LeadDetailsColumn, type EditableCustomField, type CompanyInfoPatch } from "./lead-details-column";
import { LeadTimeline } from "./lead-timeline";
import { LeadStepTracker } from "@/components/funnels/focus/lead-step-tracker";
import { FocusCallControls } from "@/components/funnels/focus/focus-call-controls";
// Heavy overlays load on first use, not with the lead view: the email
// composer alone pulls the whole TipTap editor chain into the chunk.
const EmailComposerDrawer = dynamic(
  () => import("@/components/email/email-composer-drawer").then((m) => m.EmailComposerDrawer),
  { ssr: false },
);
const SmsThreadDrawer = dynamic(
  () => import("@/components/sms/sms-thread-drawer").then((m) => m.SmsThreadDrawer),
  { ssr: false },
);
const WhatsappThreadDrawer = dynamic(
  () => import("@/components/whatsapp/whatsapp-thread-drawer").then((m) => m.WhatsappThreadDrawer),
  { ssr: false },
);
const ConvertToOpportunityModal = dynamic(
  () => import("@/components/opportunities/convert-to-opportunity-modal").then((m) => m.ConvertToOpportunityModal),
  { ssr: false },
);
import { mapEventsToActivities } from "@/lib/utils/lead-activity";
import { recordRecentLead } from "@/lib/recent-leads";
import { updateLeadStatus, advanceLead, logLeadNote, updateLeadNote, deleteLeadNote, markLeadDnc, updateLeadContact, deleteLeadFromFunnel, updateLeadCompanyInfo, setLeadCustomFieldValues, createLeadInFunnel, type ContactEditPatch } from "@/lib/api/funnels";
import { useCustomFields } from "@/lib/hooks/use-custom-fields";
import { getCallRecords } from "@/lib/api/phone-lines";
import { getLeadEmailThread, type LeadEmailMessage } from "@/lib/api/email";
import type { EmailReplyMode } from "./email-activity-card";
import { confirmDncCall } from "@/lib/utils/dnc";
import { useLeadStatuses } from "@/lib/hooks/use-lead-statuses";
import { usePrefetchFunnel } from "@/lib/queries/use-prefetch";
import { useCallContext } from "@/components/calling/call-context";
import { useDialerContext } from "@/components/dialer/context/dialer-context";
import type { Funnel, FunnelLead, FunnelStep, FunnelLeadEvent } from "@/lib/types/funnel";
import type {
  FunnelLeadActivity,
  FunnelLeadCompany,
  FunnelLeadCustomField,
  NoteAttachment,
} from "@/lib/types/funnel-focus";
import type { CallRecord } from "@/lib/types/calling";

interface LeadViewProps {
  funnel: Funnel;
  leads: FunnelLead[];
  leadId: string;
  onLeadPatch?: (leadId: string, patch: Partial<FunnelLead>) => void;
  onLeadsChanged?: () => void;
  /** Read-only hiring roles for a standalone (non-campaign) contact — derived
   *  from the company's scraped jobs. When set, the Hiring roles section shows
   *  these instead of fetching per-lead roles. */
  seedHiringRoles?: import("@/lib/api/hiring-roles").HiringRole[];
}

const TERMINAL_OUTCOMES = new Set(["replied", "bounced", "completed"]);

interface ProgressOverride {
  currentStep: number;
  status: string;
  events: FunnelLeadEvent[];
}

export function LeadView({ funnel, leads, leadId, onLeadPatch, onLeadsChanged, seedHiringRoles }: LeadViewProps) {
  const steps = funnel.steps;
  const funnelId = funnel.id;
  const router = useRouter();
  const { statuses } = useLeadStatuses();
  const { fields: customFieldDefs } = useCustomFields();
  const { startCall, lastEndedCall } = useCallContext();
  const { pauseForEngagement } = useDialerContext();

  const [statusOverride, setStatusOverride] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Record<string, ProgressOverride>>({});
  const [extraActivities, setExtraActivities] = useState<Record<string, FunnelLeadActivity[]>>({});
  // Local note edit/delete overlays applied on top of the merged timeline so
  // edits/deletes reflect instantly without a full refetch.
  const [editedNotes, setEditedNotes] = useState<Record<string, string>>({});
  const [deletedNotes, setDeletedNotes] = useState<Set<string>>(new Set());
  const [advancing, setAdvancing] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showSms, setShowSms] = useState(false);
  const [showWhatsapp, setShowWhatsapp] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showConvert, setShowConvert] = useState(false);
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [emailMessages, setEmailMessages] = useState<LeadEmailMessage[]>([]);
  const [emailContact, setEmailContact] = useState<Record<string, string>>({});
  const [replyPrefill, setReplyPrefill] = useState<{ to: string; subject: string; body: string } | null>(null);
  // Quick filter — when set, the timeline narrows to a single contact's activity
  // (click a contact in the sidebar). Null = show the whole company's activity.
  const [contactFilter, setContactFilter] = useState<string | null>(null);

  const currentLead = useMemo(() => leads.find((l) => l.id === leadId) || null, [leads, leadId]);

  // Remember visited leads for the global-search empty state (client-only).
  useEffect(() => {
    if (!currentLead) return;
    recordRecentLead({
      leadId: currentLead.id,
      funnelId,
      name: currentLead.name,
      company: currentLead.company,
      domain: currentLead.companyDomain,
    });
  }, [funnelId, currentLead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // All contacts (lead rows) of the focused lead's company. The lead profile is
  // a company view, so its activity aggregates across ALL of these — not just
  // the clicked contact. Falls back to the single lead when it has no company.
  const companyLeadIds = useMemo(() => {
    if (!currentLead) return [] as string[];
    const key = (currentLead.company || "").trim().toLowerCase();
    if (!key) return [currentLead.id];
    return leads.filter((l) => (l.company || "").trim().toLowerCase() === key).map((l) => l.id);
  }, [leads, currentLead]);
  const companyLeadIdsKey = companyLeadIds.join(",");

  // Reset the per-contact filter whenever we move to a different lead/company.
  useEffect(() => { setContactFilter(null); }, [companyLeadIdsKey]);

  // ── Prev / next navigation — by COMPANY, not by individual contact ──
  // The lead view shows a company with all its contacts, so several leads map
  // to one card. Navigation walks distinct companies (landing on each one's
  // first lead in sorted order) instead of cycling through every contact of the
  // same company. Built once over a stable, deduped ordering.
  const companyNav = useMemo(() => {
    const reps: string[] = []; // representative leadId per company, in order
    const keyToGroup = new Map<string, number>();
    const groupByLeadId = new Map<string, number>();
    for (const l of leads) {
      const key = (l.company || "").trim().toLowerCase() || `__lead_${l.id}`;
      let gi = keyToGroup.get(key);
      if (gi === undefined) {
        gi = reps.length;
        reps.push(l.id);
        keyToGroup.set(key, gi);
      }
      groupByLeadId.set(l.id, gi);
    }
    return { reps, groupByLeadId };
  }, [leads]);
  const currentIndex = companyNav.groupByLeadId.get(leadId) ?? -1;
  const prevId = currentIndex > 0 ? companyNav.reps[currentIndex - 1] : null;
  const nextId = currentIndex >= 0 && currentIndex < companyNav.reps.length - 1 ? companyNav.reps[currentIndex + 1] : null;

  // One navigation per intent: a lock blocks key auto-repeat / rapid clicks
  // from skipping several leads at once. It releases when the new lead mounts.
  const navLockRef = useRef(false);
  useEffect(() => { navLockRef.current = false; }, [leadId]);
  const goToLeadId = useCallback(
    (id: string | null) => {
      if (!id || id === leadId || navLockRef.current) return;
      navLockRef.current = true;
      // Preserve the query (?from=opportunities keeps the back button pointed
      // at the pipeline across prev/next). scroll:false keeps the viewport
      // steady so prev/next feels instant.
      const search = typeof window !== "undefined" ? window.location.search : "";
      router.push(`/dashboard/funnels/${funnelId}/leads/${id}${search}`, { scroll: false });
    },
    [router, funnelId, leadId],
  );

  // Warm the prev/next leads' data during idle time — hover isn't enough for
  // arrow-key navigation, so rapid prev/next always hits a warm cache.
  const prefetchFunnel = usePrefetchFunnel();
  useEffect(() => {
    const warm = () => {
      if (nextId) prefetchFunnel(funnelId, { fullLeadId: nextId });
      if (prevId) prefetchFunnel(funnelId, { fullLeadId: prevId });
    };
    const idle = typeof requestIdleCallback === "function"
      ? requestIdleCallback(warm, { timeout: 1500 })
      : setTimeout(warm, 300);
    return () => {
      if (typeof cancelIdleCallback === "function" && typeof idle === "number") cancelIdleCallback(idle);
      else clearTimeout(idle as ReturnType<typeof setTimeout>);
    };
  }, [funnelId, prevId, nextId, prefetchFunnel]);

  // ── Real call records across ALL company contacts (audio + AI summary) ──
  // Each record is stamped with the contact we fetched it under so the quick
  // filter can narrow by contact; merged + deduped by record id.
  const reloadCalls = useCallback(async () => {
    if (!companyLeadIds.length) { setCallRecords([]); return; }
    try {
      const results = await Promise.all(
        companyLeadIds.map((id) =>
          getCallRecords({ leadId: id, limit: 50 })
            .then((r) => r.data.map((rec) => ({ ...rec, leadId: id })))
            .catch(() => [] as CallRecord[]),
        ),
      );
      const seen = new Set<string>();
      setCallRecords(results.flat().filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true))));
    } catch (err) {
      console.error("Failed to load call records:", err);
    }
  }, [companyLeadIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void reloadCalls();
  }, [reloadCalls]);

  // ── Real email threads across ALL company contacts (rich timeline cards) ──
  const reloadEmails = useCallback(async () => {
    if (!companyLeadIds.length) { setEmailMessages([]); setEmailContact({}); return; }
    try {
      const results = await Promise.all(
        companyLeadIds.map((id) =>
          getLeadEmailThread(funnelId, id).then((msgs) => ({ id, msgs })).catch(() => ({ id, msgs: [] as LeadEmailMessage[] })),
        ),
      );
      const merged: LeadEmailMessage[] = [];
      const map: Record<string, string> = {};
      const seen = new Set<string>();
      for (const { id, msgs } of results) {
        for (const m of msgs) {
          if (seen.has(m.id)) continue;
          seen.add(m.id);
          merged.push(m);
          map[m.id] = id;
        }
      }
      setEmailMessages(merged);
      setEmailContact(map);
    } catch {
      // no threads / not emailable yet — leave empty
    }
  }, [funnelId, companyLeadIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void reloadEmails();
  }, [reloadEmails]);

  // Refetch shortly after a call against any of this company's contacts ends.
  useEffect(() => {
    if (!lastEndedCall?.leadId || !companyLeadIds.includes(lastEndedCall.leadId)) return;
    const t = setTimeout(() => void reloadCalls(), 1500);
    return () => clearTimeout(t);
  }, [lastEndedCall, companyLeadIdsKey, reloadCalls]); // eslint-disable-line react-hooks/exhaustive-deps

  // ← / → arrow keys jump between leads — ignored while typing or with a
  // modal/composer open. The handler reads the latest prev/next from a ref
  // (never a stale closure) and ignores key auto-repeat so holding a key can't
  // fly through the list.
  const navRef = useRef<{ prevId: string | null; nextId: string | null; blocked: boolean }>({ prevId, nextId, blocked: false });
  navRef.current = { prevId, nextId, blocked: showComposer || showSms || showWhatsapp || noteOpen || showConvert };
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.repeat) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const { prevId, nextId, blocked } = navRef.current;
      if (blocked) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) {
        return;
      }
      e.preventDefault();
      goToLeadId(e.key === "ArrowLeft" ? prevId : nextId);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToLeadId]);

  const leadProgress = currentLead ? progress[currentLead.id] : undefined;
  const currentStatus = currentLead
    ? statusOverride[currentLead.id] ?? leadProgress?.status ?? currentLead.status
    : "new";
  const effectiveStep = currentLead ? leadProgress?.currentStep ?? currentLead.currentStep : 1;
  const effectiveEvents = currentLead ? leadProgress?.events ?? currentLead.events ?? [] : [];
  const currentStepDef = steps[Math.min(Math.max(effectiveStep - 1, 0), Math.max(steps.length - 1, 0))];

  const currentDomain = currentLead
    ? currentLead.companyDomain || currentLead.email?.split("@")[1] || ""
    : "";

  const companyFirstLead = useMemo(() => {
    if (!currentLead) return null;
    return leads.find((l) => l.company === currentLead.company) || currentLead;
  }, [leads, currentLead]);

  const companyContacts = useMemo(() => {
    if (!currentLead) return [];
    return leads
      .filter((l) => l.company === currentLead.company)
      .map((l) => ({
        id: l.id,
        name: l.name,
        title: l.title,
        email: l.email || null,
        phone: l.phone || null,
        extraEmails: l.extraEmails ?? [],
        extraPhones: l.extraPhones ?? [],
        linkedinUrl: l.linkedinUrl || null,
        isPrimary: l.id === currentLead.id,
        doNotCall: l.doNotCall,
      }));
  }, [leads, currentLead]);

  const realCompany = useMemo<FunnelLeadCompany | null>(() => {
    // Prefer the current lead — in a lite load it's the only one with the full
    // company description / fields; the other contacts come back light.
    const l = currentLead || companyFirstLead;
    if (!l) return null;
    const domain = l.companyDomain || (l.email?.includes("@") ? l.email.split("@")[1] : "") || "";
    return {
      name: l.company,
      domain,
      website: domain ? `https://${domain}` : null,
      address: l.companyLocation || null,
      description: l.companyDescription || null,
      industry: l.companyIndustry || "",
      employeeCount: l.companyEmployeeCount ?? 0,
      linkedinUrl: l.companyLinkedin || null,
      annualRevenue: l.companyAnnualRevenue || null,
    };
  }, [companyFirstLead, currentLead]);

  // Org-defined custom fields, merged with this lead's values so empty fields
  // still appear (and can be filled in). Carries the key needed to persist.
  const editableCustomFields = useMemo<EditableCustomField[]>(() => {
    const l = currentLead;
    if (!l) return [];
    const byKey = new Map((l.customFields ?? []).map((f) => [f.key, f]));
    return customFieldDefs.map((def) => ({
      key: def.key,
      label: def.label,
      value: byKey.get(def.key)?.value ?? "",
      fieldType: def.fieldType,
      options: def.options,
      isLink: def.fieldType === "url",
    }));
  }, [currentLead, customFieldDefs]);

  // Read-only system fields shown beneath the editable ones (company LinkedIn /
  // revenue now live in the editable About section).
  const readOnlyFields = useMemo<FunnelLeadCustomField[]>(() => {
    const l = currentLead;
    if (!l) return [];
    const fields: FunnelLeadCustomField[] = [];
    if (l.source) fields.push({ label: "Lead Source", value: l.source });
    if (l.notes) {
      for (const [k, v] of Object.entries(l.notes)) {
        if (v) fields.push({ label: k, value: String(v) });
      }
    }
    return fields;
  }, [currentLead]);

  const primaryPhone = currentLead?.phone || companyContacts.find((c) => c.phone)?.phone || "";

  function logActivity(id: string, activity: FunnelLeadActivity) {
    setExtraActivities((prev) => ({ ...prev, [id]: [activity, ...(prev[id] ?? [])] }));
  }

  const handleStatusChange = useCallback(
    (status: string) => {
      if (!currentLead) return;
      const id = currentLead.id;
      const previous = statusOverride[id] ?? currentLead.status;
      setStatusOverride((prev) => ({ ...prev, [id]: status }));
      updateLeadStatus(funnelId, id, status)
        .then(() => onLeadPatch?.(id, { status }))
        .catch(() => setStatusOverride((prev) => ({ ...prev, [id]: previous })));
    },
    [currentLead, funnelId, statusOverride, onLeadPatch],
  );

  const completeStep = useCallback(
    (outcome: string) => {
      if (!currentLead) return;
      const id = currentLead.id;
      const total = currentLead.totalSteps;
      const baseStep = progress[id]?.currentStep ?? currentLead.currentStep;
      const baseEvents = progress[id]?.events ?? currentLead.events ?? [];
      const stepIdx = Math.min(Math.max(baseStep - 1, 0), Math.max(total - 1, 0));
      const isTerminal = TERMINAL_OUTCOMES.has(outcome);
      const completingLast = stepIdx >= total - 1;
      const newStep = isTerminal ? baseStep : Math.min(baseStep + 1, total);
      const newStatus = isTerminal ? outcome : completingLast ? "completed" : currentStatus;

      const newEvent: FunnelLeadEvent = {
        id: `ev_${Date.now()}`,
        type: "step_outcome",
        outcome,
        stepIndex: stepIdx,
        meta: { manual: true },
        timestamp: new Date(),
      };

      setProgress((prev) => ({
        ...prev,
        [id]: { currentStep: newStep, status: newStatus, events: [...baseEvents, newEvent] },
      }));
      if (newStatus !== currentStatus) setStatusOverride((prev) => ({ ...prev, [id]: newStatus }));

      setAdvancing(true);
      advanceLead(funnelId, id, outcome)
        .then(() => onLeadPatch?.(id, { currentStep: newStep, status: newStatus }))
        .catch(() => {
          setProgress((prev) => ({
            ...prev,
            [id]: { currentStep: baseStep, status: currentStatus, events: baseEvents },
          }));
        })
        .finally(() => setAdvancing(false));
    },
    [currentLead, funnelId, progress, currentStatus, onLeadPatch],
  );

  const dial = useCallback(
    (phone?: string, contactName?: string) => {
      const num = (phone || primaryPhone || "").trim();
      if (num)
        void startCall(num, {
          contactName: contactName || currentLead?.name || null,
          companyName: currentLead?.company || null,
          leadId: currentLead?.id || null,
          funnelId,
        });
    },
    [primaryPhone, currentLead, funnelId, startCall],
  );

  function dialPrimary() {
    if (currentLead?.doNotCall && !confirmDncCall(currentLead.name)) return;
    dial();
  }

  function handleCompleteStep(step: FunnelStep) {
    if (!currentLead) return;
    if (step.channel === "email") {
      setShowComposer(true);
      return;
    }
    if (step.channel === "call") dialPrimary();
    const verb =
      step.channel === "call" ? "Call logged" : step.channel === "linkedin" ? "LinkedIn message sent" : "Message sent";
    logActivity(currentLead.id, {
      id: `act_${Date.now()}`,
      type: step.channel === "call" ? "call" : "linkedin",
      summary: verb,
      detail: step.label || undefined,
      timestamp: new Date(),
      userInitials: "You",
    });
    completeStep("sent");
  }

  function handleEmailSent() {
    if (!currentLead) return;
    // Pull the freshly-sent email into the timeline as a rich card.
    void reloadEmails();
    setReplyPrefill(null);
    if (currentStepDef?.channel === "email") completeStep("sent");
  }

  // Reply / reply-all / forward from an email card → open the composer prefilled
  // (lead-scoped, so all three compose back to this lead's address).
  const handleReplyEmail = useCallback((message: LeadEmailMessage, mode: EmailReplyMode) => {
    const base = message.subject.replace(/^(re|fwd):\s*/i, "");
    const subject = mode === "forward" ? `Fwd: ${base}` : `Re: ${base}`;
    // Forward → blank recipient (type a new address). Reply → the other party:
    // the sender for an inbound reply, else the address we sent to.
    const to =
      mode === "forward" ? "" : message.direction === "inbound" ? message.fromEmail : message.toEmail;
    const quoted = `<br/><br/><blockquote>On ${new Date(message.createdAt).toLocaleString()}, ${message.fromName || message.fromEmail} wrote:<br/>${message.bodyHtml || message.bodyText}</blockquote>`;
    setReplyPrefill({ to, subject, body: quoted });
    setShowComposer(true);
  }, []);

  function addNote(text: string, attachments?: NoteAttachment[]) {
    if (!currentLead) return;
    const clean = text.trim();
    if (!clean && !attachments?.length) return;
    const leadIdLocal = currentLead.id;
    const tmpId = `tmp_${Date.now()}`;
    // Optimistic — show immediately, then persist as a real lead event so it
    // survives a reload. On success, swap the temp id for the real event id so
    // edit/delete target the backend row.
    logActivity(leadIdLocal, {
      id: tmpId,
      type: "note",
      summary: clean,
      timestamp: new Date(),
      userInitials: "You",
      attachments: attachments?.length ? attachments : undefined,
    });
    void logLeadNote(funnelId, leadIdLocal, clean, attachments?.map((a) => a.id))
      .then((res) => {
        if (res?.id) {
          setExtraActivities((prev) => ({
            ...prev,
            [leadIdLocal]: (prev[leadIdLocal] ?? []).map((a) =>
              a.id === tmpId ? { ...a, id: res.id } : a,
            ),
          }));
        }
      })
      .catch((err) => console.error("Failed to save note:", err));
  }

  function editNote(activityId: string, text: string) {
    if (!currentLead || !text.trim()) return;
    const clean = text.trim();
    // Reflect locally in both session items and persisted-event overlay.
    setExtraActivities((prev) => ({
      ...prev,
      [currentLead.id]: (prev[currentLead.id] ?? []).map((a) =>
        a.id === activityId ? { ...a, summary: clean } : a,
      ),
    }));
    setEditedNotes((prev) => ({ ...prev, [activityId]: clean }));
    if (!activityId.startsWith("tmp_")) {
      void updateLeadNote(funnelId, currentLead.id, activityId, clean).catch((err) =>
        console.error("Failed to edit note:", err),
      );
    }
  }

  function deleteNote(activityId: string) {
    if (!currentLead) return;
    setExtraActivities((prev) => ({
      ...prev,
      [currentLead.id]: (prev[currentLead.id] ?? []).filter((a) => a.id !== activityId),
    }));
    setDeletedNotes((prev) => new Set(prev).add(activityId));
    if (!activityId.startsWith("tmp_")) {
      void deleteLeadNote(funnelId, currentLead.id, activityId).catch((err) =>
        console.error("Failed to delete note:", err),
      );
    }
  }

  async function handleDnc(contactId: string, value: boolean) {
    try {
      await markLeadDnc(funnelId, contactId, value);
    } catch (err) {
      console.error("Failed to toggle DNC:", err);
    } finally {
      onLeadsChanged?.();
    }
  }

  // Save edited contact details (name / title / email / phone / LinkedIn).
  // Updates the lead in place so the change shows instantly. Throws on failure
  // so the edit form can surface the error.
  const handleContactSave = useCallback(async (contactId: string, patch: ContactEditPatch) => {
    const res = await updateLeadContact(funnelId, contactId, patch);
    onLeadPatch?.(contactId, {
      name: res.name,
      title: res.title,
      email: res.email,
      phone: res.phone,
      linkedinUrl: res.linkedinUrl,
      extraEmails: res.extraEmails ?? [],
      extraPhones: res.extraPhones ?? [],
    });
  }, [funnelId, onLeadPatch]);

  // Delete a contact (sibling lead row) from this campaign. Only offered on
  // non-primary contacts, so the currently-viewed lead can't vanish from
  // under the profile.
  const handleContactDelete = useCallback(async (contactId: string) => {
    await deleteLeadFromFunnel(funnelId, contactId);
    // Drop a now-stale activity quick-filter pointing at the deleted contact.
    setContactFilter((prev) => (prev === contactId ? null : prev));
    onLeadsChanged?.();
  }, [funnelId, onLeadsChanged]);

  // Save company / About info — fans out to every contact at this company in
  // the funnel (handled server-side). Reload so the change shows everywhere.
  const handleCompanySave = useCallback(async (patch: CompanyInfoPatch) => {
    if (!currentLead) return;
    await updateLeadCompanyInfo(funnelId, currentLead.id, patch);
    onLeadsChanged?.();
  }, [funnelId, currentLead, onLeadsChanged]);

  // Rename the company (fans out to every contact at this company).
  const handleRenameCompany = useCallback(async (name: string) => {
    if (!currentLead) return;
    await updateLeadCompanyInfo(funnelId, currentLead.id, { company: name });
    onLeadsChanged?.();
  }, [funnelId, currentLead, onLeadsChanged]);

  // Save this lead's custom-field values (keyed by field key).
  const handleCustomFieldsSave = useCallback(async (values: Record<string, string>) => {
    if (!currentLead) return;
    await setLeadCustomFieldValues(funnelId, currentLead.id, values);
    onLeadsChanged?.();
  }, [funnelId, currentLead, onLeadsChanged]);

  // Add another contact at this company (a sibling lead row).
  const handleAddContact = useCallback(async (name: string) => {
    if (!currentLead) return;
    await createLeadInFunnel(funnelId, { name, company: currentLead.company });
    onLeadsChanged?.();
  }, [funnelId, currentLead, onLeadsChanged]);

  if (!currentLead) {
    return (
      <div className="rounded-[14px] border border-border-subtle bg-surface p-6">
        <p className="text-[12px] text-ink-muted">Lead not found in this campaign.</p>
      </div>
    );
  }

  // Timeline aggregates the WHOLE company: session items + real backend events
  // for EVERY contact (calls come from the call records instead, so drop
  // event-derived "call" rows). Each item is tagged with its contact so the
  // quick filter can narrow by person. Apply note edit/delete overlays, dedupe
  // by id, then apply the active contact filter.
  const seenActivityIds = new Set<string>();
  const timelineActivities = companyContacts
    .flatMap((c) => {
      const lead = leads.find((l) => l.id === c.id);
      return [
        ...(extraActivities[c.id] ?? []),
        ...mapEventsToActivities(lead?.events ?? []),
      ].map((a) => ({ ...a, contactId: c.id, contactName: c.name }));
    })
    .filter((a) => a.type !== "call")
    .filter((a) => !deletedNotes.has(a.id))
    .filter((a) => {
      if (seenActivityIds.has(a.id)) return false;
      seenActivityIds.add(a.id);
      return true;
    })
    .filter((a) => !contactFilter || a.contactId === contactFilter)
    .map((a) => (editedNotes[a.id] ? { ...a, summary: editedNotes[a.id] } : a));

  // Calls + emails narrowed to the active contact (when filtering).
  const visibleCalls = contactFilter ? callRecords.filter((r) => r.leadId === contactFilter) : callRecords;
  const visibleEmails = contactFilter ? emailMessages.filter((m) => emailContact[m.id] === contactFilter) : emailMessages;
  const filterContactName = contactFilter
    ? companyContacts.find((c) => c.id === contactFilter)?.name ?? null
    : null;
  const toggleContactFilter = (id: string) => setContactFilter((prev) => (prev === id ? null : id));

  return (
    <div className="-m-6 h-[calc(100%+3rem)] flex flex-col bg-page">
      <LeadActionBar
        funnelId={funnelId}
        leadId={currentLead.id}
        companyName={currentLead.company}
        companyDomain={currentDomain}
        campaignName={funnel.name}
        campaignStatus={funnel.status}
        status={currentStatus}
        statuses={statuses}
        doNotCall={currentLead.doNotCall}
        onStatusChange={handleStatusChange}
        onRenameCompany={handleRenameCompany}
        onNote={() => { pauseForEngagement(); setNoteOpen(true); }}
        onEmail={() => { pauseForEngagement(); setShowComposer(true); }}
        onSms={() => { pauseForEngagement(); setShowSms(true); }}
        onWhatsapp={() => { pauseForEngagement(); setShowWhatsapp(true); }}
        onCall={dialPrimary}
      />

      <div className="px-6 pt-3 shrink-0">
        <FocusCallControls funnelId={funnelId} />
      </div>

      <div className="flex flex-1 min-h-0">
        <aside className="w-[364px] shrink-0 border-r border-border-subtle px-[18px] overflow-hidden">
          <LeadDetailsColumn
            funnelId={funnelId}
            leadId={currentLead.id}
            company={realCompany}
            contacts={companyContacts}
            customFields={readOnlyFields}
            editableCustomFields={editableCustomFields}
            opportunityId={currentLead.opportunityId ?? null}
            onConvert={() => { pauseForEngagement(); setShowConvert(true); }}
            onOpportunityChanged={() => onLeadsChanged?.()}
            onCall={(phone, name) => dial(phone, name)}
            onEmail={(email) => { pauseForEngagement(); setReplyPrefill({ to: email, subject: "", body: "" }); setShowComposer(true); }}
            onDnc={handleDnc}
            onContactSave={handleContactSave}
            onContactDelete={handleContactDelete}
            onCompanySave={handleCompanySave}
            onCustomFieldsSave={handleCustomFieldsSave}
            onAddContact={handleAddContact}
            activeContactId={contactFilter}
            onContactSelect={toggleContactFilter}
            leads={leads}
            statuses={statuses}
            seedHiringRoles={seedHiringRoles}
            stepTracker={
              steps.length > 0 ? (
                <LeadStepTracker
                  steps={steps}
                  currentStep={effectiveStep}
                  totalSteps={currentLead.totalSteps}
                  status={currentStatus}
                  events={effectiveEvents}
                  onCompleteStep={handleCompleteStep}
                  busy={advancing}
                />
              ) : null
            }
          />
        </aside>

        <section className="flex-1 min-w-0">
          <LeadTimeline
            activities={timelineActivities}
            callRecords={visibleCalls}
            emailMessages={visibleEmails}
            funnelId={funnelId}
            leadId={leadId}
            onAddNote={addNote}
            onEditNote={editNote}
            onDeleteNote={deleteNote}
            onReplyEmail={handleReplyEmail}
            filterContactName={filterContactName}
            onClearFilter={() => setContactFilter(null)}
          />
        </section>
      </div>

      {/* Prev / next lead navigation — bottom right (also ← / → keys) */}
      {companyNav.reps.length > 1 && currentIndex >= 0 && (
        <div className="fixed bottom-6 right-[5.5rem] z-30 flex items-center gap-1 rounded-full bg-surface border border-border-default shadow-xl px-1.5 py-1.5">
          <button
            onClick={() => goToLeadId(prevId)}
            disabled={!prevId}
            title="Previous lead (←)"
            className="flex items-center justify-center w-8 h-8 rounded-full text-ink-secondary hover:bg-hover transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <span className="text-[11px] text-ink-muted tabular-nums px-1.5 select-none">
            {currentIndex + 1} / {companyNav.reps.length}
          </span>
          <button
            onClick={() => goToLeadId(nextId)}
            disabled={!nextId}
            title="Next lead (→)"
            className="flex items-center justify-center w-8 h-8 rounded-full text-ink-secondary hover:bg-hover transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* SMS thread — mounted (and its chunk loaded) only when opened. */}
      {showSms && (
      <SmsThreadDrawer
        open={showSms}
        onClose={() => setShowSms(false)}
        channelFilter="sms"
        funnelId={funnelId}
        leadId={currentLead.id}
        leadName={currentLead.name}
        leadPhone={primaryPhone || null}
        lead={{
          name: currentLead.name,
          company: currentLead.company,
          title: currentLead.title,
          email: currentLead.email,
          companyDomain: currentLead.companyDomain,
        }}
        onSent={() => onLeadsChanged?.()}
      />
      )}

      {showWhatsapp && (
      <WhatsappThreadDrawer
        open={showWhatsapp}
        onClose={() => setShowWhatsapp(false)}
        funnelId={funnelId}
        leadId={currentLead.id}
        leadName={currentLead.name}
        leadPhone={primaryPhone || null}
        lead={{
          name: currentLead.name,
          company: currentLead.company,
          title: currentLead.title,
          email: currentLead.email,
          companyDomain: currentLead.companyDomain,
        }}
        onSent={() => onLeadsChanged?.()}
      />
      )}

      {/* Email composer — mounted only when opened (defers the TipTap chunk). */}
      {showComposer && (
      <EmailComposerDrawer
        open={showComposer}
        onClose={() => { setShowComposer(false); setReplyPrefill(null); }}
        initialSubject={replyPrefill?.subject}
        initialBody={replyPrefill?.body}
        initialTo={replyPrefill?.to}
        lead={{
          id: currentLead.id,
          name: currentLead.name,
          firstName: currentLead.firstName,
          lastName: currentLead.lastName,
          email: currentLead.email,
          company: currentLead.company,
          title: currentLead.title,
          companyDomain: currentLead.companyDomain,
        }}
        funnelId={funnelId}
        stepIndex={currentStepDef?.channel === "email" ? effectiveStep - 1 : null}
        onSent={handleEmailSent}
      />
      )}

      {/* Convert modal */}
      {showConvert && (
        <ConvertToOpportunityModal
          leadId={currentLead.id}
          defaultName={currentLead.company || currentLead.name}
          onClose={() => setShowConvert(false)}
          onConverted={() => onLeadsChanged?.()}
        />
      )}

      {/* Note modal */}
      {noteOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" onClick={() => setNoteOpen(false)} />
          <div className="relative w-full max-w-md bg-surface rounded-[14px] border border-border-subtle shadow-2xl p-5">
            <h3 className="text-[13px] font-semibold text-ink mb-3">Add a note</h3>
            <textarea
              autoFocus
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              placeholder="Log a note about this lead…"
              className="w-full bg-section border border-border-subtle rounded-[8px] px-3 py-2 text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default resize-none"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setNoteOpen(false)}
                className="px-3 py-1.5 rounded-[20px] text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  addNote(noteText);
                  setNoteText("");
                  setNoteOpen(false);
                }}
                className="px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
              >
                Save note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
