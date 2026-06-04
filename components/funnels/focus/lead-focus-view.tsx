"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { LeadListSidebar } from "./lead-list-sidebar";
import { LeadDetailHeader } from "./lead-detail-header";
import { LeadAboutPanel } from "./lead-about-panel";
import { LeadContactsPanel } from "./lead-contacts-panel";
import { LeadCustomFieldsPanel } from "./lead-custom-fields-panel";
import { LeadHiringPanel } from "./lead-hiring-panel";
import { LeadActivityTimeline } from "./lead-activity-timeline";
import { LeadFocusNavigation } from "./lead-focus-navigation";
import { LeadStepTracker } from "./lead-step-tracker";
import { FocusCallControls } from "./focus-call-controls";
import { LeadEmailThread } from "@/components/email/lead-email-thread";
import { EmailComposerDrawer } from "@/components/email/email-composer-drawer";
import { mapEventsToActivities } from "@/lib/utils/lead-activity";
import { updateLeadStatus, advanceLead, markLeadDnc } from "@/lib/api/funnels";
import { confirmDncCall } from "@/lib/utils/dnc";
import { useLeadStatuses } from "@/lib/hooks/use-lead-statuses";
import { useCallContext } from "@/components/calling/call-context";
import { cn } from "@/lib/utils";
import type { FunnelLead, FunnelStep, FunnelLeadEvent } from "@/lib/types/funnel";
import type { FunnelLeadActivity, FunnelLeadCompany, FunnelLeadCustomField } from "@/lib/types/funnel-focus";

interface LeadFocusViewProps {
  leads: FunnelLead[];
  initialIndex: number;
  funnelId: string;
  funnelName: string;
  steps?: FunnelStep[];
  onClose: () => void;
  /** Persist a lead change back to the parent so it survives reopening. */
  onLeadPatch?: (leadId: string, patch: Partial<FunnelLead>) => void;
  /** Reload the campaign from the server (e.g. after a contact is DNC'd and
   *  removed from this and other campaigns). */
  onLeadsChanged?: () => void;
}

/** Outcomes that end the sequence (lead stops advancing). */
const TERMINAL_OUTCOMES = new Set(["replied", "bounced", "completed"]);

interface ProgressOverride {
  currentStep: number;
  status: string;
  events: FunnelLeadEvent[];
}

