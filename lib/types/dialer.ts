export type DispositionOutcomeBucket = "contacted" | "not_contacted" | "negative";
export type FunnelAction = "advance" | "retry" | "drop" | "none";

export interface CallDisposition {
  id: string;
  slug: string;
  label: string;
  outcomeBucket: DispositionOutcomeBucket;
  funnelAction: FunnelAction;
  retryAfterDays: number | null;
  sortOrder: number;
  hotkey: string | null;
  color: string | null;
  isSystem: boolean;
}

export interface VoicemailDrop {
  id: string;
  userId: string | null;
  name: string;
  recordingUrl: string;
  durationSeconds: number;
  isDefault: boolean;
  createdAt: string;
}

export interface FunnelDispositionRule {
  id: string;
  funnelStepId: string;
  dispositionId: string;
  funnelAction: FunnelAction;
  retryAfterDays: number | null;
}

export type DialerSessionStatus = "active" | "paused" | "completed" | "abandoned";

export interface DialerSessionFilters {
  excludeDoNotCall: boolean;
  excludeRecentlyCalled: boolean;
  respectTimezone: boolean;
  maxAttempts: number | null;
}

export interface DialerSession {
  id: string;
  userId: string;
  funnelStepId: string;
  status: DialerSessionStatus;
  totalLeads: number;
  completedLeads: number;
  currentLeadIndex: number;
  dispositions: Record<string, number>;
  filters: DialerSessionFilters;
  startedAt: string;
  endedAt: string | null;
}

export type QueueItemStatus =
  | "pending"
  | "in_progress"
  | "awaiting_disposition"
  | "completed"
  | "skipped"
  | "failed";

export interface DialerLead {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  doNotCall?: boolean;
}

export interface DialerMasterContact {
  id: string;
  headline: string | null;
  location: string | null;
  timezone: string | null;
  doNotCall: boolean;
  lastCalledAt: string | null;
  callAttempts: number;
}

export interface DialerQueueItem {
  id: string;
  sessionId: string;
  leadId: string;
  masterContactId: string | null;
  leadPhone: string;
  position: number;
  status: QueueItemStatus;
  dispositionId: string | null;
  callRecordId: string | null;
  notes: string | null;
  calledAt: string | null;
  lead?: DialerLead;
  masterContact?: DialerMasterContact;
}

export interface DialerCurrentResponse {
  session: DialerSession;
  current: DialerQueueItem | null;
  upcoming: DialerQueueItem[];
}

export interface DialerAdvanceResponse {
  next: DialerQueueItem | null;
  ruleApplied: FunnelAction;
  sessionComplete: boolean;
}

/** SSE event payloads */
export type DialerEvent =
  | { type: "recording-complete"; callRecordId: string; recordingUrl: string }
  | { type: "vm-dropped"; callSid: string; voicemailId: string }
  | { type: "amd-detected"; callSid: string; answeredBy: string };
