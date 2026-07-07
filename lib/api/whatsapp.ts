import { apiRequest } from "./client";

/** WhatsApp runs on the official Meta WhatsApp Cloud API, onboarded per-org via
 *  Meta Embedded Signup. No Twilio/Unipile. */
export interface WhatsappSettings {
  /** Whether the platform has Meta WhatsApp configured at all. */
  available: boolean;
  /** Whether this org has connected a WhatsApp number. */
  connected: boolean;
  /** The connected display number (e.g. +44 7…). */
  phone: string | null;
  /** The connected WhatsApp Business Account id. */
  wabaId: string | null;
}

export interface WhatsappTemplate {
  name: string;
  language: string;
  status: string; // APPROVED | PENDING | REJECTED | …
  category: string;
  bodyVariableCount: number;
  bodyText: string;
}

export async function getWhatsappSettings(): Promise<WhatsappSettings> {
  return apiRequest("/whatsapp/settings");
}

/** Finish Embedded Signup: exchange the code + store the connected number. */
export async function connectWhatsapp(payload: {
  code: string;
  phoneNumberId: string;
  wabaId: string;
  businessId?: string | null;
}): Promise<{ connected: boolean; phone: string | null; wabaId: string }> {
  return apiRequest("/whatsapp/connect", { method: "POST", body: JSON.stringify(payload) });
}

export async function disconnectWhatsappAccount(): Promise<void> {
  await apiRequest("/whatsapp/account", { method: "DELETE" });
}

/** Approved (and pending) message templates on the org's WABA. */
export async function listWhatsappTemplates(): Promise<WhatsappTemplate[]> {
  return apiRequest("/whatsapp/templates");
}

/** Manual WhatsApp send to a lead — freeform (inside the 24h window) or an
 *  approved template (variables fill the {{1}},{{2}}… body slots). */
export async function sendWhatsappToLead(
  funnelId: string,
  leadId: string,
  payload: {
    body?: string;
    templateName?: string;
    templateLanguage?: string;
    templateVariables?: string[];
    /** Template body text, for storing a readable message on the timeline. */
    contentBody?: string;
  },
): Promise<{ id: string; status: string; fromNumber: string; toNumber: string; body: string }> {
  return apiRequest(
    `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/whatsapp`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}