export function LeadFocusView({
  leads,
  initialIndex,
  funnelId,
  funnelName,
  steps = [],
  onClose,
  onLeadPatch,
  onLeadsChanged,
}: LeadFocusViewProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Record<string, ProgressOverride>>({});
  const [extraActivities, setExtraActivities] = useState<Record<string, FunnelLeadActivity[]>>({});
  const [showComposer, setShowComposer] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [advancing, setAdvancing] = useState(false);
  const [rightTab, setRightTab] = useState<"activity" | "thread">("activity");
  const { statuses } = useLeadStatuses();
  const { startCall } = useCallContext();

  const currentLead = leads[currentIndex];

  // Keep currentIndex pointing at the SAME lead when the leads array changes
  // underneath us (e.g. a contact is DNC'd and removed). If the focused lead
  // itself was removed, leave the focus view.
  const currentLeadIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentLead) currentLeadIdRef.current = currentLead.id;
  }, [currentLead]);
  useEffect(() => {
    const id = currentLeadIdRef.current;
    if (!id) return;
    const idx = leads.findIndex((l) => l.id === id);
    if (idx === -1) {
      onClose();
    } else if (idx !== currentIndex) {
      setCurrentIndex(idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads]);

  async function handleDncContact(contact: { id: string }, value: boolean) {
    try {
      await markLeadDnc(funnelId, contact.id, value);
    } catch (err) {
      console.error("Failed to toggle DNC:", err);
    } finally {
      // Reload so the red flag / un-flag is reflected everywhere.
      onLeadsChanged?.();
    }
  }

  const companyFirstLead = useMemo(() => {
    if (!currentLead) return null;
    return leads.find((l) => l.company === currentLead.company) || currentLead;
  }, [leads, currentLead]);

  // Effective (override-aware) per-lead state.
  const leadProgress = currentLead ? progress[currentLead.id] : undefined;
  const currentStatus = currentLead
    ? statusOverrides[currentLead.id] ?? leadProgress?.status ?? currentLead.status
    : "new";
  const effectiveStep = currentLead ? leadProgress?.currentStep ?? currentLead.currentStep : 1;
  const effectiveEvents = currentLead ? leadProgress?.events ?? currentLead.events ?? [] : [];
  const currentStepDef = steps[Math.min(Math.max(effectiveStep - 1, 0), Math.max(steps.length - 1, 0))];

  const currentDomain = currentLead
    ? currentLead.companyDomain || currentLead.email?.split("@")[1] || ""
    : "";

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

  // Real company "About" data derived from the imported lead — no mock. Missing
  // fields stay empty so the UI shows "Not available" rather than fabricated text.
  const realCompany = useMemo<FunnelLeadCompany | null>(() => {
    const l = companyFirstLead || currentLead;
    if (!l) return null;
    const domain =
      l.companyDomain || (l.email?.includes("@") ? l.email.split("@")[1] : "") || "";
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

  // Real custom fields — only what we actually have (company LinkedIn, revenue,
  // source, and any extra columns captured at import into notes).
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

  const hiringRoles =
    currentLead?.companyHiringRoles ?? companyFirstLead?.companyHiringRoles ?? [];

  const companyIndices = useMemo(() => {
    const seen = new Set<string>();
    const indices: number[] = [];
    for (let i = 0; i < leads.length; i++) {
      if (!seen.has(leads[i].company)) {
        seen.add(leads[i].company);
        indices.push(i);
      }
    }
    return indices;
  }, [leads]);

  const currentCompanyPos = useMemo(() => {
    if (!currentLead) return 0;
    return companyIndices.findIndex((i) => leads[i].company === currentLead.company);
  }, [companyIndices, currentLead, leads]);

  const handlePrevious = useCallback(() => {
    const prevPos = Math.max(0, currentCompanyPos - 1);
    setCurrentIndex(companyIndices[prevPos]);
  }, [currentCompanyPos, companyIndices]);

  const handleNext = useCallback(() => {
    const nextPos = Math.min(companyIndices.length - 1, currentCompanyPos + 1);
    setCurrentIndex(companyIndices[nextPos]);
  }, [currentCompanyPos, companyIndices]);

  const handleStatusChange = useCallback(
    (status: string) => {
      if (!currentLead) return;
      const leadId = currentLead.id;
      const previous = statusOverrides[leadId] ?? currentLead.status;
      setStatusOverrides((prev) => ({ ...prev, [leadId]: status }));
      updateLeadStatus(funnelId, leadId, status)
        .then(() => onLeadPatch?.(leadId, { status })) // persist into parent so it survives reopening
        .catch(() => {
          setStatusOverrides((prev) => ({ ...prev, [leadId]: previous }));
        });
    },
    [currentLead, funnelId, statusOverrides, onLeadPatch],
  );

  function logActivity(leadId: string, activity: FunnelLeadActivity) {
    setExtraActivities((prev) => ({
      ...prev,
      [leadId]: [activity, ...(prev[leadId] ?? [])],
    }));
  }

  /** Tick off a campaign step and advance the lead (optimistic + persisted). */
  const completeStep = useCallback(
    (outcome: string) => {
      if (!currentLead) return;
      const leadId = currentLead.id;
      const total = currentLead.totalSteps;
      const baseStep = progress[leadId]?.currentStep ?? currentLead.currentStep;
      const baseEvents = progress[leadId]?.events ?? currentLead.events ?? [];
      const stepIdx = Math.min(Math.max(baseStep - 1, 0), Math.max(total - 1, 0));
      const isTerminal = TERMINAL_OUTCOMES.has(outcome);
      const completingLast = stepIdx >= total - 1;
      const newStep = isTerminal ? baseStep : Math.min(baseStep + 1, total);
      const newStatus = isTerminal
        ? outcome
        : completingLast
          ? "completed"
          : currentStatus;

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
        [leadId]: { currentStep: newStep, status: newStatus, events: [...baseEvents, newEvent] },
      }));
      if (newStatus !== currentStatus) {
        setStatusOverrides((prev) => ({ ...prev, [leadId]: newStatus }));
      }

      setAdvancing(true);
      advanceLead(funnelId, leadId, outcome)
        .then(() => onLeadPatch?.(leadId, { currentStep: newStep, status: newStatus }))
        .catch(() => {
          // Revert on failure.
          setProgress((prev) => {
            const next = { ...prev };
            next[leadId] = {
              currentStep: baseStep,
              status: currentStatus,
              events: baseEvents,
            };
            return next;
          });
        })
        .finally(() => setAdvancing(false));
    },
    [currentLead, funnelId, progress, currentStatus, onLeadPatch],
  );

  /** Phone to dial for this company — the focused lead's, else any contact's. */
  const primaryPhone = currentLead?.phone || companyContacts.find((c) => c.phone)?.phone || "";

  function dial(phone?: string, contactName?: string) {
    const num = (phone || primaryPhone || "").trim();
    if (num)
      void startCall(num, {
        contactName: contactName || currentLead?.name || null,
        companyName: currentLead?.company || null,
        leadId: currentLead?.id || null,
        funnelId,
      });
  }

  /** Primary Call button (header / call step) — confirms when the focused lead
   *  is marked Do-Not-Contact. (Per-contact calls confirm in the contacts panel.) */
  function dialPrimary() {
    if (currentLead?.doNotCall && !confirmDncCall(currentLead.name)) return;
    dial();
  }

  /** A step's "Complete" CTA — email opens the composer, call dials via the
   *  Twilio dialer, others log + advance. */
  function handleCompleteStep(step: FunnelStep) {
    if (!currentLead) return;
    if (step.channel === "email") {
      setShowComposer(true);
      return;
    }
    if (step.channel === "call") {
      dialPrimary(); // place the real Twilio call (confirms if DNC)
    }
    const verb =
      step.channel === "call" ? "Call logged" :
      step.channel === "linkedin" ? "LinkedIn message sent" :
      "Message sent";
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
    // Auto-tick only when the current step is an email step.
    if (currentStepDef?.channel === "email") {
      completeStep("sent");
    }
  }

  function handleSaveNote() {
    if (!currentLead || !noteText.trim()) {
      setNoteOpen(false);
      return;
    }
    logActivity(currentLead.id, {
      id: `act_${Date.now()}`,
      type: "note",
      summary: noteText.trim(),
      timestamp: new Date(),
      userInitials: "You",
    });
    setNoteText("");
    setNoteOpen(false);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (showComposer || noteOpen) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") handlePrevious();
      else if (e.key === "ArrowRight") handleNext();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, handlePrevious, handleNext, showComposer, noteOpen]);

  if (!currentLead) return null;

  const leadsWithOverrides = leads.map((lead) => ({
    ...lead,
    status: statusOverrides[lead.id] ?? progress[lead.id]?.status ?? lead.status,
    currentStep: progress[lead.id]?.currentStep ?? lead.currentStep,
  }));

  // Real activity = this session's actions (optimistic) + the lead's actual
  // backend events. No more mock focus-data activities.
  const timelineActivities = [
    ...(extraActivities[currentLead.id] ?? []),
    ...mapEventsToActivities(currentLead.events ?? []),
  ];

  return (
    <div className="fixed inset-0 z-40 bg-page flex">
      <LeadListSidebar
        leads={leadsWithOverrides}
        currentIndex={currentIndex}
        onSelectIndex={setCurrentIndex}
        onClose={onClose}
        funnelName={funnelName}
      />

      {/* Center panel */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <FocusCallControls steps={steps} />

          <LeadDetailHeader
            leadId={currentLead.id}
            opportunityId={currentLead.opportunityId}
            companyName={currentLead.company}
            companyDomain={currentDomain}
            status={currentStatus}
            statuses={statuses}
            onStatusChange={handleStatusChange}
            localTime={undefined}
            onEmail={() => setShowComposer(true)}
            onNote={() => setNoteOpen(true)}
            onCall={() => dialPrimary()}
          />

          {steps.length > 0 && (
            <LeadStepTracker
              steps={steps}
              currentStep={effectiveStep}
              totalSteps={currentLead.totalSteps}
              status={currentStatus}
              events={effectiveEvents}
              onCompleteStep={handleCompleteStep}
              busy={advancing}
            />
          )}

          {currentLead && realCompany && (
            <>
              <LeadAboutPanel company={realCompany} />
              <LeadHiringPanel roles={hiringRoles} />
              <LeadContactsPanel
                contacts={companyContacts}
                onCall={(p, n) => dial(p, n)}
                onDnc={(contact, value) => handleDncContact(contact, value)}
              />
              <LeadCustomFieldsPanel fields={realCustomFields} />
            </>
          )}
        </div>
      </div>

      {/* Right panel — Activity / Thread */}
      <div className="w-[420px] border-l border-border-subtle bg-surface shrink-0 overflow-hidden flex flex-col">
        <div className="flex items-center gap-1 px-3 pt-3 border-b border-border-subtle">
          {(["activity", "thread"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setRightTab(tab)}
              className={cn(
                "px-3 py-2 text-[11px] font-medium capitalize border-b-2 -mb-px transition-colors",
                rightTab === tab
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-muted hover:text-ink-secondary",
              )}
            >
              {tab === "thread" ? "Email Thread" : "Activity"}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          {rightTab === "activity" ? (
            <LeadActivityTimeline activities={timelineActivities} />
          ) : (
            <LeadEmailThread
              lead={{
                id: currentLead.id,
                name: currentLead.name,
                email: currentLead.email,
                company: currentLead.company,
                title: currentLead.title,
                companyDomain: currentLead.companyDomain,
              }}
              onCompose={() => setShowComposer(true)}
            />
          )}
        </div>
      </div>

      <LeadFocusNavigation
        currentIndex={currentCompanyPos}
        totalLeads={companyIndices.length}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />

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
                onClick={handleSaveNote}
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
