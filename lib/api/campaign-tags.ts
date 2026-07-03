import { apiRequest } from "./client";
import { hydrateCampaignTags } from "./funnels";
import type { CampaignTag, CampaignTagColor, CampaignTagWithCount } from "@/lib/types/funnel";

type ApiTag = {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  campaignCount: number;
  createdAt: string;
};

function hydrate(t: ApiTag): CampaignTagWithCount {
  const [clean] = hydrateCampaignTags([t]);
  return { ...clean, sortOrder: t.sortOrder ?? 0, campaignCount: t.campaignCount ?? 0 };
}

/** All of the org's campaign tags (with per-tag campaign counts). */
export async function getCampaignTags(): Promise<CampaignTagWithCount[]> {
  const data = await apiRequest<ApiTag[]>("/funnel-tags");
  return data.map(hydrate);
}

export async function createCampaignTag(params: {
  name: string;
  color?: CampaignTagColor;
}): Promise<CampaignTagWithCount> {
  const data = await apiRequest<ApiTag>("/funnel-tags", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return hydrate(data);
}

export async function updateCampaignTag(
  id: string,
  params: { name?: string; color?: CampaignTagColor; sortOrder?: number },
): Promise<CampaignTagWithCount> {
  const data = await apiRequest<ApiTag>(`/funnel-tags/${id}`, {
    method: "PATCH",
    body: JSON.stringify(params),
  });
  return hydrate(data);
}

export async function deleteCampaignTag(id: string): Promise<void> {
  await apiRequest(`/funnel-tags/${id}`, { method: "DELETE" });
}

/** Replace a campaign's tag set; returns the campaign's new tags so callers
 *  can patch the funnels cache without a refetch. */
export async function setFunnelTags(funnelId: string, tagIds: string[]): Promise<CampaignTag[]> {
  const data = await apiRequest<{ funnelId: string; tags: unknown }>(`/funnels/${funnelId}/tags`, {
    method: "PUT",
    body: JSON.stringify({ tagIds }),
  });
  return hydrateCampaignTags(data.tags);
}
