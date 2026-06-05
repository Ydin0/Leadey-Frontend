"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LeadActionBar } from "./lead-action-bar";
import { LeadDetailsColumn } from "./lead-details-column";
import { LeadTimeline } from "./lead-timeline";
import { LeadStepTracker } from "@/components/funnels/focus/lead-step-tracker";
import { FocusCallControls } from "@/components/funnels/focus/focus-call-controls";
import { EmailComposerDrawer } from "@/components/email/email-composer-drawer";
import { ConvertToOpportunityModal } from "@/components/opportunities/convert-to-opportunity-modal";
import { mapEventsToActivities } from "@/lib/utils/lead-activity";
import { updateLeadStatus, advanceLead, logLeadNote, updateLeadNote, deleteLeadNote, markLeadDnc } from "@/lib/api/funnels";
import { getCallRecords } from "@/lib/api/phone-lines";
import { confirmDncCall } from "@/lib/utils/dnc";
import { useLeadStatuses } from "@/lib/hooks/use-lead-statuses";
import { useCallContext } from "@/components/calling/call-context";
import type { Funnel, FunnelLead, FunnelStep, FunnelLeadEvent } from "@/lib/types/funnel";
import type {
  FunnelLeadActivity,
  FunnelLeadCompany,
  FunnelLeadCustomField,
} from "@/lib/types/funnel-focus";
import type { CallRecord } from "@/lib/types/calling";

interface LeadViewProps {
  funnel: Funnel;
  leads: FunnelLead[];
  leadId: string;
  onLeadPatch?: (leadId: string, patch: Partial<FunnelLead>) => void;
  onLeadsChanged?: () => void;
}

const TERMINAL_OUTCOMES = new Set(["replied", "bounced", "completed"]);

interface ProgressOverride {
  currentStep: number;
  status: string;
  events: FunnelLeadEvent[];
}

