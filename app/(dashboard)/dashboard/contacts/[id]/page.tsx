"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { useAuthReady } from "@/components/providers/auth-token-sync";
import { LeadView } from "@/components/funnels/lead-view/lead-view";
import { getContactProfile, type ContactProfile } from "@/lib/api/contacts";
import { getFunnelById } from "@/lib/api/funnels";
import { sortLeads, DEFAULT_LEAD_SORT } from "@/lib/utils/sort-leads";
import type { Funnel, FunnelLead, FunnelLeadEvent } from "@/lib/types/funnel";

/**
 * Discovered-contact profile. We render the SAME LeadView the campaign uses —
 * no bespoke layout. If the contact is in a campaign we load that real funnel
 * (identical to opening the lead from the campaign). If not, we synthesise a
 * funnel/lead from the contact so the exact same view renders.
 */
export default function ContactLeadPage() {
  const params = useParams();
  const id = params.id as string;
  const isAuthReady = useAuthReady();

  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const c: ContactProfile = await getContactProfile(id);
      if (c.campaigns.length > 0) {
        // Real campaign lead — open the exact campaign LeadView.
        const camp = c.campaigns[0];
        const data = await getFunnelById(camp.funnelId, { lite: true, fullLeadId: camp.leadId });
        setFunnel(data);
        setLeadId(camp.leadId);
      } else {
        // Not in a campaign — synthesise a funnel/lead so the same view renders.
        const events: FunnelLeadEvent[] = c.calls.map((call) => ({
          id: call.id,
          type: "call",
          outcome: call.disposition || null,
          stepIndex: 0,
          meta: { channel: "call", number: call.number, direction: call.direction, duration: call.duration },
          timestamp: call.calledAt ? new Date(call.calledAt) : new Date(),
        }));
        const lead: FunnelLead = {
          id: c.id,
          name: c.fullName || "Unknown contact",
          company: c.company || "",
          title: c.title || "",
          email: c.email || "",
          phone: c.phone || "",
          linkedinUrl: c.linkedinUrl || "",
          currentStep: 1,
          totalSteps: 1,
          status: "new",
          nextAction: "",
          nextDate: new Date(),
          source: "Contact Discovery",
          score: 0,
          companyDomain: c.companyDomain || undefined,
          doNotCall: c.doNotCall,
          opportunityId: null,
          events,
          callCount: c.callsTotal,
          emailCount: 0,
        } as FunnelLead;
        const synthetic = {
          id: "",
          name: c.company || c.fullName || "Discovered contact",
          description: "",
          status: "active",
          steps: [],
          metrics: {},
          sources: [],
          leads: [lead],
          cockpit: {},
          analyticsSteps: [],
          members: [],
          createdAt: new Date(),
        } as unknown as Funnel;
        setFunnel(synthetic);
        setLeadId(c.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contact");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isAuthReady) return;
    void load();
  }, [isAuthReady, load]);

  const leads = useMemo(() => (funnel ? sortLeads(funnel.leads, DEFAULT_LEAD_SORT) : []), [funnel]);

  if (loading) {
    return <div className="rounded-[14px] border border-border-subtle bg-surface p-6"><p className="text-[12px] text-ink-muted">Loading contact…</p></div>;
  }
  if (error || !funnel || !leadId) {
    return (
      <div className="rounded-[14px] border border-signal-red-text/25 bg-signal-red/10 p-5">
        <p className="text-[12px] font-medium text-signal-red-text mb-2">Could not load contact</p>
        <p className="text-[11px] text-ink-secondary mb-3">{error || "Not found."}</p>
        <Link href="/dashboard/leads" className="text-[11px] text-signal-blue-text hover:underline">Back to Leads</Link>
      </div>
    );
  }

  return (
    <LeadView
      funnel={funnel}
      leads={leads}
      leadId={leadId}
      onLeadPatch={(lid, patch) =>
        setFunnel((prev) => (prev ? { ...prev, leads: prev.leads.map((l) => (l.id === lid ? { ...l, ...patch } : l)) } : prev))
      }
      onLeadsChanged={() => void load()}
    />
  );
}
