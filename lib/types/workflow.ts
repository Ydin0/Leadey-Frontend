/** A workflow graph node — `type` is one of the builder block types and `data`
 *  holds the per-type config (shape depends on type). */
export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  x: number;
  y: number;
  data: Record<string, unknown>;
}

/** A directed connection. `port` is the source output port:
 *  "out" (default), "yes"/"no" (condition), "a"/"b" (A-B split). */
export interface WorkflowEdge {
  id: string;
  from: string;
  port: string;
  to: string;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowSettings {
  reEnroll?: boolean;
  exitOnReply?: boolean;
  exitOnMeeting?: boolean;
  sendingWindow?: Record<string, unknown> | null;
}

export type WorkflowStatus = "draft" | "active" | "paused";

export type WorkflowNodeType =
  | "trigger"
  | "email"
  | "sms"
  | "whatsapp"
  | "linkedin"
  | "call"
  | "wait"
  | "waitevent"
  | "condition"
  | "abtest"
  | "status"
  | "tag"
  | "field"
  | "assign"
  | "webhook"
  | "goal"
  | "end";

export interface WorkflowStats {
  enrolled: number;
  active: number;
  completed: number;
  exited?: number;
  failed?: number;
}

export type EnrollmentStatus = "active" | "completed" | "exited" | "failed";

export interface WorkflowEnrollment {
  id: string;
  status: EnrollmentStatus;
  currentNodeId: string | null;
  nextRunAt: string | null;
  waitingFor: string | null;
  lastError: string | null;
  enteredAt: string;
  completedAt: string | null;
  lead: { id: string; name: string; company: string; email: string };
}

export interface WorkflowStepRun {
  id: string;
  nodeId: string;
  type: string;
  status: "done" | "failed" | "skipped";
  detail: Record<string, unknown>;
  ranAt: string;
}

export interface Workflow {
  id: string;
  funnelId: string;
  name: string;
  status: WorkflowStatus;
  graph: WorkflowGraph;
  settings: WorkflowSettings;
  stats: WorkflowStats;
  createdAt: string;
  updatedAt: string;
}
