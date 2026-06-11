export type TemplateChannel = "email" | "linkedin" | "sms";
export type TemplateCategory = "outreach" | "follow_up" | "breakup" | "referral" | "custom";

export interface Template {
  id: string;
  name: string;
  channel: TemplateChannel;
  category: TemplateCategory | null;
  subject: string | null;
  body: string;
  tags: string[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
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
