import { apiRequest } from "./client";
import type { CustomFieldDefinition } from "@/lib/types/custom-field";

/** Editable shape for a custom field definition (sortOrder is assigned by the
 *  backend from list order if omitted). */
export type CustomFieldInput = {
  key?: string;
  label: string;
  fieldType: CustomFieldDefinition["fieldType"];
  options?: string[];
  isRequired?: boolean;
};

/** GET /api/custom-fields — the org's custom lead field definitions. */
export async function listCustomFields(): Promise<CustomFieldDefinition[]> {
  return apiRequest<CustomFieldDefinition[]>("/custom-fields");
}

/** PUT /api/custom-fields — replace the org's custom field definitions. */
export async function saveCustomFields(
  fields: CustomFieldInput[],
): Promise<CustomFieldDefinition[]> {
  return apiRequest<CustomFieldDefinition[]>("/custom-fields", {
    method: "PUT",
    body: JSON.stringify({ fields }),
  });
}
