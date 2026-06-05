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

export interface RepKpi {
  value: number;
  goal: number;
}

export interface RepTask {
  id: string;
  label: string;
  dueAt: string | null;
  done: boolean;
  leadId: string;
  funnelId: string;
  leadName: string;
  company: string;
  campaignName: string;
  group: "overdue" | "today";
}

export interface RepDashboardData {
  kpis: {
    calls: RepKpi;
    emails: RepKpi;
    linkedin: RepKpi;
    replies: RepKpi;
    tasks: RepKpi;
  };
  tasks: RepTask[];
}

export function getRepDashboard(): Promise<RepDashboardData> {
  return apiRequest<RepDashboardData>("/dashboard/rep");
}

export function handleReply(leadId: string, action: string): Promise<void> {
  return apiRequest(`/dashboard/replies/${leadId}/handle`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}
