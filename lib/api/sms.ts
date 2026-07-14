import { apiRequest } from "./client";

export interface SmsMessage {
  id: string;
  direction: "outbound" | "inbound";
  /** "sms" | "whatsapp" — the thread endpoints return both; drawers filter. */
  channel?: string;
  fromNumber: string;
  toNumber: string;
  body: string;
  status: string;
  userId: string | null;
  createdAt: string;
}

/** Send a text to a lead. Optionally choose which line to send from (admins can
 *  text from any active number). Returns the persisted outbound message. */
export async function sendSms(
  funnelId: string,
  leadId: string,
  body: string,
  lineId?: string | null,
): Promise<SmsMessage> {
  return apiRequest<SmsMessage>(
    `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/sms`,
    { method: "POST", body: JSON.stringify({ body, lineId: lineId || undefined }) },
  );
}

/** The full SMS conversation with a lead, oldest first. */
export async function getSmsThread(funnelId: string, leadId: string): Promise<SmsMessage[]> {
  return apiRequest<SmsMessage[]>(
    `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/sms`,
  );
}

/** The full SMS conversation with a counterparty number (matched on the last 10
 *  digits), oldest first. For inbox rows that aren't linked to a lead. */
export async function getSmsThreadByPhone(phone: string): Promise<SmsMessage[]> {
  return apiRequest<SmsMessage[]>(`/sms/thread-by-phone?phone=${encodeURIComponent(phone)}`);
}

/** An org-wide SMS conversation grouped by the counterparty phone number. */
export interface SmsThread {
  key: string;
  phone: string;
  leadId: string | null;
  funnelId: string | null;
  contactName: string | null;
  company: string | null;
  companyDomain: string | null;
  /** Canonical company id — deep-links to the universal company profile. */
  masterCompanyId: string | null;
  /** Channel of the latest message ("sms" | "whatsapp"). */
  channel?: string;
  lastBody: string;
  lastDirection: "inbound" | "outbound";
  lastAt: string;
  inboundCount: number;
  total: number;
  needsReply: boolean;
  /** The org phone line this conversation is on (latest message), + its owner —
   *  so the inbox can mark which of our numbers the text hit and filter by it. */
  lineId?: string | null;
  lineNumber?: string | null;
  assignedTo?: string | null;
  assignedToName?: string | null;
}

/** All SMS conversations across the org, latest first (incl. unmatched). */
export async function getSmsThreads(): Promise<SmsThread[]> {
  return apiRequest<SmsThread[]>("/sms/threads");
}
