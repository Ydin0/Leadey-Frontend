import { apiRequest } from "./client";
import type { FilterGroup } from "@/lib/types/lead-filter";

export interface SmartView {
  id: string;
  scope: "campaign" | "org";
  funnelId: string | null;
  name: string;
  definition: FilterGroup;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getSmartViews(scope: "campaign" | "org", funnelId?: string): Promise<SmartView[]> {
  const params = new URLSearchParams({ scope });
  if (funnelId) params.set("funnelId", funnelId);
  return apiRequest<SmartView[]>(`/smart-views?${params}`);
}

export async function createSmartView(input: {
  scope: "campaign" | "org";
  funnelId?: string;
  name: string;
  definition: FilterGroup;
}): Promise<SmartView> {
  return apiRequest<SmartView>("/smart-views", { method: "POST", body: JSON.stringify(input) });
}

export async function updateSmartView(
  id: string,
  patch: { name?: string; definition?: FilterGroup },
): Promise<SmartView> {
  return apiRequest<SmartView>(`/smart-views/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteSmartView(id: string): Promise<void> {
  await apiRequest(`/smart-views/${encodeURIComponent(id)}`, { method: "DELETE" });
}
