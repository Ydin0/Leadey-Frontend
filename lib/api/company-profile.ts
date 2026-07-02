/**
 * Universal company profile API — the org-wide view of one company: every
 * contact across every campaign plus the merged cross-campaign activity
 * timeline. Keyed by the canonical company id (master_companies.id).
 */
import { apiRequest, apiRequestRaw } from "./client";
import type { CallRecord } from "@/lib/types/calling";
import type { LeadEmailMessage } from "./email";
import type { HiringRole } from "./hiring-roles";

export interface CompanyProfileCompany {
  id: string;
  name: string;
  domain: string | null;
  linkedinUrl: string | null;
  industry: string | null;
  employeeCount: number | null;
  revenue: number | null;
  funding: number | null;
  fundingStage: string | null;
  country: string | null;
  city: string | null;
  logo: string | null;
  description: string | null;
  lastSeenAt: string;
}

export interface CompanyProfileCampaign {
  funnelId: string;
  funnelName: string;
  funnelStatus: string;
  leadCount: number;
}

export interface ContactEnrollment {
  leadId: string;
  funnelId: string;
  funnelName: string;
  funnelStatus: string;
  leadStatus: string;
  currentStep: number;
  totalSteps: number;
  addedAt: string;
  lastActivityAt: string | null;
}

export interface CompanyProfileContact {
  /** Stable person key: masterContactId, or "lead:<leadId>" for unresolved rows. */
  personKey: string;
  masterContactId: string | null;
  name: string;
  title: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  doNotCall: boolean;
  enrollments: ContactEnrollment[];
  activity: {
    calls: number;
    emails: number;
    sms: number;
    notes: number;
    lastActivityAt: string | null;
  };
}

export interface UniversalCompanyProfile {
  company: CompanyProfileCompany;
  campaigns: CompanyProfileCampaign[];
  contacts: CompanyProfileContact[];
  hiringRoles: HiringRole[];
}

export function getUniversalCompanyProfile(id: string): Promise<UniversalCompanyProfile> {
  return apiRequest<UniversalCompanyProfile>(`/companies/${encodeURIComponent(id)}/profile`);
}

/** One item of the merged timeline. `kind` selects which payload is present;
 *  every item carries campaign + contact attribution for badges/links. */
export interface CompanyTimelineItemBase {
  id: string;
  kind: "event" | "call" | "email" | "sms";
  timestamp: string;
  funnelId: string | null;
  funnelName: string | null;
  leadId: string | null;
  contact: { personKey: string; masterContactId: string | null; name: string } | null;
}

export interface CompanyTimelineEventPayload {
  type: string;
  outcome: string | null;
  stepIndex: number;
  meta: Record<string, unknown>;
}

export interface CompanyTimelineSmsPayload {
  id: string;
  direction: "outbound" | "inbound";
  fromNumber: string;
  toNumber: string;
  body: string;
  status: string;
  userId: string | null;
  createdAt: string;
}

export type CompanyTimelineItem = CompanyTimelineItemBase & {
  event?: CompanyTimelineEventPayload;
  call?: CallRecord;
  email?: LeadEmailMessage;
  sms?: CompanyTimelineSmsPayload;
};

export interface CompanyTimelinePage {
  items: CompanyTimelineItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function getCompanyTimeline(
  id: string,
  opts: { cursor?: string; funnelId?: string; contactId?: string; types?: string[]; limit?: number } = {},
): Promise<CompanyTimelinePage> {
  const params = new URLSearchParams();
  if (opts.cursor) params.set("cursor", opts.cursor);
  if (opts.funnelId) params.set("funnelId", opts.funnelId);
  if (opts.contactId) params.set("contactId", opts.contactId);
  if (opts.types?.length) params.set("types", opts.types.join(","));
  if (opts.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  const res = await apiRequestRaw<{
    data: CompanyTimelineItem[];
    meta: { nextCursor: string | null; hasMore: boolean };
  }>(`/companies/${encodeURIComponent(id)}/timeline${qs ? `?${qs}` : ""}`);
  return { items: res.data, nextCursor: res.meta.nextCursor, hasMore: res.meta.hasMore };
}
