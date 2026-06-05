import { apiRequest } from "./client";

export interface LeadTask {
  id: string;
  funnelId: string;
  leadId: string;
  label: string;
  dueAt: string | null;
  done: boolean;
  assigneeId: string | null;
  assigneeName: string | null;
  createdBy: string | null;
  createdAt: string;
}

export async function getLeadTasks(funnelId: string, leadId: string): Promise<LeadTask[]> {
  return apiRequest<LeadTask[]>(`/funnels/${funnelId}/leads/${leadId}/tasks`);
}

export async function createLeadTask(
  funnelId: string,
  leadId: string,
  data: { label: string; dueAt?: string | null; assigneeId?: string | null },
): Promise<LeadTask> {
  return apiRequest<LeadTask>(`/funnels/${funnelId}/leads/${leadId}/tasks`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateLeadTask(
  taskId: string,
  data: Partial<{ label: string; done: boolean; dueAt: string | null; assigneeId: string | null }>,
): Promise<LeadTask> {
  return apiRequest<LeadTask>(`/lead-tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteLeadTask(taskId: string): Promise<void> {
  await apiRequest(`/lead-tasks/${taskId}`, { method: "DELETE" });
}
