import { apiRequest } from "./client";

/** A phone number registered as a WhatsApp sender with Meta (via Twilio). */
export interface WhatsappSender {
  id: string;
  lineId: string | null;
  lineName: string | null;
  /** The backing phone line was released — the registration should be removed. */
  lineReleased: boolean;
  number: string;
  /** creating | pending_verification | verifying | online | offline | twilio_review | … */
  status: string;
  lastError: string | null;
  createdAt: string;
}

export interface WhatsappSettings {
  /** Org-level WABA override (advanced; usually empty). */
  wabaId: string;
  /** Sender registration is possible — org override OR the platform WABA. */
  wabaConfigured: boolean;
  /** The platform WABA is set server-side; the WABA card is hidden entirely. */
  platformWabaConfigured: boolean;
  sandbox: boolean;
  sandboxNumber: string | null;
}

/** A Meta message template (Twilio Content API) with its approval state. */
export interface WhatsappContentTemplate {
  sid: string;
  name: string;
  language: string;
  body: string;
  variables: Record<string, string>;
  approvalStatus: string; // approved | pending | rejected | received | unsubmitted | …
  rejectionReason: string | null;
}

export async function getWhatsappSettings(): Promise<WhatsappSettings> {
  return apiRequest("/whatsapp/settings");
}

export async function saveWhatsappSettings(wabaId: string): Promise<{ wabaId: string }> {
  return apiRequest("/whatsapp/settings", { method: "PUT", body: JSON.stringify({ wabaId }) });
}

export async function listWhatsappSenders(): Promise<WhatsappSender[]> {
  const res = await apiRequest<{ senders: WhatsappSender[] }>("/whatsapp/senders");
  return res.senders;
}

export async function registerWhatsappSender(data: {
  lineId: string;
  displayName?: string;
}): Promise<{ sender: WhatsappSender }> {
  return apiRequest("/whatsapp/senders", { method: "POST", body: JSON.stringify(data) });
}

export async function verifyWhatsappSender(id: string, code: string): Promise<{ id: string; status: string }> {
  return apiRequest(`/whatsapp/senders/${encodeURIComponent(id)}/verify`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function refreshWhatsappSender(id: string): Promise<{ id: string; status: string; lastError: string | null }> {
  return apiRequest(`/whatsapp/senders/${encodeURIComponent(id)}/refresh`, { method: "POST" });
}

export async function deleteWhatsappSender(id: string): Promise<void> {
  await apiRequest(`/whatsapp/senders/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function listWhatsappContentTemplates(): Promise<WhatsappContentTemplate[]> {
  const res = await apiRequest<{ templates: WhatsappContentTemplate[] }>("/whatsapp/content-templates");
  return res.templates;
}

export async function createWhatsappContentTemplate(data: {
  name: string;
  body: string;
  category?: string;
  language?: string;
}): Promise<{ sid: string; approvalStatus: string }> {
  return apiRequest("/whatsapp/content-templates", { method: "POST", body: JSON.stringify(data) });
}

/** Manual WhatsApp send to a lead (freeform inside the 24h window, or an
 *  approved template via contentSid). */
export async function sendWhatsappToLead(
  funnelId: string,
  leadId: string,
  payload: { body?: string; contentSid?: string; contentVariables?: Record<string, string>; lineId?: string },
): Promise<{ id: string; status: string; fromNumber: string; toNumber: string }> {
  return apiRequest(
    `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/whatsapp`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}
