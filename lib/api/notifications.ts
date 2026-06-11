import { apiRequestRaw, apiRequest } from "./client";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  leadId: string | null;
  funnelId: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  data: AppNotification[];
  meta: { unreadCount: number };
}

/** This rep's notifications + unread count. */
export async function listNotifications(): Promise<NotificationsResponse> {
  return apiRequestRaw<NotificationsResponse>("/notifications");
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiRequest("/notifications/read-all", { method: "POST" });
}
