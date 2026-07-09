import { apiRequest } from "./client";

export interface InboxCounts {
  tasks: number;
  reminders: number;
  calls: number;
  messages: number;
  emails: number;
  potential: number;
  total: number;
}

export type PrimaryItemType = "task" | "reminder" | "call" | "sms";

export interface PrimaryItem {
  id: string;
  type: PrimaryItemType;
  title: string;
  subtitle: string;
  time: string;
  leadId: string | null;
  funnelId: string | null;
  phone: string | null;
}

export interface PotentialContact {
  phone: string | null;
  email: string | null;
  name: string | null;
  lastAt: string;
  calls: number;
  texts: number;
  meetings: number;
  source: "phone" | "calendly";
}

export async function getInboxCounts(): Promise<InboxCounts> {
  return apiRequest<InboxCounts>("/inbox/counts");
}

export async function getPrimaryFeed(): Promise<PrimaryItem[]> {
  return apiRequest<PrimaryItem[]>("/inbox/primary");
}

export async function getPotentialContacts(): Promise<PotentialContact[]> {
  return apiRequest<PotentialContact[]>("/inbox/potential-contacts");
}

export async function convertPotentialContact(data: {
  phone?: string;
  email?: string;
  name?: string;
  funnelId: string;
}): Promise<{ leadId: string; funnelId: string }> {
  return apiRequest("/inbox/potential-contacts/convert", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
