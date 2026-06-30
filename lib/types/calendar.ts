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

export interface LeadMeeting {
  id: string;
  source: "google" | "outlook" | "calendly";
  title: string;
  startTime: string | null;
  endTime: string | null;
  joinUrl: string | null;
  location: string | null;
  organizerEmail: string | null;
}

export interface LeadMeetingsResult {
  meetings: LeadMeeting[];
  calendarConnected: boolean;
}
