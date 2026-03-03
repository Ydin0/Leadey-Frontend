import { apiRequest } from "./client";

export interface UnipileStatus {
  platformConfigured: boolean;
  connected: boolean;
  accountName: string | null;
  accountId: string | null;
}

export interface UnipileAccountItem {
  id: string;
  name: string;
  type: string;
  status: string;
}

export interface RateLimitUsage {
  invitations: { today: number; dailyLimit: number; weekTotal: number; weeklyLimit: number };
  messages: { today: number; dailyLimit: number };
  profileViews: { today: number; dailyLimit: number };
}

export interface LinkedInActionResult {
  success: boolean;
  rateLimits: RateLimitUsage;
}

export interface ConnectLinkedInResult {
  account_id: string;
  status: string;
  checkpoint?: { type: string };
}

// Status
export async function getUnipileStatus(): Promise<UnipileStatus> {
  return apiRequest<UnipileStatus>("/settings/integrations/unipile");
}

// Disconnect user's LinkedIn account
export async function disconnectUnipile(): Promise<{ connected: false }> {
  return apiRequest<{ connected: false }>("/settings/integrations/unipile", {
    method: "DELETE",
  });
}

// List connected LinkedIn accounts from Unipile
export async function getUnipileAccounts(): Promise<{ accounts: UnipileAccountItem[] }> {
  return apiRequest<{ accounts: UnipileAccountItem[] }>(
    "/settings/integrations/unipile/accounts",
  );
}

// Select which LinkedIn account to use
export async function selectUnipileAccount(
  accountId: string,
  accountName?: string,
): Promise<{ saved: boolean }> {
  return apiRequest<{ saved: boolean }>("/settings/integrations/unipile/account", {
    method: "PUT",
    body: JSON.stringify({ accountId, accountName }),
  });
}

// Connect a LinkedIn account via username/password
export async function connectLinkedInAccount(
  username: string,
  password: string,
): Promise<ConnectLinkedInResult> {
  return apiRequest<ConnectLinkedInResult>(
    "/settings/integrations/unipile/connect-linkedin",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    },
  );
}

// Handle 2FA/OTP during LinkedIn connection
export async function resolveCheckpoint(
  accountId: string,
  code: string,
): Promise<ConnectLinkedInResult> {
  return apiRequest<ConnectLinkedInResult>(
    "/settings/integrations/unipile/checkpoint",
    {
      method: "POST",
      body: JSON.stringify({ accountId, code }),
    },
  );
}

// Cockpit actions
export async function getUnipileRateLimits(): Promise<RateLimitUsage> {
  return apiRequest<RateLimitUsage>("/integrations/unipile/rate-limits");
}

export async function executeLinkedInAction(
  funnelId: string,
  leadId: string,
): Promise<LinkedInActionResult> {
  return apiRequest<LinkedInActionResult>(
    `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/linkedin-action`,
    { method: "POST" },
  );
}
