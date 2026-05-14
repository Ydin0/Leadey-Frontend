import { apiRequest, apiRequestRaw, getAuthToken } from "./client";
import type { PhoneLine, CallRecord, RegulatoryBundle, BundleDocument } from "@/lib/types/calling";

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
  userId?: string;
  disposition?: string;
  hasRecording?: string;
  search?: string;
  page?: number;
  limit?: number;
  offset?: number;
}): Promise<{ data: CallRecord[]; meta: { page: number; pageSize: number; totalCount: number; totalPages: number } }> {
  const searchParams = new URLSearchParams();
  if (params?.lineId) searchParams.set("lineId", params.lineId);
  if (params?.direction) searchParams.set("direction", params.direction);
  if (params?.userId) searchParams.set("userId", params.userId);
  if (params?.disposition) searchParams.set("disposition", params.disposition);
  if (params?.hasRecording) searchParams.set("hasRecording", params.hasRecording);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  const qs = searchParams.toString();
  return apiRequestRaw<{ data: CallRecord[]; meta: { page: number; pageSize: number; totalCount: number; totalPages: number } }>(`/phone-lines/call-records${qs ? `?${qs}` : ""}`);
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
  userId?: string;
  userName?: string;
}): Promise<CallRecord> {
  return apiRequest<CallRecord>("/phone-lines/call-records", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function summarizeCall(
  callRecordId: string,
): Promise<{ transcript: string | null; summary: string | null }> {
  return apiRequest<{ transcript: string | null; summary: string | null }>(
    `/phone-lines/call-records/${callRecordId}/summarize`,
    { method: "POST" },
  );
}

// ── Regulatory Bundles ────────────────────────────

export async function getBundles(): Promise<RegulatoryBundle[]> {
  return apiRequest<RegulatoryBundle[]>("/phone-lines/bundles");
}

export async function createBundle(data: {
  name?: string;
  country: string;
  countryCode: string;
  // Business
  businessName: string;
  businessType?: string;
  businessRegistrationAuthority?: string;
  businessRegistrationNumber?: string;
  businessWebsite?: string;
  businessClassification?: string;
  // Address
  addressStreet1?: string;
  addressStreet2?: string;
  addressCity?: string;
  addressSubdivision?: string;
  addressPostalCode?: string;
  // Authorized representative
  representativeFirstName?: string;
  representativeLastName?: string;
  representativeEmail?: string;
  representativePhone?: string;
  // Legacy
  businessAddress?: string;
  contactEmail?: string;
  contactPhone?: string;
  identityDocumentName?: string;
}): Promise<RegulatoryBundle> {
  return apiRequest<RegulatoryBundle>("/phone-lines/bundles", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Auto-allocates a random available number for the given country+type.
 *  The backend picks the number, attaches the org's approved bundle (if
 *  required), and provisions in one call — no UI search/select. */
export async function autoAllocatePhoneLine(payload: {
  countryCode: string;
  country?: string;
  type?: "local" | "mobile" | "national" | "toll-free";
  assignedTo?: string;
  assignedToName?: string;
}): Promise<PhoneLine> {
  return apiRequest<PhoneLine>("/phone-lines/auto-allocate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBundle(
  bundleId: string,
  data: Partial<{
    name: string;
    businessName: string;
    businessType: string;
    businessRegistrationAuthority: string;
    businessRegistrationNumber: string;
    businessWebsite: string;
    businessClassification: string;
    addressStreet1: string;
    addressStreet2: string;
    addressCity: string;
    addressSubdivision: string;
    addressPostalCode: string;
    representativeFirstName: string;
    representativeLastName: string;
    representativeEmail: string;
    representativePhone: string;
  }>,
): Promise<RegulatoryBundle> {
  return apiRequest<RegulatoryBundle>(`/phone-lines/bundles/${bundleId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getBundleDocuments(bundleId: string): Promise<BundleDocument[]> {
  return apiRequest<BundleDocument[]>(`/phone-lines/bundles/${bundleId}/documents`);
}

export async function uploadBundleDocument(
  bundleId: string,
  file: File,
  documentType: string,
): Promise<BundleDocument> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("documentType", documentType);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3001";
  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}/api/phone-lines/bundles/${bundleId}/documents`, {
    method: "POST",
    headers,
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Upload failed (${response.status})`);
  }
  return payload.data;
}

export async function deleteBundleDocument(bundleId: string, docId: string): Promise<void> {
  await apiRequest(`/phone-lines/bundles/${bundleId}/documents/${docId}`, { method: "DELETE" });
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
