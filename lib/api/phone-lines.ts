import { apiRequest } from "./client";
import type { PhoneLine, CallRecord, RegulatoryBundle } from "@/lib/types/calling";

// ── Phone Lines ───────────────────────────────────

export async function getPhoneLines(): Promise<PhoneLine[]> {
  return apiRequest<PhoneLine[]>("/phone-lines");
}

export async function getPhoneLine(id: string): Promise<PhoneLine> {
  return apiRequest<PhoneLine>(`/phone-lines/${id}`);
}

export async function updatePhoneLine(
  id: string,
  updates: {
    friendlyName?: string;
    status?: string;
    assignedTo?: string | null;
    assignedToName?: string | null;
    voicemailGreeting?: string;
    callForwardingNumber?: string;
    callRecordingEnabled?: boolean;
  },
): Promise<PhoneLine> {
  return apiRequest<PhoneLine>(`/phone-lines/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function provisionPhoneLine(data: {
  phoneNumber: string;
  friendlyName: string;
  country: string;
  countryCode: string;
  type: string;
  monthlyCost?: number;
  assignedTo?: string | null;
  assignedToName?: string | null;
  bundleId?: string | null;
}): Promise<PhoneLine> {
  return apiRequest<PhoneLine>("/phone-lines/provision", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function releasePhoneLine(id: string): Promise<{ id: string; status: string }> {
  return apiRequest<{ id: string; status: string }>(`/phone-lines/${id}`, {
    method: "DELETE",
  });
}

// ── Call Records ──────────────────────────────────

export async function getCallRecords(params?: {
  lineId?: string;
  direction?: string;
  limit?: number;
  offset?: number;
}): Promise<CallRecord[]> {
  const searchParams = new URLSearchParams();
  if (params?.lineId) searchParams.set("lineId", params.lineId);
  if (params?.direction) searchParams.set("direction", params.direction);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  const qs = searchParams.toString();
  return apiRequest<CallRecord[]>(`/phone-lines/call-records${qs ? `?${qs}` : ""}`);
}

export async function saveCallRecord(data: {
  lineId?: string;
  twilioCallSid?: string;
  direction: string;
  fromNumber: string;
  toNumber: string;
  contactName?: string | null;
  companyName?: string | null;
  duration: number;
  disposition: string;
}): Promise<CallRecord> {
  return apiRequest<CallRecord>("/phone-lines/call-records", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Regulatory Bundles ────────────────────────────

export async function getBundles(): Promise<RegulatoryBundle[]> {
  return apiRequest<RegulatoryBundle[]>("/phone-lines/bundles");
}

export async function createBundle(data: {
  name?: string;
  country: string;
  countryCode: string;
  businessName: string;
  businessAddress?: string;
  identityDocumentName?: string;
}): Promise<RegulatoryBundle> {
  return apiRequest<RegulatoryBundle>("/phone-lines/bundles", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function submitBundle(id: string): Promise<{ id: string; status: string; twilioBundleSid: string | null }> {
  return apiRequest<{ id: string; status: string; twilioBundleSid: string | null }>(
    `/phone-lines/bundles/${id}/submit`,
    { method: "POST" },
  );
}

export async function refreshBundleStatus(id: string): Promise<{ id: string; status: string }> {
  return apiRequest<{ id: string; status: string }>(
    `/phone-lines/bundles/${id}/refresh-status`,
    { method: "POST" },
  );
}
