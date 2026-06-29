import { apiRequest } from "./client";
import type { LeadStatusOption } from "@/lib/utils/lead-status";

/** Custom status fields editable by the user (built-ins are read-only). */
export type CustomLeadStatusInput = {
  key?: string;
  label: string;
  color: LeadStatusOption["color"];
  isTerminal: boolean;
};

/** GET /api/lead-statuses — built-in + custom statuses for the org. */
export async function getLeadStatuses(): Promise<LeadStatusOption[]> {
  return apiRequest<LeadStatusOption[]>("/lead-statuses");
}

/** PUT /api/lead-statuses — replace the org's custom statuses, the set of
 *  hidden built-in statuses, and the display order. Returns the full merged
 *  list (visible built-ins + saved custom, sorted by `order`). `hidden` is the
 *  list of built-in keys to hide; `order` is the full list of status keys in
 *  the order they should appear in pickers. */
export async function saveCustomLeadStatuses(
  custom: CustomLeadStatusInput[],
  hidden?: string[],
  order?: string[],
): Promise<LeadStatusOption[]> {
  return apiRequest<LeadStatusOption[]>("/lead-statuses", {
    method: "PUT",
    body: JSON.stringify({
      custom,
      ...(hidden ? { hidden } : {}),
      ...(order ? { order } : {}),
    }),
  });
}
