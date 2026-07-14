import { apiRequest } from "./client";

export interface EmailSignature {
  id: string;
  name: string;
  contentHtml: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignatureDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  signatureFields: Record<string, string>;
  /** This rep's personal default signature id ("Default signature" resolves
   *  to this). null = fall back to the mailbox's own configured signature. */
  defaultSignatureId: string | null;
}

export async function listSignatures(): Promise<EmailSignature[]> {
  return apiRequest<EmailSignature[]>("/email/signatures");
}

export async function createSignature(input: { name: string; contentHtml: string }): Promise<EmailSignature> {
  return apiRequest<EmailSignature>("/email/signatures", { method: "POST", body: JSON.stringify(input) });
}

export async function updateSignature(id: string, input: { name?: string; contentHtml?: string }): Promise<EmailSignature> {
  return apiRequest<EmailSignature>(`/email/signatures/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function deleteSignature(id: string): Promise<void> {
  await apiRequest(`/email/signatures/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getSignatureDetails(): Promise<SignatureDetails> {
  return apiRequest<SignatureDetails>("/me/signature-details");
}

export async function updateSignatureDetails(input: { title?: string; signatureFields?: Record<string, string>; defaultSignatureId?: string | null }): Promise<void> {
  await apiRequest("/me/signature-details", { method: "PATCH", body: JSON.stringify(input) });
}

/** Mark (or clear) this rep's personal default signature. */
export async function setDefaultSignature(id: string | null): Promise<void> {
  await updateSignatureDetails({ defaultSignatureId: id });
}
