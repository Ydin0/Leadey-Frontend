/**
 * Email API client — Smartlead white-label.
 *
 * These are FRONTEND STUBS: each returns mock data today but is shaped exactly
 * for the future backend endpoints. To go live, replace each body with the
 * `apiRequest(...)` call shown in its `// TODO(backend)` note — nothing else in
 * the app needs to change.
 */
import type {
  SendingAccount,
  EmailThread,
  EmailStats,
  CampaignEmailAnalytics,
  SendEmailPayload,
  EmailMessage,
  ReplySentiment,
  InboxFilters,
} from "@/lib/types/email";
import {
  mockSendingAccounts,
  mockEmailThreads,
  mockEmailStats,
  mockCampaignEmailAnalytics,
} from "@/lib/mock-data/email";

/** Simulate network latency so loading states are exercised in the UI. */
const delay = <T>(value: T, ms = 250): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

// In-memory thread store so sends/replies/sentiment persist within a session.
let threadStore: EmailThread[] = mockEmailThreads.map((t) => ({
  ...t,
  messages: t.messages ? [...t.messages] : [],
}));

/** GET /api/email/stats — honest send/open/reply/bounce numbers.
 *  TODO(backend): compute from leadEvents where outcome='sent' today, etc. */
export async function getEmailStats(): Promise<EmailStats> {
  // TODO(backend): return apiRequest<EmailStats>("/email/stats");
  return delay(mockEmailStats);
}

/** GET /api/email/sending-accounts — connected Smartlead mailboxes. */
export async function listSendingAccounts(): Promise<SendingAccount[]> {
  // TODO(backend): return apiRequest<SendingAccount[]>("/email/sending-accounts");
  return delay(mockSendingAccounts);
}

/** GET /api/email/threads — inbox list, filtered. */
export async function listInboxThreads(
  filters: InboxFilters = {},
): Promise<EmailThread[]> {
  // TODO(backend): return apiRequest<EmailThread[]>(`/email/threads?${qs}`);
  let rows = threadStore.map(({ messages: _messages, ...rest }) => rest as EmailThread);
  if (filters.view === "unread") rows = rows.filter((t) => t.unread);
  if (filters.view === "interested") rows = rows.filter((t) => t.sentiment === "interested");
  if (filters.view === "needs_reply") {
    rows = rows.filter((t) => {
      const full = threadStore.find((x) => x.id === t.id);
      return full?.messages?.[full.messages.length - 1]?.direction === "inbound";
    });
  }
  if (filters.funnelId) rows = rows.filter((t) => t.funnelId === filters.funnelId);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(
      (t) =>
        t.leadName.toLowerCase().includes(q) ||
        t.company.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q),
    );
  }
  return delay(
    [...rows].sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt)),
  );
}

/** GET /api/email/threads/:id — full conversation, marks read. */
export async function getThread(threadId: string): Promise<EmailThread | null> {
  // TODO(backend): return apiRequest<EmailThread>(`/email/threads/${threadId}`);
  const t = threadStore.find((x) => x.id === threadId);
  if (t) t.unread = false;
  return delay(t ? { ...t, messages: [...(t.messages || [])] } : null);
}

/** GET the thread for a given lead (per-lead thread panel). */
export async function getThreadByLead(leadId: string): Promise<EmailThread | null> {
  // TODO(backend): return apiRequest<EmailThread>(`/email/threads/by-lead/${leadId}`);
  const t = threadStore.find((x) => x.leadId === leadId);
  return delay(t ? { ...t, messages: [...(t.messages || [])] } : null);
}

/** POST /api/email/send — send a new email / first touch from a lead. */
export async function sendEmail(
  payload: SendEmailPayload,
): Promise<EmailMessage> {
  // TODO(backend): return apiRequest<EmailMessage>("/email/send", { method: "POST", body: JSON.stringify(payload) });
  const account = mockSendingAccounts.find((a) => a.id === payload.fromAccountId) ?? mockSendingAccounts[0];
  const msg: EmailMessage = {
    id: `m_${Date.now()}`,
    threadId: `th_${payload.leadId}`,
    direction: "outbound",
    fromName: account.fromName,
    fromEmail: account.email,
    toEmail: payload.toEmail,
    subject: payload.subject,
    bodyHtml: payload.bodyHtml,
    sentAt: new Date().toISOString(),
    openedAt: null,
    stepIndex: payload.stepIndex ?? null,
  };
  let t = threadStore.find((x) => x.leadId === payload.leadId);
  if (!t) {
    t = {
      id: msg.threadId, leadId: payload.leadId, leadName: payload.toEmail, leadTitle: "",
      company: "", contactEmail: payload.toEmail, funnelId: payload.funnelId ?? null, funnelName: null,
      subject: payload.subject, lastMessageAt: msg.sentAt, lastMessagePreview: "", unread: false,
      sentiment: null, status: "active", messageCount: 0, messages: [],
    };
    threadStore = [t, ...threadStore];
  }
  t.messages = [...(t.messages || []), msg];
  t.messageCount = t.messages.length;
  t.lastMessageAt = msg.sentAt;
  t.lastMessagePreview = msg.bodyHtml.replace(/<[^>]+>/g, " ").trim().slice(0, 120);
  return delay(msg, 400);
}

/** POST /api/email/threads/:id/reply — reply within an existing thread. */
export async function replyToThread(
  threadId: string,
  payload: { fromAccountId: string; bodyHtml: string },
): Promise<EmailMessage> {
  // TODO(backend): return apiRequest(`/email/threads/${threadId}/reply`, { method: "POST", ... });
  const t = threadStore.find((x) => x.id === threadId);
  const account = mockSendingAccounts.find((a) => a.id === payload.fromAccountId) ?? mockSendingAccounts[0];
  const msg: EmailMessage = {
    id: `m_${Date.now()}`,
    threadId,
    direction: "outbound",
    fromName: account.fromName,
    fromEmail: account.email,
    toEmail: t?.contactEmail || "",
    subject: t ? `Re: ${t.subject}` : "Re:",
    bodyHtml: payload.bodyHtml,
    sentAt: new Date().toISOString(),
  };
  if (t) {
    t.messages = [...(t.messages || []), msg];
    t.messageCount = t.messages.length;
    t.lastMessageAt = msg.sentAt;
    t.lastMessagePreview = msg.bodyHtml.replace(/<[^>]+>/g, " ").trim().slice(0, 120);
    t.unread = false;
  }
  return delay(msg, 400);
}

/** PATCH /api/email/threads/:id — set reply sentiment / status. */
export async function setThreadSentiment(
  threadId: string,
  sentiment: ReplySentiment,
): Promise<void> {
  // TODO(backend): await apiRequest(`/email/threads/${threadId}`, { method: "PATCH", body: JSON.stringify({ sentiment }) });
  const t = threadStore.find((x) => x.id === threadId);
  if (t) t.sentiment = sentiment;
  await delay(null);
}

/** GET /api/funnels/:id/email-analytics — per-campaign email performance. */
export async function getCampaignEmailAnalytics(
  funnelId: string,
): Promise<CampaignEmailAnalytics> {
  // TODO(backend): return apiRequest(`/funnels/${funnelId}/email-analytics`);
  return delay(mockCampaignEmailAnalytics(funnelId));
}
