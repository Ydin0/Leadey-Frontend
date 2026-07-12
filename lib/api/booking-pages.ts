import { apiRequest } from "./client";

export interface TimeRange { start: string; end: string }
export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type WeeklyAvailability = Record<WeekdayKey, TimeRange[]>;

export interface BookingPage {
  id: string;
  userId: string;
  name: string;
  durationMin: number;
  video: boolean;
  timezone: string;
  availability: WeeklyAvailability;
  respectCalendar: boolean;
  /** Participate in the team "All" round-robin pool. */
  roundRobin: boolean;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  minNoticeMin: number;
  maxDaysAhead: number;
  isActive: boolean;
  isDefault: boolean;
}

export type BookingPageInput = Partial<Omit<BookingPage, "id" | "userId" | "isDefault">>;

export interface BookingHost {
  userId: string;
  name: string;
  email: string;
  accountId: string;
  pages: BookingPage[];
}

export interface AvailabilityDay { date: string; slots: string[] }
export interface AvailabilityResult {
  timezone: string;
  durationMin: number;
  video: boolean;
  days: AvailabilityDay[];
}

export const WEEKDAYS: { key: WeekdayKey; label: string }[] = [
  { key: "mon", label: "Monday" }, { key: "tue", label: "Tuesday" }, { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" }, { key: "fri", label: "Friday" }, { key: "sat", label: "Saturday" }, { key: "sun", label: "Sunday" },
];

export async function listMyBookingPages(): Promise<BookingPage[]> {
  return apiRequest<BookingPage[]>("/booking-pages");
}

export async function createBookingPage(input: BookingPageInput): Promise<BookingPage> {
  return apiRequest<BookingPage>("/booking-pages", { method: "POST", body: JSON.stringify(input) });
}

export async function updateBookingPage(id: string, input: BookingPageInput): Promise<BookingPage> {
  return apiRequest<BookingPage>(`/booking-pages/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function deleteBookingPage(id: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/booking-pages/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function listBookingHosts(): Promise<BookingHost[]> {
  return apiRequest<BookingHost[]>("/booking-pages/hosts");
}

export async function getPageAvailability(pageId: string, from: string, to: string): Promise<AvailabilityResult> {
  return apiRequest<AvailabilityResult>(
    `/booking-pages/${encodeURIComponent(pageId)}/availability?from=${from}&to=${to}`,
  );
}

/** Combined availability across every rep's round-robin booking page. */
export async function getRoundRobinAvailability(from: string, to: string): Promise<AvailabilityResult> {
  return apiRequest<AvailabilityResult>(`/booking-pages/availability/round-robin?from=${from}&to=${to}`);
}
