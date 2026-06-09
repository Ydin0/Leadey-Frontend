import { apiRequest } from "./client";
import type { EmailMailbox } from "@/lib/types/email-mailbox";

export async function listEmailMailboxes(): Promise<EmailMailbox[]> {
  return apiRequest<EmailMailbox[]>("/email/mailboxes");
}

export async function createEmailMailbox(payload: {
  email: string;
  name?: string;
  provider?: string;
  domainId?: string | null;
  dailyLimit?: number;
}): Promise<EmailMailbox> {
  return apiRequest<EmailMailbox>("/email/mailboxes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEmailMailbox(
  id: string,
  patch: Partial<Pick<EmailMailbox, "assignedTo" | "dailyLimit" | "warmup" | "status" | "name" | "provider" | "domainId">>,
): Promise<EmailMailbox> {
  return apiRequest<EmailMailbox>(`/email/mailboxes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteEmailMailbox(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiRequest(`/email/mailboxes/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Pull email accounts from Smartlead into our DB. */
export async function syncEmailMailboxes(): Promise<{
  created: number;
  updated: number;
  mailboxes: EmailMailbox[];
}> {
  return apiRequest("/email/mailboxes/sync", { method: "POST" });
}
