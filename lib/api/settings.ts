import { apiRequest } from "./client";

export interface SmartleadStatus {
  connected: boolean;
  maskedKey: string | null;
}

export async function getSmartleadStatus(): Promise<SmartleadStatus> {
  return apiRequest<SmartleadStatus>("/settings/integrations/smartlead");
}

export async function connectSmartlead(apiKey: string): Promise<SmartleadStatus> {
  return apiRequest<SmartleadStatus>("/settings/integrations/smartlead", {
    method: "PUT",
    body: JSON.stringify({ apiKey }),
  });
}

export async function disconnectSmartlead(): Promise<{ connected: false }> {
  return apiRequest<{ connected: false }>("/settings/integrations/smartlead", {
    method: "DELETE",
  });
}

export interface SmartleadEmailAccountItem {
  id: number;
  email: string;
  fromName: string;
  isActive: boolean;
  selected: boolean;
}

export async function getSmartleadEmailAccounts(): Promise<{
  accounts: SmartleadEmailAccountItem[];
}> {
  return apiRequest<{ accounts: SmartleadEmailAccountItem[] }>(
    "/settings/integrations/smartlead/email-accounts",
  );
}

export async function saveSmartleadEmailAccounts(
  emailAccountIds: number[],
): Promise<{ saved: boolean }> {
  return apiRequest<{ saved: boolean }>(
    "/settings/integrations/smartlead/email-accounts",
    {
      method: "PUT",
      body: JSON.stringify({ emailAccountIds }),
    },
  );
}
