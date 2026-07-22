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
/** A rep's manual attendance mark on a past meeting. */
export type MeetingDisposition = "attended" | "no_show";

export interface LeadMeeting {
  id: string;
  source: "google" | "outlook" | "calendly" | "leadey";
  title: string;
  startTime: string | null;
  endTime: string | null;
  joinUrl: string | null;
  location: string | null;
  organizerEmail: string | null;
  /** The lead's RSVP to this meeting; null when unknown (e.g. events synced before RSVP tracking). */
  responseStatus: MeetingResponseStatus | null;
  /** Manually-set attendance on a past meeting (attended = green, no_show = red). */
  disposition: MeetingDisposition | null;
  /** The rep credited with booking this meeting (Leadey-booked meetings only). */
  bookedByUserId?: string | null;
  bookedByName?: string | null;
  /** True when a prospect self-booked via a public link (no rep booked it) —
   *  credited to the assigned host and shown as inbound. */
  selfBooked?: boolean;
}

export interface LeadMeetingsResult {
  meetings: LeadMeeting[];
  calendarConnected: boolean;
}

/** A meeting in the org/date-range feed (Cockpit + full calendar), enriched
 *  with the matched lead/campaign for deep links. */
export interface OrgMeeting extends LeadMeeting {
  leadId: string | null;
  funnelId: string | null;
  leadName: string | null;
  company: string | null;
  /** Owner rep (whose calendar/Calendly the meeting belongs to). */
  userId: string | null;
}

export interface OrgMeetingsResult {
  meetings: OrgMeeting[];
  calendarConnected: boolean;
  calendlyConnected: boolean;
}
