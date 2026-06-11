import { apiRequest } from "./client";

export interface SmsMessage {
  id: string;
  direction: "outbound" | "inbound";
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
