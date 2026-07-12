import { apiRequest } from "./client";

export interface BookMeetingPayload {
  /** Book against a rep's booking page (Calendly flow): host, duration + video
   *  come from the page. When absent, hostAccountId + durationMin drive it. */
  bookingPageId?: string;
  hostAccountId?: string;
  title: string;
  description?: string;
  /** UTC ISO start time. */
  startISO: string;
  durationMin?: number;
  /** Lead-contact emails invited to the meeting. */
  inviteeEmails: string[];
  /** Ad-hoc guest emails. */
  guestEmails: string[];
  /** Attach a native video link (Google Meet / Teams). */
  video?: boolean;
  /** Location when it's not a video meeting. */
  location?: string;
}

export interface BookedMeeting {
  id: string;
  provider: "google" | "microsoft";
  providerEventId: string;
  joinUrl: string | null;
  title: string;
  startTime: string;
  endTime: string;
}

/** Create a real Google Meet / Teams calendar invite from the host mailbox and
 *  record it on the lead. */
export async function bookMeeting(
  funnelId: string,
  leadId: string,
  payload: BookMeetingPayload,
): Promise<BookedMeeting> {
  return apiRequest<BookedMeeting>(
    `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/meetings/book`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function cancelMeeting(id: string): Promise<{ id: string; status: string }> {
  return apiRequest<{ id: string; status: string }>(`/meetings/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
