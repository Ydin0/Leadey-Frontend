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

/** PUT /api/lead-statuses — replace the org's custom statuses. Returns the
 *  full merged list (built-ins + saved custom). */
export async function saveCustomLeadStatuses(
  custom: CustomLeadStatusInput[],
): Promise<LeadStatusOption[]> {
  return apiRequest<LeadStatusOption[]>("/lead-statuses", {
    method: "PUT",
    body: JSON.stringify({ custom }),
  });
}
