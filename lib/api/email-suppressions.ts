import { apiRequest } from "./client";

export interface EmailSuppression {
  id: string;
  email: string;
  reason: "unsubscribe" | "bounce" | "complaint" | "manual";
  leadId: string | null;
  leadName: string | null;
  createdAt: string;
}

/** The org's email suppression list (newest first). Optional address filter. */
export async function getSuppressions(q?: string): Promise<EmailSuppression[]> {
  const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  return apiRequest<EmailSuppression[]>(`/email-suppressions${qs}`);
}

/** Manually suppress an address (also exits its lead's active enrollments). */
export async function addSuppression(email: string): Promise<EmailSuppression> {
  return apiRequest<EmailSuppression>("/email-suppressions", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/** Remove an address from the list so it can be emailed again. */
export async function deleteSuppression(id: string): Promise<void> {
  await apiRequest(`/email-suppressions/${id}`, { method: "DELETE" });
}
