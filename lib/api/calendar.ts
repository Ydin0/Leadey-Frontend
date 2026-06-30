import { apiRequest } from "./client";
import type { CalendarAccountsResult, LeadMeetingsResult } from "@/lib/types/calendar";

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
