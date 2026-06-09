import { apiRequest } from "./client";
import type { EmailDomain } from "@/lib/types/email-domain";

export async function listEmailDomains(): Promise<EmailDomain[]> {
  return apiRequest<EmailDomain[]>("/email/domains");
}

export async function createEmailDomain(payload: {
  name: string;
  client?: string;
  purchased?: boolean;
}): Promise<EmailDomain> {
  return apiRequest<EmailDomain>("/email/domains", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEmailDomain(
  id: string,
  patch: Partial<Pick<EmailDomain, "client" | "health" | "status" | "spf" | "dkim" | "dmarc" | "mx" | "tracking" | "dnsRecords">>,
): Promise<EmailDomain> {
  return apiRequest<EmailDomain>(`/email/domains/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteEmailDomain(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiRequest(`/email/domains/${encodeURIComponent(id)}`, { method: "DELETE" });
}
