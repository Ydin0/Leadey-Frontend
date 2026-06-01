"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { LeadListSidebar } from "./lead-list-sidebar";
import { LeadDetailHeader } from "./lead-detail-header";
import { LeadAboutPanel } from "./lead-about-panel";
import { LeadContactsPanel } from "./lead-contacts-panel";
import { LeadCustomFieldsPanel } from "./lead-custom-fields-panel";
import { LeadActivityTimeline } from "./lead-activity-timeline";
import { LeadFocusNavigation } from "./lead-focus-navigation";
import { generateFocusData } from "@/lib/utils/generate-focus-data";
import type { FunnelLead } from "@/lib/types/funnel";
import type { LeadStatus, FunnelLeadFocusData } from "@/lib/types/funnel-focus";

interface LeadFocusViewProps {
  leads: FunnelLead[];
  focusData: Record<string, FunnelLeadFocusData>;
  initialIndex: number;
  funnelName: string;
  onClose: () => void;
}

export function LeadFocusView({
  leads,
  focusData,
  initialIndex,
  funnelName,
  onClose,
}: LeadFocusViewProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, LeadStatus>>({});

  const currentLead = leads[currentIndex];

  // Build complete focus data — use curated data if available, otherwise generate
  const completeFocusData = useMemo(() => {
    const map: Record<string, FunnelLeadFocusData> = {};
    for (const lead of leads) {
      map[lead.id] = focusData[lead.id] ?? generateFocusData(lead);
    }
    return map;
  }, [leads, focusData]);

  // Use focus data from the FIRST lead in this company so About/CustomFields stay consistent
  const companyFirstLead = useMemo(() => {
    if (!currentLead) return null;
    return leads.find((l) => l.company === currentLead.company) || currentLead;
  }, [leads, currentLead]);

  const currentFocusData = companyFirstLead ? completeFocusData[companyFirstLead.id] : null;
  const currentStatus = currentLead
    ? (statusOverrides[currentLead.id] ?? currentLead.status)
    : "new";

  // Derive domain from email or companyDomain
  const currentDomain = currentLead
    ? (currentLead.companyDomain || currentLead.email?.split("@")[1] || "")
    : "";

  // Build real contacts from all leads in the same company
  const companyContacts = useMemo(() => {
    if (!currentLead) return [];
    return leads
      .filter((l) => l.company === currentLead.company)
      .map((l, i) => ({
        id: l.id,
        name: l.name,
        title: l.title,
        email: l.email || null,
        phone: l.phone || null,
        linkedinUrl: l.linkedinUrl || null,
        isPrimary: l.id === currentLead.id,
      }));
  }, [leads, currentLead]);

  // Navigate between companies, not individual leads
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

  const handleStatusChange = useCallback((status: LeadStatus) => {
    if (!currentLead) return;
    setStatusOverrides((prev) => ({ ...prev, [currentLead.id]: status }));
  }, [currentLead]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, handlePrevious, handleNext]);

  if (!currentLead) return null;

  // Build leads with status overrides for sidebar
  const leadsWithOverrides = leads.map((lead) => ({
    ...lead,
    status: statusOverrides[lead.id] ?? lead.status,
  }));

  return (
    <div className="fixed inset-0 z-40 bg-page flex">
      {/* Left sidebar */}
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
          <LeadDetailHeader
            leadId={currentLead.id}
            opportunityId={currentLead.opportunityId}
            companyName={currentLead.company}
            companyDomain={currentDomain}
            status={currentStatus}
            onStatusChange={handleStatusChange}
            localTime={currentFocusData?.localTime}
          />

          {currentFocusData && (
            <>
              <LeadAboutPanel company={currentFocusData.company} />
              <LeadContactsPanel contacts={companyContacts} />
              <LeadCustomFieldsPanel fields={currentFocusData.customFields} />
            </>
          )}
        </div>
      </div>

      {/* Right panel — Activity */}
      <div className="w-[420px] border-l border-border-subtle bg-surface shrink-0 overflow-hidden flex flex-col">
        <LeadActivityTimeline
          activities={currentFocusData?.activities ?? []}
        />
      </div>

      {/* Navigation */}
      <LeadFocusNavigation
        currentIndex={currentCompanyPos}
        totalLeads={companyIndices.length}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />
    </div>
  );
}
