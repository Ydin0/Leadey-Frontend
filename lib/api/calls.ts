import { apiRequest } from "./client";

export interface LocalPresenceConfig {
  enabled: boolean;
  perNumberDailyCap: number;
  maxNumbers: number;
  whoCanProvision: "admin" | "anyone";
}

export interface ResolvedCallerId {
  source: "match" | "default";
  callerId: string | null;
  lineId: string | null;
  state: string | null;
}

/** Local-presence config for the org + whether the current user can edit it. */
export async function getLocalPresenceConfig(): Promise<{ config: LocalPresenceConfig; isAdmin: boolean }> {
  return apiRequest("/calls/local-presence-config");
}

export async function saveLocalPresenceConfig(
  patch: Partial<LocalPresenceConfig>,
): Promise<LocalPresenceConfig> {
  return apiRequest("/calls/local-presence-config", { method: "PUT", body: JSON.stringify(patch) });
}

/** Resolve the best owned caller-ID for a destination (local presence). When
 *  source is "default", the caller should use its normal selected line. */
export async function resolveCallerId(to: string): Promise<ResolvedCallerId> {
  return apiRequest("/calls/resolve-caller-id", { method: "POST", body: JSON.stringify({ to }) });
}
