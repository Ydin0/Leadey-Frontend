import { apiRequest } from "./client";

export type CallOutcomeColor = "slate" | "blue" | "green" | "red" | "amber" | "violet";

export interface CallOutcome {
  key: string;
  label: string;
  color: CallOutcomeColor;
}

/** Semantic colour → dot/badge classes (mirrors lead-status tokens). */
export const OUTCOME_COLOR_DOT: Record<CallOutcomeColor, string> = {
  slate: "bg-signal-slate-text",
  blue: "bg-signal-blue-text",
  green: "bg-signal-green-text",
  red: "bg-signal-red-text",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
};
export const OUTCOME_COLOR_BADGE: Record<CallOutcomeColor, string> = {
  slate: "bg-signal-slate text-signal-slate-text",
  blue: "bg-signal-blue text-signal-blue-text",
  green: "bg-signal-green text-signal-green-text",
  red: "bg-signal-red text-signal-red-text",
  amber: "bg-amber-500/15 text-amber-600",
  violet: "bg-violet-500/15 text-violet-500",
};

export async function getCallOutcomes(): Promise<CallOutcome[]> {
  return apiRequest<CallOutcome[]>("/call-outcomes");
}

export async function saveCallOutcomes(outcomes: CallOutcome[]): Promise<CallOutcome[]> {
  return apiRequest<CallOutcome[]>("/call-outcomes", {
    method: "PUT",
    body: JSON.stringify({ outcomes }),
  });
}
