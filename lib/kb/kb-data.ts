/**
 * Knowledge Base runtime store + helpers.
 *
 * Content is loaded from the backend (see lib/api/kb.ts) and held here so the
 * existing components can keep importing OFFERS/OFFER_MAP/progress/helpers.
 * Nothing is hardcoded — `setOffers()` is populated by the KB hub after fetch.
 * Lesson completion is persisted server-side; only the "last viewed" pointer
 * stays in localStorage (per-device convenience).
 */

import { setLessonComplete } from "@/lib/api/kb";
import type { Offer, Lesson } from "@/lib/types/kb";

export * from "@/lib/types/kb";

// ── Runtime dataset (populated from the API) ─────────────────────────────
export let OFFERS: Offer[] = [];
export let OFFER_MAP: Record<string, Offer> = {};

export function setOffers(offers: Offer[]) {
  OFFERS = offers;
  OFFER_MAP = Object.fromEntries(offers.map((o) => [o.id, o]));
}

export function lessonsOf(offer: Offer): Lesson[] {
  return offer.modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleId: m.id, moduleTitle: m.title, offerId: offer.id })),
  );
}
export function allLessons(): Lesson[] {
  return OFFERS.flatMap(lessonsOf);
}
export function lessonById(id: string): Lesson | undefined {
  return allLessons().find((l) => l.id === id);
}

export function offerStats(offer: Offer) {
  const ls = lessonsOf(offer);
  return { lessons: ls.length, mins: ls.reduce((a, l) => a + (l.mins || 0), 0), modules: offer.modules.length };
}

// ── progress (server-backed; last-viewed in localStorage) ────────────────
const KEY = "leadey_kb_last_v1";
let done: Record<string, boolean> = {};
let lastId = "";

export const progress = {
  /** Seed the completion map from the API payload (call after fetch). */
  seed(serverDone: Record<string, boolean>) {
    done = { ...serverDone };
    if (typeof window !== "undefined" && !lastId) {
      try { lastId = localStorage.getItem(KEY) || ""; } catch { /* ignore */ }
    }
  },
  isDone: (id: string) => !!done[id],
  /** Optimistically flip locally + persist to the backend. */
  setDone: (id: string, v: boolean) => {
    if (v) done[id] = true;
    else delete done[id];
    void setLessonComplete(id, v).catch(() => {});
  },
  toggle: (id: string) => {
    const next = !done[id];
    progress.setDone(id, next);
    return next;
  },
  last: () => lastId,
  setLast: (id: string) => {
    lastId = id;
    if (typeof window !== "undefined") {
      try { localStorage.setItem(KEY, id); } catch { /* ignore */ }
    }
  },
  countDone: (ids: string[]) => ids.filter((id) => done[id]).length,
};

export function offerProgress(offer: Offer) {
  const ids = lessonsOf(offer).map((l) => l.id);
  const d = progress.countDone(ids);
  return { done: d, total: ids.length, pct: ids.length ? d / ids.length : 0 };
}
export function nextLesson(offerId: string, lessonId: string): Lesson | null {
  const offer = OFFER_MAP[offerId];
  if (!offer) return null;
  const ls = lessonsOf(offer);
  const i = ls.findIndex((l) => l.id === lessonId);
  return i >= 0 && i < ls.length - 1 ? ls[i + 1] : null;
}
export function prevLesson(offerId: string, lessonId: string): Lesson | null {
  const offer = OFFER_MAP[offerId];
  if (!offer) return null;
  const ls = lessonsOf(offer);
  const i = ls.findIndex((l) => l.id === lessonId);
  return i > 0 ? ls[i - 1] : null;
}
