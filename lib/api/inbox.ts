import { apiRequest } from "./client";

export interface InboxCounts {
  tasks: number;
  reminders: number;
  calls: number;
  messages: number;
  linkedin: number;
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

export async function getInboxCounts(lineIds?: string[]): Promise<InboxCounts> {
  const qs = lineIds?.length ? `?lineIds=${encodeURIComponent(lineIds.join(","))}` : "";
  return apiRequest<InboxCounts>(`/inbox/counts${qs}`);
}

export async function getPrimaryFeed(): Promise<PrimaryItem[]> {
  return apiRequest<PrimaryItem[]>("/inbox/primary");
}

/** Mark a notification-style inbox tab as seen (advances the rep's watermark so
 *  the tab badge clears). */
export async function markInboxSeen(tab: "calls" | "messages"): Promise<void> {
  await apiRequest("/inbox/seen", { method: "POST", body: JSON.stringify({ tab }) });
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

/** Hide an unknown caller/texter from the Potential Contacts list (persisted). */
export async function dismissPotentialContact(data: { phone?: string; email?: string }): Promise<void> {
  await apiRequest("/inbox/potential-contacts/dismiss", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
