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
  /** Profile/org defaults — shown as placeholders when no override is set. */
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  title: string;
  /** Signature-display overrides (null ⇒ use the default above). Let a rep put a
   *  different name / work email / personal number / company on their signature. */
  signatureName: string | null;
  signatureEmail: string | null;
  signaturePhone: string | null;
  signatureCompany: string | null;
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

/** AI-tokenize a pasted signature: returns the same HTML with the {{sender_*}}
 *  merge variables inserted where the personal details are, so one signature
 *  serves the whole team. */
export async function analyzeSignature(html: string): Promise<string> {
  const res = await apiRequest<{ html: string }>("/email/signatures/analyze", {
    method: "POST",
    body: JSON.stringify({ html }),
  });
  return res.html;
}

export async function getSignatureDetails(): Promise<SignatureDetails> {
  return apiRequest<SignatureDetails>("/me/signature-details");
}

export async function updateSignatureDetails(input: {
  title?: string;
  signatureName?: string;
  signatureEmail?: string;
  signaturePhone?: string;
  signatureCompany?: string;
  signatureFields?: Record<string, string>;
  defaultSignatureId?: string | null;
}): Promise<void> {
  await apiRequest("/me/signature-details", { method: "PATCH", body: JSON.stringify(input) });
}

/** Mark (or clear) this rep's personal default signature. */
export async function setDefaultSignature(id: string | null): Promise<void> {
  await updateSignatureDetails({ defaultSignatureId: id });
}

/** Build the {{sender_*}} personalization context from a rep's signature
 *  details, preferring their signature OVERRIDES over the profile/org defaults —
 *  the single source of truth so every preview (settings, templates panel,
 *  composer) matches what the backend actually renders at send time. */
export function senderCtxFromDetails(d: SignatureDetails): {
  sender: { firstName: string; lastName: string; email: string; phone: string; title: string; company: string; fields: Record<string, string> };
} {
  const name = (d.signatureName || "").trim() || [d.firstName, d.lastName].filter(Boolean).join(" ");
  const [firstName, ...rest] = name.split(/\s+/);
  return {
    sender: {
      firstName: firstName || "",
      lastName: rest.join(" "),
      email: d.signatureEmail || d.email,
      phone: d.signaturePhone || d.phone,
      title: d.title,
      company: d.signatureCompany || d.companyName || "",
      fields: d.signatureFields,
    },
  };
}
