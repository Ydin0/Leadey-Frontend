import { apiRequest } from "./client";

export interface LinkedInRateUsage {
  invitations: { today: number; dailyLimit: number; weekTotal: number; weeklyLimit: number };
  messages: { today: number; dailyLimit: number };
  profileViews: { today: number; dailyLimit: number };
}

/** A rep's LinkedIn account connected via Unipile hosted auth. */
export interface LinkedInAccount {
  id: string;
  userId: string;
  ownerName: string | null;
  unipileAccountId: string;
  name: string | null;
  publicIdentifier: string | null;
  profileUrl: string | null;
  status: string; // connected | error
  lastError: string | null;
  createdAt: string;
  usage: LinkedInRateUsage | null;
}

export async function listLinkedInAccounts(): Promise<LinkedInAccount[]> {
  return apiRequest<LinkedInAccount[]>("/linkedin/accounts");
}

/** Returns the Unipile hosted-auth URL to redirect the current rep to. */
export async function connectLinkedIn(): Promise<{ url: string }> {
  return apiRequest<{ url: string }>("/linkedin/accounts/connect", { method: "POST" });
}

export async function disconnectLinkedInAccount(id: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/linkedin/accounts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ── Inbox: conversations, messages, sent connection requests ────────────

export interface LinkedInThread {
  key: string;
  providerId: string;
  leadId: string | null;
  funnelId: string | null;
  contactName: string;
  company: string | null;
  lastBody: string;
  lastDirection: "inbound" | "outbound";
  lastAt: string;
  total: number;
  needsReply: boolean;
}

export interface LinkedInMessage {
  id: string;
  direction: "inbound" | "outbound";
  text: string;
  senderName: string | null;
  leadId: string | null;
  createdAt: string;
}

export interface LinkedInInvitation {
  id: string;
  providerId: string;
  leadId: string | null;
  funnelId: string | null;
  name: string;
  company: string | null;
  status: "pending" | "accepted" | "withdrawn" | "failed";
  sentAt: string;
  acceptedAt: string | null;
}

export async function getLinkedInThreads(): Promise<LinkedInThread[]> {
  return apiRequest<LinkedInThread[]>("/linkedin/threads");
}

export async function getLinkedInThread(providerId: string): Promise<LinkedInMessage[]> {
  return apiRequest<LinkedInMessage[]>(`/linkedin/thread?providerId=${encodeURIComponent(providerId)}`);
}

export async function getLinkedInInvitations(): Promise<LinkedInInvitation[]> {
  return apiRequest<LinkedInInvitation[]>("/linkedin/invitations");
}

export async function sendLinkedInMessage(funnelId: string, leadId: string, text: string): Promise<{ ok: boolean }> {
  return apiRequest(`/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/linkedin/message`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

/** Pull recent LinkedIn conversations from Unipile into the inbox (on open). */
export async function syncLinkedIn(): Promise<{ ok: boolean }> {
  return apiRequest("/linkedin/sync", { method: "POST" });
}