export function LeadView({ funnel, leads, leadId, onLeadPatch, onLeadsChanged }: LeadViewProps) {
  const steps = funnel.steps;
  const funnelId = funnel.id;
  const router = useRouter();
  const { statuses } = useLeadStatuses();
  const { startCall, lastEndedCall } = useCallContext();

  const [statusOverride, setStatusOverride] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Record<string, ProgressOverride>>({});
  const [extraActivities, setExtraActivities] = useState<Record<string, FunnelLeadActivity[]>>({});
  // Local note edit/delete overlays applied on top of the merged timeline so
  // edits/deletes reflect instantly without a full refetch.
  const [editedNotes, setEditedNotes] = useState<Record<string, string>>({});
  const [deletedNotes, setDeletedNotes] = useState<Set<string>>(new Set());
  const [advancing, setAdvancing] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showConvert, setShowConvert] = useState(false);
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);

  const currentLead = useMemo(() => leads.find((l) => l.id === leadId) || null, [leads, leadId]);

  // ── Prev / next lead navigation (buttons + arrow keys) ──
  const currentIndex = useMemo(() => leads.findIndex((l) => l.id === leadId), [leads, leadId]);
  const prevLead = currentIndex > 0 ? leads[currentIndex - 1] : null;
  const nextLead = currentIndex >= 0 && currentIndex < leads.length - 1 ? leads[currentIndex + 1] : null;

  const goToLead = useCallback(
    (lead: FunnelLead | null) => {
      if (lead) router.push(`/dashboard/funnels/${funnelId}/leads/${lead.id}`);
    },
    [router, funnelId],
  );

  // ── Real per-lead call records (audio + AI summary in the timeline) ──
  const reloadCalls = useCallback(async () => {
    try {
      const res = await getCallRecords({ leadId, limit: 50 });
      setCallRecords(res.data);
    } catch (err) {
      console.error("Failed to load call records:", err);
    }
  }, [leadId]);

  useEffect(() => {
    void reloadCalls();
  }, [reloadCalls]);

  // Refetch shortly after a call against this lead ends + is saved.
  useEffect(() => {
    if (lastEndedCall?.leadId !== leadId) return;
    const t = setTimeout(() => void reloadCalls(), 1500);
    return () => clearTimeout(t);
  }, [lastEndedCall, leadId, reloadCalls]);

  // ← / → arrow keys jump between leads — ignored while typing or with a
  // modal/composer open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (showComposer || noteOpen || showConvert) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) {
        return;
      }
      if (e.key === "ArrowLeft") goToLead(prevLead);
      else if (e.key === "ArrowRight") goToLead(nextLead);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToLead, prevLead, nextLead, showComposer, noteOpen, showConvert]);

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
        linkedinUrl: l.linkedinUrl || null,
        isPrimary: l.id === currentLead.id,
        doNotCall: l.doNotCall,
      }));
  }, [leads, currentLead]);

  const realCompany = useMemo<FunnelLeadCompany | null>(() => {
    const l = companyFirstLead || currentLead;
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
    };
  }, [companyFirstLead, currentLead]);

  const realCustomFields = useMemo<FunnelLeadCustomField[]>(() => {
    const l = currentLead;
    if (!l) return [];
    const fields: FunnelLeadCustomField[] = [];
    if (l.companyLinkedin) fields.push({ label: "Company LinkedIn", value: l.companyLinkedin, isLink: true });
    if (l.companyAnnualRevenue) fields.push({ label: "Annual Revenue", value: l.companyAnnualRevenue });
    if (l.source) fields.push({ label: "Lead Source", value: l.source });
    if (l.notes) {
      for (const [k, v] of Object.entries(l.notes)) {
        if (v) fields.push({ label: k, value: String(v) });
      }
    }
    return fields;
  }, [currentLead]);

  const hiringRoles = currentLead?.companyHiringRoles ?? companyFirstLead?.companyHiringRoles ?? [];

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

  function handleEmailSent(info: { subject: string }) {
    if (!currentLead) return;
    logActivity(currentLead.id, {
      id: `act_${Date.now()}`,
      type: "email_sent",
      summary: `Email sent: ${info.subject || "(no subject)"}`,
      timestamp: new Date(),
      userInitials: "You",
    });
    if (currentStepDef?.channel === "email") completeStep("sent");
  }

  function addNote(text: string) {
    if (!currentLead || !text.trim()) return;
    const clean = text.trim();
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
    });
    void logLeadNote(funnelId, leadIdLocal, clean)
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

  if (!currentLead) {
    return (
      <div className="rounded-[14px] border border-border-subtle bg-surface p-6">
        <p className="text-[12px] text-ink-muted">Lead not found in this campaign.</p>
      </div>
    );
  }

  // Timeline activities = session + real backend events (calls come from the
  // real call records instead, so we drop event-derived "call" rows). Apply
  // the note edit/delete overlays and dedupe by id (a freshly-added note can
  // exist both as a session item and a refetched event with the same id).
  const seenActivityIds = new Set<string>();
  const timelineActivities = [
    ...(extraActivities[currentLead.id] ?? []),
    ...mapEventsToActivities(currentLead.events ?? []),
  ]
    .filter((a) => a.type !== "call")
    .filter((a) => !deletedNotes.has(a.id))
    .filter((a) => {
      if (seenActivityIds.has(a.id)) return false;
      seenActivityIds.add(a.id);
      return true;
    })
    .map((a) => (editedNotes[a.id] ? { ...a, summary: editedNotes[a.id] } : a));

  return (
    <div className="-m-6 h-[calc(100vh-3.5rem)] flex flex-col bg-page">
      <LeadActionBar
        funnelId={funnelId}
        companyName={currentLead.company}
        companyDomain={currentDomain}
        campaignName={funnel.name}
        campaignStatus={funnel.status}
        status={currentStatus}
        statuses={statuses}
        doNotCall={currentLead.doNotCall}
        onStatusChange={handleStatusChange}
        onNote={() => setNoteOpen(true)}
        onEmail={() => setShowComposer(true)}
        onCall={dialPrimary}
      />

      <div className="px-6 pt-3 shrink-0">
        <FocusCallControls steps={steps} />
      </div>

      <div className="flex flex-1 min-h-0">
        <aside className="w-[364px] shrink-0 border-r border-border-subtle px-[18px] overflow-hidden">
          <LeadDetailsColumn
            funnelId={funnelId}
            leadId={currentLead.id}
            company={realCompany}
            contacts={companyContacts}
            customFields={realCustomFields}
            hiringRoles={hiringRoles}
            opportunityId={currentLead.opportunityId ?? null}
            onConvert={() => setShowConvert(true)}
            onCall={(phone, name) => dial(phone, name)}
            onDnc={handleDnc}
            leads={leads}
            statuses={statuses}
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
            callRecords={callRecords}
            onAddNote={addNote}
            onEditNote={editNote}
            onDeleteNote={deleteNote}
          />
        </section>
      </div>

      {/* Prev / next lead navigation — bottom right (also ← / → keys) */}
      {leads.length > 1 && currentIndex >= 0 && (
        <div className="fixed bottom-6 right-6 z-30 flex items-center gap-1 rounded-full bg-surface border border-border-default shadow-xl px-1.5 py-1.5">
          <button
            onClick={() => goToLead(prevLead)}
            disabled={!prevLead}
            title="Previous lead (←)"
            className="flex items-center justify-center w-8 h-8 rounded-full text-ink-secondary hover:bg-hover transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <span className="text-[11px] text-ink-muted tabular-nums px-1.5 select-none">
            {currentIndex + 1} / {leads.length}
          </span>
          <button
            onClick={() => goToLead(nextLead)}
            disabled={!nextLead}
            title="Next lead (→)"
            className="flex items-center justify-center w-8 h-8 rounded-full text-ink-secondary hover:bg-hover transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Email composer */}
      <EmailComposerDrawer
        open={showComposer}
        onClose={() => setShowComposer(false)}
        lead={{
          id: currentLead.id,
          name: currentLead.name,
          email: currentLead.email,
          company: currentLead.company,
          title: currentLead.title,
          companyDomain: currentLead.companyDomain,
        }}
        funnelId={funnelId}
        stepIndex={currentStepDef?.channel === "email" ? effectiveStep - 1 : null}
        onSent={handleEmailSent}
      />

      {/* Convert modal */}
      {showConvert && (
        <ConvertToOpportunityModal
          leadId={currentLead.id}
          defaultName={`${currentLead.company} — Opportunity`}
          onClose={() => setShowConvert(false)}
          onConverted={() => onLeadsChanged?.()}
        />
      )}

      {/* Note modal */}
      {noteOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setNoteOpen(false)} />
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
