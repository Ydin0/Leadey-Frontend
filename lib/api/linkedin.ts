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
