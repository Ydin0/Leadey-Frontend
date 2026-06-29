import { apiRequest } from "./client";

export type TaskCategoryColor = "slate" | "blue" | "green" | "red" | "amber" | "violet";

export interface TaskCategoryDef {
  key: string;
  label: string;
  color: TaskCategoryColor;
}

export async function getTaskCategories(): Promise<TaskCategoryDef[]> {
  return apiRequest<TaskCategoryDef[]>("/task-categories");
}

export async function saveTaskCategories(categories: TaskCategoryDef[]): Promise<TaskCategoryDef[]> {
  return apiRequest<TaskCategoryDef[]>("/task-categories", {
    method: "PUT",
    body: JSON.stringify({ categories }),
  });
}

/** Default fallback shown before the org's categories load. */
export const DEFAULT_TASK_CATEGORIES: TaskCategoryDef[] = [
  { key: "follow_up", label: "Follow up", color: "blue" },
  { key: "call_back", label: "Call back", color: "green" },
  { key: "email", label: "Email", color: "slate" },
  { key: "reminder", label: "Reminder", color: "amber" },
  { key: "general", label: "Task", color: "slate" },
];

/** Chip classes (bg + text) per semantic colour, for category tags. */
export const CATEGORY_CHIP_CLASS: Record<TaskCategoryColor, string> = {
  slate: "bg-signal-slate/20 text-signal-slate-text",
  blue: "bg-signal-blue/15 text-signal-blue-text",
  green: "bg-signal-green/15 text-signal-green-text",
  red: "bg-signal-red/15 text-signal-red-text",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
};

/** Dot background per semantic colour, for the dropdown rows. */
export const CATEGORY_DOT_CLASS: Record<TaskCategoryColor, string> = {
  slate: "bg-signal-slate-text",
  blue: "bg-signal-blue-text",
  green: "bg-signal-green-text",
  red: "bg-signal-red-text",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
};
