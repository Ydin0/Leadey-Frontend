import { apiRequest, getAuthToken } from "./client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3001";

export interface LeadDocument {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedBy: string | null;
  uploadedByName: string | null;
  createdAt: string;
}

export async function listLeadDocuments(funnelId: string, leadId: string): Promise<LeadDocument[]> {
  return apiRequest<LeadDocument[]>(
    `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/documents`,
  );
}

/** Multipart upload — bypasses the JSON client (no Content-Type header so the
 *  browser sets the multipart boundary itself). */
export async function uploadLeadDocument(
  funnelId: string,
  leadId: string,
  file: File,
): Promise<LeadDocument> {
  const form = new FormData();
  form.append("file", file, file.name);
  const token = getAuthToken();
  const res = await fetch(
    `${API_BASE_URL}/api/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/documents`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    },
  );
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.error?.message || `Upload failed (${res.status})`);
  }
  return payload?.data as LeadDocument;
}

export async function deleteLeadDocument(documentId: string): Promise<void> {
  await apiRequest(`/lead-documents/${encodeURIComponent(documentId)}`, { method: "DELETE" });
}

/** Download via an authed fetch (the endpoint needs the Bearer token, so a
 *  plain <a href> won't work) and hand the bytes to the browser. */
export async function downloadLeadDocument(doc: LeadDocument): Promise<void> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}/api/lead-documents/${encodeURIComponent(doc.id)}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
