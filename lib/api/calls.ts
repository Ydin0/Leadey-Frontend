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
  /** Default because the lead is in a US state with no owned number. */
  usUncovered?: boolean;
  stateName?: string | null;
  areaCode?: string | null;
  canProvision?: boolean;
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

export interface OwnedLocalLine {
  id: string;
  number: string;
  areaCode: string | null;
  state: string;
  stateName: string;
}

export interface LocalPresenceCoverage {
  lines: OwnedLocalLine[];
  config: LocalPresenceConfig;
  isAdmin: boolean;
  monthlyCostPerNumber: number;
}

export async function getLocalPresenceCoverage(): Promise<LocalPresenceCoverage> {
  return apiRequest("/calls/local-presence/coverage");
}

export interface UncoveredState {
  state: string;
  stateName: string;
  sampleAreaCode: string;
  leadCount: number;
}

export async function coverageScan(
  params: { phones?: string[]; sessionId?: string },
): Promise<{ uncovered: UncoveredState[]; ownedByState: Record<string, number>; monthlyCostPerNumber: number }> {
  return apiRequest("/calls/coverage-scan", { method: "POST", body: JSON.stringify(params) });
}

/** Buy one local US number (admin-gated server-side). */
export async function provisionLocalNumber(
  opts: { areaCode?: string; state?: string },
): Promise<{ id: string; number: string; areaCode: string; state: string }> {
  return apiRequest("/calls/provision-local", { method: "POST", body: JSON.stringify(opts) });
}
