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
}

export interface FunnelLeadContact {
  id: string;
  name: string;
  title: string;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  isPrimary: boolean;
}

export interface FunnelLeadActivity {
  id: string;
  type: "call" | "email_sent" | "email_opened" | "linkedin" | "note" | "status_change" | "import";
  summary: string;
  detail?: string;
  timestamp: Date;
  userInitials: string;
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
