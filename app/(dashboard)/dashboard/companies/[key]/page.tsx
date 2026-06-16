"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { useAuthReady } from "@/components/providers/auth-token-sync";
import { LeadView } from "@/components/funnels/lead-view/lead-view";
import { getCompanyProfile, type CompanyProfile } from "@/lib/api/contacts";
import { sortLeads, DEFAULT_LEAD_SORT } from "@/lib/utils/sort-leads";
import type { Funnel, FunnelLead } from "@/lib/types/funnel";
import type { HiringRole } from "@/lib/api/hiring-roles";

/**
 * Standalone company profile. We render the SAME LeadView the campaign uses —
 * no bespoke layout. The company's discovered contacts become the leads (the
 * details column lists them all), and the company's scraped job posts seed the
 * Hiring Roles section. A company with only jobs (no contacts yet) still renders
 * with its details + hiring roles via a single placeholder lead.
 */
export default function CompanyProfilePage() {
  const params = useParams();
  const key = decodeURIComponent(params.key as string);
  const isAuthReady = useAuthReady();

  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [seedRoles, setSeedRoles] = useState<HiringRole[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: CompanyProfile = await getCompanyProfile(key);
      const c = data.company;

      // Hiring roles from the company's scraped job posts.
      setSeedRoles(
        data.hiringRoles.map((r) => ({ ...r, funnelId: "", leadId: c.id || c.name, createdAt: "" })),
      );

      // Company metadata mirrored onto every synthesised lead so LeadView's
      // company panel (About) renders the firmographics.
      const companyMeta = {
        company: c.name,
        companyDomain: c.domain || undefined,
        companyIndustry: c.industry || undefined,
        companyEmployeeCount: c.employeeCount ?? undefined,
        companyLocation: [c.city, c.country].filter(Boolean).join(", ") || undefined,
        companyDescription: c.description || undefined,
        companyLinkedin: c.linkedinUrl || undefined,
      };

      const baseLead = (over: Partial<FunnelLead>): FunnelLead =>
        ({
          id: "",
          name: "",
          title: "",
          email: "",
          phone: "",
          linkedinUrl: "",
          currentStep: 1,
          totalSteps: 1,
          status: "new",
          nextAction: "",
          nextDate: new Date(),
          source: "Contact Discovery",
          score: 0,
          doNotCall: false,
          opportunityId: null,
          events: [],
          callCount: 0,
          emailCount: 0,
          ...companyMeta,
          ...over,
        }) as FunnelLead;

      // Each discovered contact → a lead. They all share the company name so
      // LeadView groups them as one company with multiple contacts.
      const contactLeads: FunnelLead[] = data.contacts.map((ct) =>
        baseLead({
          id: ct.id,
          name: ct.fullName || "Unknown contact",
          title: ct.title || "",
          email: ct.email || "",
          phone: ct.phone || "",
          linkedinUrl: ct.linkedinUrl || "",
        }),
      );

      // Fallback: a company with no discovered contacts still needs one lead so
      // the company details + hiring roles render.
      const leadsList = contactLeads.length
        ? contactLeads
        : [baseLead({ id: `company:${c.id || c.name}`, name: c.name })];

      const synthetic = {
        id: "",
        name: c.name,
        description: "",
        status: "active",
        steps: [],
        metrics: {},
        sources: [],
        leads: leadsList,
        cockpit: {},
        analyticsSteps: [],
        members: [],
        createdAt: new Date(),
      } as unknown as Funnel;

      setFunnel(synthetic);
      setLeadId(leadsList[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load company");
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    if (!isAuthReady) return;
    void load();
  }, [isAuthReady, load]);

  const leads = useMemo(() => (funnel ? sortLeads(funnel.leads, DEFAULT_LEAD_SORT) : []), [funnel]);

  if (loading) {
    return <div className="rounded-[14px] border border-border-subtle bg-surface p-6"><p className="text-[12px] text-ink-muted">Loading company…</p></div>;
  }
  if (error || !funnel || !leadId) {
    return (
      <div className="rounded-[14px] border border-signal-red-text/25 bg-signal-red/10 p-5">
        <p className="text-[12px] font-medium text-signal-red-text mb-2">Could not load company</p>
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
      seedHiringRoles={seedRoles}
      onLeadPatch={(lid, patch) =>
        setFunnel((prev) => (prev ? { ...prev, leads: prev.leads.map((l) => (l.id === lid ? { ...l, ...patch } : l)) } : prev))
      }
      onLeadsChanged={() => void load()}
    />
  );
}
