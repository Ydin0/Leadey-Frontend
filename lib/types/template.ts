export type TemplateChannel = "email" | "linkedin" | "sms";
export type TemplateCategory = "outreach" | "follow_up" | "breakup" | "referral" | "custom";

export interface TemplateAttachment {
  id: string;
  templateId: string | null;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  channel: TemplateChannel;
  category: TemplateCategory | null;
  subject: string | null;
  body: string;
  /** Rich HTML body for email templates (links + formatting); null on
   *  legacy/plain templates and on linkedin/sms. */
  bodyHtml: string | null;
  tags: string[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  /** Present on GET /templates/:id and create/update responses. */
  attachments?: TemplateAttachment[];
}

export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: "outreach", label: "Outreach" },
  { value: "follow_up", label: "Follow-up" },
  { value: "breakup", label: "Breakup" },
  { value: "referral", label: "Referral" },
  { value: "custom", label: "Custom" },
];

export const TEMPLATE_VARIABLES = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "full_name", label: "Full Name" },
  { key: "company", label: "Company" },
  { key: "title", label: "Job Title" },
  { key: "email", label: "Email" },
  { key: "domain", label: "Domain" },
  { key: "sender_name", label: "Your Name" },
];

/** Sender variables for signatures — resolve to each sending rep's own details
 *  at send time, so one signature serves the whole team. */
export const SIGNATURE_VARIABLES = [
  { key: "sender_full_name", label: "Full Name" },
  { key: "sender_first_name", label: "First Name" },
  { key: "sender_last_name", label: "Last Name" },
  { key: "sender_title", label: "Job Title" },
  { key: "sender_email", label: "Email" },
  { key: "sender_phone", label: "Phone" },
  { key: "sender_company", label: "Company" },
];
