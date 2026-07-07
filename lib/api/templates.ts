import { apiRequest, getAuthToken } from "./client";
import type { Template, TemplateAttachment, TemplateChannel, TemplateCategory } from "@/lib/types/template";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3001";

export async function listTemplates(channel?: TemplateChannel): Promise<Template[]> {
  const qs = channel ? `?channel=${channel}` : "";
  return apiRequest<Template[]>(`/templates${qs}`);
}

export async function getTemplate(id: string): Promise<Template> {
  return apiRequest<Template>(`/templates/${encodeURIComponent(id)}`);
}

export async function createTemplate(data: {
  name: string;
  channel: TemplateChannel;
  category?: TemplateCategory | null;
  subject?: string;
  body: string;
  bodyHtml?: string | null;
  tags?: string[];
  /** Ids of pre-uploaded attachments (from uploadTemplateAttachment) to link. */
  attachmentIds?: string[];
}): Promise<Template> {
  return apiRequest<Template>("/templates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTemplate(
  id: string,
  data: Partial<{
    name: string;
    channel: TemplateChannel;
    category: TemplateCategory | null;
    subject: string | null;
    body: string;
    bodyHtml: string | null;
    tags: string[];
  }>,
): Promise<Template> {
  return apiRequest<Template>(`/templates/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiRequest<{ id: string; deleted: boolean }>(`/templates/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ─── Attachments ────────────────────────────────────────────────────

export async function listTemplateAttachments(templateId: string): Promise<TemplateAttachment[]> {
  return apiRequest<TemplateAttachment[]>(`/templates/${encodeURIComponent(templateId)}/attachments`);
}

/** Multipart upload — bypasses the JSON client so the browser sets the
 *  multipart boundary itself. When `templateId` is null the file is stored as
 *  an orphan and linked later (new template) or attached ad-hoc (composer). */
export async function uploadTemplateAttachment(
  file: File,
  templateId?: string | null,
): Promise<TemplateAttachment> {
  const form = new FormData();
  form.append("file", file, file.name);
  const token = getAuthToken();
  const path = templateId
    ? `/templates/${encodeURIComponent(templateId)}/attachments`
    : `/template-attachments`;
  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(payload?.error?.message || `Upload failed (${res.status})`);
  return payload?.data as TemplateAttachment;
}

export async function deleteTemplateAttachment(attachmentId: string): Promise<void> {
  await apiRequest(`/template-attachments/${encodeURIComponent(attachmentId)}`, { method: "DELETE" });
}
