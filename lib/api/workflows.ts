import { apiRequest } from "./client";
import type { Workflow, WorkflowGraph, WorkflowSettings, WorkflowStatus, WorkflowEnrollment, WorkflowStepRun } from "@/lib/types/workflow";

// Campaign workflows live under /funnels/:id/workflows; org-level workflows
// (funnelId = null) use the standalone /workflows[/:id] routes. Every function
// takes `funnelId: string | null` and picks the right base automatically.
const base = (funnelId: string | null) =>
  funnelId ? `/funnels/${encodeURIComponent(funnelId)}/workflows` : `/workflows`;
const one = (funnelId: string | null, id: string) => `${base(funnelId)}/${encodeURIComponent(id)}`;

/** Every workflow in the org (campaign + org-level), each carrying funnelName +
 *  triggerType — powers the top-level Workflows page. */
export async function listAllWorkflows(): Promise<Workflow[]> {
  return apiRequest<Workflow[]>("/workflows");
}

/** Create an org-level workflow (funnelId = null) with a starting trigger. */
export async function createOrgWorkflow(name: string, triggerLabel: string): Promise<Workflow> {
  return apiRequest<Workflow>("/workflows", { method: "POST", body: JSON.stringify({ name, funnelId: null, triggerLabel }) });
}

export async function listWorkflows(funnelId: string | null): Promise<Workflow[]> {
  return apiRequest<Workflow[]>(base(funnelId));
}

export async function createWorkflow(funnelId: string, name?: string): Promise<Workflow> {
  return apiRequest<Workflow>(base(funnelId), {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function getWorkflow(funnelId: string | null, workflowId: string): Promise<Workflow> {
  return apiRequest<Workflow>(one(funnelId, workflowId));
}

export interface UpdateWorkflowPayload {
  name?: string;
  status?: WorkflowStatus;
  graph?: WorkflowGraph;
  settings?: WorkflowSettings;
}

export async function updateWorkflow(
  funnelId: string | null,
  workflowId: string,
  payload: UpdateWorkflowPayload,
): Promise<Workflow> {
  return apiRequest<Workflow>(one(funnelId, workflowId), {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteWorkflow(funnelId: string | null, workflowId: string): Promise<void> {
  await apiRequest(one(funnelId, workflowId), { method: "DELETE" });
}

/** The activity view: leads that have run through the workflow. */
export async function listEnrollments(funnelId: string | null, workflowId: string): Promise<WorkflowEnrollment[]> {
  return apiRequest<WorkflowEnrollment[]>(`${one(funnelId, workflowId)}/enrollments`);
}

/** Per-step log for one enrollment (incl. failure detail). */
export async function listEnrollmentRuns(funnelId: string | null, workflowId: string, enrollmentId: string): Promise<WorkflowStepRun[]> {
  return apiRequest<WorkflowStepRun[]>(`${one(funnelId, workflowId)}/enrollments/${encodeURIComponent(enrollmentId)}/runs`);
}

/** Re-run a finished/failed enrollment (reactivates it for the next tick).
 *  (Org-level standalone has no retry route yet — campaign only.) */
export async function retryEnrollment(funnelId: string | null, workflowId: string, enrollmentId: string): Promise<void> {
  await apiRequest(`${one(funnelId, workflowId)}/enrollments/${encodeURIComponent(enrollmentId)}/retry`, { method: "POST" });
}

/** Manually enroll specific leads into a workflow (it must be active to run). */
export async function enrollLeads(
  funnelId: string | null,
  workflowId: string,
  leadIds: string[],
): Promise<{ enrolled: number }> {
  return apiRequest<{ enrolled: number }>(`${one(funnelId, workflowId)}/enroll`, {
    method: "POST",
    body: JSON.stringify({ leadIds }),
  });
}
