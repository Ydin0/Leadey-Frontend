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

export async function updateSignatureDetails(input: { title?: string; signatureFields?: Record<string, string> }): Promise<void> {
  await apiRequest("/me/signature-details", { method: "PATCH", body: JSON.stringify(input) });
}
