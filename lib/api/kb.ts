import { apiRequest } from "./client";
import type {
  KnowledgeBaseData,
  Offer,
  KbModule,
  Lesson,
  LessonType,
} from "@/lib/types/kb";

export async function getKnowledgeBase(): Promise<KnowledgeBaseData> {
  return apiRequest<KnowledgeBaseData>("/knowledge-base");
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
