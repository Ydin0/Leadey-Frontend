import { apiRequest } from "./client";
import type { Template, TemplateChannel, TemplateCategory } from "@/lib/types/template";

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
  tags?: string[];
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
