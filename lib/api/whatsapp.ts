import { apiRequest } from "./client";

/** WhatsApp is QR-linked via Unipile: the org scans a QR with their own phone
 *  and sends go out from that number. No Twilio/Meta WABA, templates or 24h
 *  rule. */
export interface WhatsappSettings {
  /** Whether the platform has WhatsApp (Unipile) configured at all. */
  available: boolean;
  /** Whether this org has a QR-connected WhatsApp account. */
  connected: boolean;
  /** The connected phone number (display only). */
  phone: string | null;
}

export async function getWhatsappSettings(): Promise<WhatsappSettings> {
  return apiRequest("/whatsapp/settings");
}

/** Start the QR connect flow — returns a hosted page URL where the user
 *  scans the QR with their own WhatsApp, then gets redirected back. */
export async function getWhatsappConnectLink(): Promise<{ url: string }> {
  return apiRequest("/whatsapp/connect-link", { method: "POST" });
}

export async function disconnectWhatsappAccount(): Promise<void> {
  await apiRequest("/whatsapp/account", { method: "DELETE" });
}

/** Manual freeform WhatsApp send to a lead from the org's connected number. */
export async function sendWhatsappToLead(
  funnelId: string,
  leadId: string,
  payload: { body: string },
): Promise<{ id: string; status: string; fromNumber: string; toNumber: string }> {
  return apiRequest(
    `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/whatsapp`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}
