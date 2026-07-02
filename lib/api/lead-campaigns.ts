import { apiRequest } from "./client";

export interface LeadCampaignMembership {
  leadId: string;
  funnelId: string;
  funnelName: string;
  funnelStatus: string;
  leadStatus: string;
  currentStep: number;
  totalSteps: number;
  addedAt: string;
  isCurrent: boolean;
}

/** Every campaign this person is in (matched by email / phone / LinkedIn). */
export async function listLeadCampaigns(
  funnelId: string,
  leadId: string,
): Promise<LeadCampaignMembership[]> {
  return apiRequest<LeadCampaignMembership[]>(
    `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/campaigns`,
  );
}

/** Add this person to another campaign. Returns the refreshed membership list
 *  (or the existing membership when they were already in the target). */
export async function addLeadToCampaign(
  funnelId: string,
  leadId: string,
  targetFunnelId: string,
): Promise<LeadCampaignMembership[] | (LeadCampaignMembership & { alreadyExists: true })> {
  return apiRequest(
    `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/campaigns`,
    { method: "POST", body: JSON.stringify({ targetFunnelId }) },
  );
}

/** Remove one of this person's campaign memberships (deletes that campaign's
 *  lead row). `wasCurrent` tells the caller to navigate away. */
export async function removeLeadFromCampaign(
  funnelId: string,
  leadId: string,
  membershipLeadId: string,
): Promise<{ id: string; deleted: boolean; wasCurrent: boolean }> {
  return apiRequest(
    `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/campaigns/${encodeURIComponent(membershipLeadId)}`,
    { method: "DELETE" },
  );
}
