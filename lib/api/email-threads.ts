import { apiRequest } from "./client";

/** One org-wide email conversation (thread = all messages for one lead). */
export interface EmailThreadSummary {
  leadId: string;
  funnelId: string | null;
  funnelName: string | null;
  leadName: string;
  leadTitle: string;
  company: string;
  leadEmail: string;
  status: string;
  ownerId: string | null;
  ownerName: string | null;
  subject: string;
  preview: string;
  lastAt: string;
  lastDirection: "inbound" | "outbound";
  messageCount: number;
  hasInbound: boolean;
  unread: boolean;
  starred: boolean;
  archived: boolean;
  snoozedUntil: string | null;
}

export interface EmailThreadMessage {
  id: string;
  direction: "inbound" | "outbound";
  fromName: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyHtml: string;
  openedAt: string | null;
  status: string;
  createdAt: string;
}

export interface EmailThreadDetail {
  lead: {
    id: string;
    name: string;
    title: string;
    company: string;
    email: string;
    status: string;
    funnelId: string;
    funnelName: string | null;
    ownerId: string | null;
    ownerName: string | null;
  };
  messages: EmailThreadMessage[];
}

export type ThreadBulkAction =
  | "read" | "unread" | "archive" | "unarchive" | "star" | "unstar" | "snooze" | "unsnooze";

export interface ThreadPatch {
  unread?: boolean;
  starred?: boolean;
  archived?: boolean;
  snoozedUntil?: string | null;
}

export async function listEmailThreads(): Promise<EmailThreadSummary[]> {
  return apiRequest<EmailThreadSummary[]>("/email/threads");
}

/** Full conversation + lead context. Opening marks the thread read server-side. */
export async function getEmailThread(leadId: string): Promise<EmailThreadDetail> {
  return apiRequest<EmailThreadDetail>(`/email/threads/${encodeURIComponent(leadId)}`);
}

export async function patchEmailThread(leadId: string, patch: ThreadPatch): Promise<void> {
  await apiRequest(`/email/threads/${encodeURIComponent(leadId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function bulkEmailThreads(
  leadIds: string[],
  action: ThreadBulkAction,
  snoozedUntil?: string,
): Promise<void> {
  await apiRequest("/email/threads/bulk", {
    method: "POST",
    body: JSON.stringify({ leadIds, action, snoozedUntil }),
  });
}

/** AI-drafted next reply for the conversation (plain text body). */
export async function aiDraftReply(leadId: string): Promise<string> {
  const res = await apiRequest<{ draft: string }>(
    `/email/threads/${encodeURIComponent(leadId)}/ai-draft`,
    { method: "POST", body: JSON.stringify({}) },
  );
  return res.draft;
}
