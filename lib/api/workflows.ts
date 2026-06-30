import { apiRequest } from "./client";
import type { Workflow, WorkflowGraph, WorkflowSettings, WorkflowStatus } from "@/lib/types/workflow";

const base = (funnelId: string) => `/funnels/${encodeURIComponent(funnelId)}/workflows`;

export async function listWorkflows(funnelId: string): Promise<Workflow[]> {
  return apiRequest<Workflow[]>(base(funnelId));
}

export async function createWorkflow(funnelId: string, name?: string): Promise<Workflow> {
  return apiRequest<Workflow>(base(funnelId), {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function getWorkflow(funnelId: string, workflowId: string): Promise<Workflow> {
  return apiRequest<Workflow>(`${base(funnelId)}/${encodeURIComponent(workflowId)}`);
}

export interface UpdateWorkflowPayload {
  name?: string;
  status?: WorkflowStatus;
  graph?: WorkflowGraph;
  settings?: WorkflowSettings;
}

export async function updateWorkflow(
  funnelId: string,
  workflowId: string,
  payload: UpdateWorkflowPayload,
): Promise<Workflow> {
  return apiRequest<Workflow>(`${base(funnelId)}/${encodeURIComponent(workflowId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteWorkflow(funnelId: string, workflowId: string): Promise<void> {
  await apiRequest(`${base(funnelId)}/${encodeURIComponent(workflowId)}`, { method: "DELETE" });
}
