import { apiRequest } from "./client";
import type { CalendarAccountsResult, LeadMeeting, LeadMeetingsResult, MeetingDisposition, OrgMeetingsResult } from "@/lib/types/calendar";

/** The caller's connected calendars + whether each provider is server-configured. */
export async function listCalendarAccounts(): Promise<CalendarAccountsResult> {
  return apiRequest<CalendarAccountsResult>("/calendar/accounts");
}

/** Begin a calendar OAuth connect — returns the provider authorize URL. */
export async function startCalendarOAuth(provider: "google" | "microsoft"): Promise<string> {
  const res = await apiRequest<{ url: string }>(`/calendar/accounts/oauth/${provider}/start`);
  return res.url;
}

export async function disconnectCalendarAccount(id: string): Promise<void> {
  await apiRequest(`/calendar/accounts/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Upcoming meetings for a lead, merged across connected calendars + Calendly. */
export async function getLeadMeetings(funnelId: string, leadId: string): Promise<LeadMeetingsResult> {
  return apiRequest<LeadMeetingsResult>(
    `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/meetings`,
  );
}

/** Org/date-range meetings feed (Cockpit + full calendar). scope "mine"
 *  (default) = the caller's own connected accounts; "org" = everyone's. */
export async function listMeetings(params: {
  from: Date | string;
  to: Date | string;
  scope?: "mine" | "org";
}): Promise<OrgMeetingsResult> {
  const qs = new URLSearchParams({
    from: typeof params.from === "string" ? params.from : params.from.toISOString(),
    to: typeof params.to === "string" ? params.to : params.to.toISOString(),
    ...(params.scope ? { scope: params.scope } : {}),
  });
  return apiRequest<OrgMeetingsResult>(`/calendar/meetings?${qs.toString()}`);
}

/** Mark a past meeting attended / no_show, or clear it (disposition null). */
export async function setMeetingDisposition(
  source: LeadMeeting["source"],
  id: string,
  disposition: MeetingDisposition | null,
): Promise<void> {
  await apiRequest(
    `/calendar/meetings/${encodeURIComponent(source)}/${encodeURIComponent(id)}/disposition`,
    { method: "PUT", body: JSON.stringify({ disposition }) },
  );
}
