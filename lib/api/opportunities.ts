import { apiRequest, apiRequestRaw } from "./client";
import type {
  Pipeline,
  PipelineStage,
  PipelineMember,
  Opportunity,
  OpportunityDetail,
  OpportunityEvent,
  OpportunitySummary,
  StageType,
} from "@/lib/types/opportunity";

// ── Pipelines ───────────────────────────────────────────────────────

export async function listPipelines(): Promise<Pipeline[]> {
  return apiRequest<Pipeline[]>("/pipelines");
}

// ── Pipeline members ────────────────────────────────────────────────

export async function getPipelineMembers(pipelineId: string): Promise<PipelineMember[]> {
  return apiRequest<PipelineMember[]>(`/pipelines/${encodeURIComponent(pipelineId)}/members`);
}

export async function addPipelineMember(pipelineId: string, userId: string, role = "contributor"): Promise<PipelineMember> {
  return apiRequest<PipelineMember>(`/pipelines/${encodeURIComponent(pipelineId)}/members`, {
    method: "POST",
    body: JSON.stringify({ userId, role }),
  });
}

export async function removePipelineMember(pipelineId: string, userId: string): Promise<void> {
  await apiRequest(`/pipelines/${encodeURIComponent(pipelineId)}/members/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

export async function createPipeline(data: {
  name: string;
  description?: string;
}): Promise<Pipeline> {
  return apiRequest<Pipeline>("/pipelines", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePipeline(
  id: string,
  data: Partial<{ name: string; description: string; isDefault: boolean; sortOrder: number }>,
): Promise<Pipeline> {
  return apiRequest<Pipeline>(`/pipelines/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/** Duplicate a pipeline and its stages (not its opportunities). */
export async function duplicatePipeline(id: string): Promise<Pipeline> {
  return apiRequest<Pipeline>(`/pipelines/${id}/duplicate`, { method: "POST" });
}

export interface DeletePipelineOptions {
  /** What to do with the pipeline's opportunities. Omit when the pipeline is empty. */
  strategy?: "move" | "delete";
  /** Required when strategy is "move" — the pipeline to move opportunities into. */
  targetPipelineId?: string;
  /** Required when strategy is "move" — a stage within the target pipeline. */
  targetStageId?: string;
}

export async function deletePipeline(
  id: string,
  options?: DeletePipelineOptions,
): Promise<void> {
  await apiRequest(`/pipelines/${id}`, {
    method: "DELETE",
    body: options ? JSON.stringify(options) : undefined,
  });
}

// ── Stages ──────────────────────────────────────────────────────────

export async function createStage(
  pipelineId: string,
  data: {
    label: string;
    slug?: string;
    type?: StageType;
    defaultProbability?: number;
    color?: string;
  },
): Promise<PipelineStage> {
  return apiRequest<PipelineStage>(`/pipelines/${pipelineId}/stages`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateStage(
  pipelineId: string,
  stageId: string,
  data: Partial<{ label: string; type: StageType; defaultProbability: number; color: string }>,
): Promise<PipelineStage> {
  return apiRequest<PipelineStage>(`/pipelines/${pipelineId}/stages/${stageId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function reorderStages(pipelineId: string, stageIds: string[]): Promise<void> {
  await apiRequest(`/pipelines/${pipelineId}/stages/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ stageIds }),
  });
}

export async function deleteStage(pipelineId: string, stageId: string): Promise<void> {
  await apiRequest(`/pipelines/${pipelineId}/stages/${stageId}`, { method: "DELETE" });
}

// ── Opportunities ───────────────────────────────────────────────────

export async function listOpportunities(params: {
  pipelineId?: string;
  stageId?: string;
  ownerId?: string;
  q?: string;
  closeDateBefore?: string;
  summary?: boolean;
} = {}): Promise<{ data: Opportunity[]; summary: OpportunitySummary | null }> {
  const qs = new URLSearchParams();
  if (params.pipelineId) qs.set("pipelineId", params.pipelineId);
  if (params.stageId) qs.set("stageId", params.stageId);
  if (params.ownerId) qs.set("ownerId", params.ownerId);
  if (params.q) qs.set("q", params.q);
  if (params.closeDateBefore) qs.set("closeDateBefore", params.closeDateBefore);
  if (params.summary) qs.set("summary", "1");
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return apiRequestRaw<{ data: Opportunity[]; summary: OpportunitySummary | null }>(
    `/opportunities${query}`,
  );
}

export async function getOpportunity(id: string): Promise<OpportunityDetail> {
  return apiRequest<OpportunityDetail>(`/opportunities/${id}`);
}

export async function createOpportunity(data: {
  pipelineId: string;
  stageId: string;
  name: string;
  masterCompanyId?: string;
  masterContactId?: string;
  ownerId?: string;
  sourceLeadId?: string;
  value?: number;
  currency?: string;
  probabilityOverride?: number;
  expectedCloseDate?: string;
  notes?: string;
}): Promise<Opportunity> {
  return apiRequest<Opportunity>("/opportunities", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateOpportunity(
  id: string,
  data: Partial<{
    name: string;
    pipelineId: string;
    stageId: string;
    masterCompanyId: string | null;
    masterContactId: string | null;
    ownerId: string | null;
    value: number;
    currency: string;
    probabilityOverride: number | null;
    expectedCloseDate: string | null;
    notes: string | null;
    lostReason: string | null;
  }>,
): Promise<Opportunity> {
  return apiRequest<Opportunity>(`/opportunities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteOpportunity(id: string): Promise<void> {
  await apiRequest(`/opportunities/${id}`, { method: "DELETE" });
}

export async function winOpportunity(id: string): Promise<Opportunity> {
  return apiRequest<Opportunity>(`/opportunities/${id}/win`, { method: "POST" });
}

export async function loseOpportunity(id: string, reason?: string): Promise<Opportunity> {
  return apiRequest<Opportunity>(`/opportunities/${id}/lose`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function reopenOpportunity(id: string): Promise<Opportunity> {
  return apiRequest<Opportunity>(`/opportunities/${id}/reopen`, { method: "POST" });
}

// ── Events ──────────────────────────────────────────────────────────

export async function listOpportunityEvents(id: string): Promise<OpportunityEvent[]> {
  return apiRequest<OpportunityEvent[]>(`/opportunities/${id}/events`);
}

export async function addOpportunityNote(id: string, note: string): Promise<OpportunityEvent> {
  return apiRequest<OpportunityEvent>(`/opportunities/${id}/events`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

// ── Convert ─────────────────────────────────────────────────────────

export async function convertLead(
  leadId: string,
  data: {
    pipelineId: string;
    stageId: string;
    name?: string;
    value?: number;
    currency?: string;
    expectedCloseDate?: string;
    ownerId?: string;
    notes?: string;
  },
): Promise<Opportunity> {
  return apiRequest<Opportunity>(`/leads/${leadId}/convert`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
