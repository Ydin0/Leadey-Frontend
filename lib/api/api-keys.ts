import { apiRequest } from "./client";
import type { ApiKey, CreatedApiKey } from "@/lib/types/api-keys";

export async function getApiKeys(): Promise<ApiKey[]> {
  return apiRequest<ApiKey[]>("/api-keys");
}

export async function createApiKey(name: string): Promise<CreatedApiKey> {
  return apiRequest<CreatedApiKey>("/api-keys", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function revokeApiKey(id: string): Promise<void> {
  await apiRequest(`/api-keys/${id}`, { method: "DELETE" });
}
