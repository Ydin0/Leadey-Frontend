export type LeadStatus =
  | "new"
  | "contacted"
  | "no_answer"
  | "interested"
  | "not_interested"
  | "callback"
  | "competitor"
  | "dnc"
  | "other_contact"
  | "qualified"
  | "bounced"
  | "completed";

export interface FunnelLeadCompany {
  name: string;
  domain: string;
  website: string | null;
  address: string | null;
  description: string | null;
  industry: string;
  employeeCount: number;
  linkedinUrl: string | null;
  annualRevenue?: string | null;
}

export interface FunnelLeadContact {
  id: string;
  name: string;
  title: string;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  isPrimary: boolean;
  doNotCall?: boolean;
}

export interface FunnelLeadActivity {
  id: string;
  type: "call" | "email_sent" | "email_opened" | "linkedin" | "note" | "status_change" | "import" | "opportunity" | "sms_sent" | "sms_received" | "meeting_scheduled" | "meeting_canceled";
  summary: string;
  detail?: string;
  /** Calendly meeting join/booking link, for meeting_* activities. */
  meetingUrl?: string | null;
  timestamp: Date;
  userInitials: string;
  /** The team member who performed this activity (when known). */
  userId?: string | null;
  userName?: string | null;
  /** Which contact (lead row) of the company this activity belongs to — used to
   *  label rows in the aggregated company timeline and drive the quick filter. */
  contactId?: string | null;
  contactName?: string | null;
}

export interface FunnelLeadCustomField {
  label: string;
  value: string;
  isLink?: boolean;
}

export interface FunnelLeadFocusData {
  leadId: string;
  company: FunnelLeadCompany;
  contacts: FunnelLeadContact[];
  activities: FunnelLeadActivity[];
  customFields: FunnelLeadCustomField[];
  localTime: string;
}
