export interface CalendarAccount {
  id: string;
  provider: "google" | "microsoft";
  email: string;
  name: string;
  status: string; // active | error | disconnected
  lastSyncedAt: string | null;
  createdAt: string;
}

export interface CalendarAccountsResult {
  accounts: CalendarAccount[];
  platformConfigured: { google: boolean; microsoft: boolean };
}

export type MeetingResponseStatus = "accepted" | "declined" | "tentative" | "needsAction";

export interface LeadMeeting {
  id: string;
  source: "google" | "outlook" | "calendly";
  title: string;
  startTime: string | null;
  endTime: string | null;
  joinUrl: string | null;
  location: string | null;
  organizerEmail: string | null;
  /** The lead's RSVP to this meeting; null when unknown (e.g. events synced before RSVP tracking). */
  responseStatus: MeetingResponseStatus | null;
}

export interface LeadMeetingsResult {
  meetings: LeadMeeting[];
  calendarConnected: boolean;
}
