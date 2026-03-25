import { apiRequest } from "./client";
import type { Reply, LinkedInQueueItem, CallQueueItem, EmailSummary } from "@/lib/types";

export interface DashboardData {
  replies: Reply[];
  linkedin: (LinkedInQueueItem & { funnelId?: string; leadId?: string })[];
  linkedinProgress: Record<string, { completed: number; limit: number; totalPending: number }>;
  calls: (CallQueueItem & { funnelId?: string; leadId?: string })[];
  email: EmailSummary;
}

export function getDashboard(): Promise<DashboardData> {
  return apiRequest<DashboardData>("/dashboard");
}

export function handleReply(leadId: string, action: string): Promise<void> {
  return apiRequest(`/dashboard/replies/${leadId}/handle`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}
