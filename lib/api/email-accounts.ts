import { apiRequest } from "./client";
import type { EmailAccount, OrgEmailAccount, SmtpConnectPayload } from "@/lib/types/email-accounts";

/** The caller's connected inboxes (their own, org-scoped). */
export async function listEmailAccounts(): Promise<EmailAccount[]> {
  return apiRequest<EmailAccount[]>("/email/accounts");
}

/** Begin an OAuth connect — returns the provider authorize URL to redirect to. */
export async function listOrgEmailAccounts(): Promise<OrgEmailAccount[]> {
  return apiRequest<OrgEmailAccount[]>("/email/accounts?scope=org");
}

export async function updateEmailAccount(
  id: string,
  patch: { fromName?: string; signature?: string | null; signatureId?: string | null },
): Promise<EmailAccount> {
  return apiRequest<EmailAccount>(`/email/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function startEmailOAuth(provider: "google" | "microsoft"): Promise<string> {
  const res = await apiRequest<{ url: string }>(`/email/accounts/oauth/${provider}/start`);
  return res.url;
}

/** Connect a generic SMTP/IMAP mailbox (credentials verified server-side). */
export async function connectSmtpAccount(payload: SmtpConnectPayload): Promise<EmailAccount> {
  return apiRequest<EmailAccount>("/email/accounts/smtp", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function setDefaultEmailAccount(id: string): Promise<void> {
  await apiRequest(`/email/accounts/${encodeURIComponent(id)}/default`, { method: "POST" });
}

export async function disconnectEmailAccount(id: string): Promise<void> {
  await apiRequest(`/email/accounts/${encodeURIComponent(id)}`, { method: "DELETE" });
}
