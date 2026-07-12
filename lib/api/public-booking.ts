// Public (unauthenticated) booking API — called from /book/[slug]. Hits the
// backend's public booking router directly (no Clerk token).
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

async function pub<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api/public/booking${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || "Request failed");
  return json.data as T;
}

export interface PublicBookingPage {
  orgName: string;
  hostLabel: string;
  page: { name: string; durationMin: number; video: boolean; timezone: string };
}
export interface PublicAvailability {
  timezone: string;
  durationMin: number;
  video: boolean;
  days: { date: string; slots: string[] }[];
}
export interface PublicBookingResult {
  title: string;
  joinUrl: string | null;
  startTime: string;
  endTime: string;
  timezone: string;
}

export async function getPublicPage(slug: string): Promise<PublicBookingPage> {
  return pub<PublicBookingPage>(`/${encodeURIComponent(slug)}`);
}
export async function getPublicAvailability(slug: string, from: string, to: string): Promise<PublicAvailability> {
  return pub<PublicAvailability>(`/${encodeURIComponent(slug)}/availability?from=${from}&to=${to}`);
}
export async function publicBook(
  slug: string,
  body: { startISO: string; name: string; email: string; guests?: string[]; notes?: string },
): Promise<PublicBookingResult> {
  return pub<PublicBookingResult>(`/${encodeURIComponent(slug)}/book`, { method: "POST", body: JSON.stringify(body) });
}
