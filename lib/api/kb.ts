import { apiRequest, getAuthToken } from "./client";
import type {
  KnowledgeBaseData,
  Offer,
  KbModule,
  Lesson,
  LessonType,
  LinkItem,
} from "@/lib/types/kb";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3001";

export async function getKnowledgeBase(): Promise<KnowledgeBaseData> {
  return apiRequest<KnowledgeBaseData>("/knowledge-base");
}

// ── Lesson files (upload / view / delete) ──
/** Multipart upload of a lesson file; returns its metadata to add to the
 *  lesson's `files` on save. Bypasses the JSON client for the multipart body. */
export async function uploadKbFile(file: File): Promise<LinkItem> {
  const form = new FormData();
  form.append("file", file, file.name);
  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}/api/knowledge-base/files`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(payload?.error?.message || `Upload failed (${res.status})`);
  return payload?.data as LinkItem;
}

export async function deleteKbFile(key: string): Promise<void> {
  await apiRequest(`/knowledge-base/files/${encodeURIComponent(key)}`, { method: "DELETE" });
}

/** Fetch an uploaded lesson file (authed) as a blob object URL for embedding
 *  (PDF viewer) or opening. Caller must URL.revokeObjectURL when done. */
export async function kbFileObjectUrl(fileUrl: string): Promise<string> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}/api${fileUrl}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`Could not load file (${res.status})`);
  return URL.createObjectURL(await res.blob());
}

// ── Offers (admin) ──
export async function createOffer(data: {
  name: string;
  tagline?: string;
  category?: string;
  accent?: string;
  level?: string;
  core?: boolean;
  about?: string;
}): Promise<Offer> {
  return apiRequest<Offer>("/knowledge-base/offers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateOffer(
  id: string,
  data: Partial<{ name: string; tagline: string; category: string; accent: string; level: string; core: boolean; about: string }>,
): Promise<void> {
  await apiRequest(`/knowledge-base/offers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteOffer(id: string): Promise<void> {
  await apiRequest(`/knowledge-base/offers/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ── Modules (admin) ──
export async function addModule(offerId: string, title: string): Promise<KbModule> {
  return apiRequest<KbModule>(`/knowledge-base/offers/${encodeURIComponent(offerId)}/modules`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function updateModule(id: string, title: string): Promise<void> {
  await apiRequest(`/knowledge-base/modules/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export async function deleteModule(id: string): Promise<void> {
  await apiRequest(`/knowledge-base/modules/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ── Lessons (admin) ──
export interface LessonInput {
  title: string;
  type: LessonType;
  dur?: string;
  mins?: number;
  summary?: string;
  content?: Record<string, unknown>;
}

export async function addLesson(moduleId: string, data: LessonInput): Promise<Lesson> {
  return apiRequest<Lesson>(`/knowledge-base/modules/${encodeURIComponent(moduleId)}/lessons`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateLesson(id: string, data: Partial<LessonInput>): Promise<void> {
  await apiRequest(`/knowledge-base/lessons/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteLesson(id: string): Promise<void> {
  await apiRequest(`/knowledge-base/lessons/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ── Assignments + progress ──
export async function setOfferAssignments(offerId: string, userIds: string[]): Promise<void> {
  await apiRequest(`/knowledge-base/offers/${encodeURIComponent(offerId)}/assignments`, {
    method: "PUT",
    body: JSON.stringify({ userIds }),
  });
}

export async function getOfferProgress(
  offerId: string,
): Promise<{ totalLessons: number; members: { userId: string; completed: number }[] }> {
  return apiRequest(`/knowledge-base/offers/${encodeURIComponent(offerId)}/progress`);
}

export async function setLessonComplete(lessonId: string, done: boolean): Promise<void> {
  await apiRequest(`/knowledge-base/lessons/${encodeURIComponent(lessonId)}/complete`, {
    method: "POST",
    body: JSON.stringify({ done }),
  });
}
