import { apiRequest } from "./client";
import type { LeadTask, TaskCategory } from "./lead-tasks";

export type TaskGroup = "overdue" | "today" | "upcoming" | "done";

/** A task enriched for the unified Inbox: the base task + its time bucket and
 *  the lead/company/campaign it belongs to (null for standalone tasks). */
export interface InboxTask extends LeadTask {
  group: TaskGroup;
  leadName: string | null;
  company: string | null;
  campaignName: string | null;
}

export interface TaskFilters {
  /** A member's Clerk id, "mine" (default), or "all" (admins/managers only). */
  assigneeId?: string | "mine" | "all";
  category?: TaskCategory;
  status?: "open" | "done" | "all";
  search?: string;
}

/** Org-wide task list for the Inbox Tasks/Reminders tabs. */
export async function getTasks(filters: TaskFilters = {}): Promise<InboxTask[]> {
  const qs = new URLSearchParams();
  if (filters.assigneeId) qs.set("assigneeId", filters.assigneeId);
  if (filters.category) qs.set("category", filters.category);
  if (filters.status) qs.set("status", filters.status);
  if (filters.search) qs.set("search", filters.search);
  const query = qs.toString();
  return apiRequest<InboxTask[]>(`/tasks${query ? `?${query}` : ""}`);
}

/** Create a task/reminder from the Inbox. Lead is optional (standalone). */
export async function createTask(data: {
  label: string;
  category?: TaskCategory;
  dueAt?: string | null;
  assigneeId?: string | null;
  leadId?: string | null;
  funnelId?: string | null;
}): Promise<LeadTask> {
  return apiRequest<LeadTask>("/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
