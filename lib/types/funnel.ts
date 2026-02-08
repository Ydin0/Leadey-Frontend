export type FunnelStatus = "active" | "paused" | "draft";

export type FunnelChannel = "email" | "linkedin" | "call";

export interface FunnelStep {
  id: string;
  channel: FunnelChannel;
  label: string;
  dayOffset: number;
}

export type FunnelLeadStatus =
  | "pending"
  | "sent"
  | "opened"
  | "clicked"
  | "replied"
  | "bounced"
  | "completed";

export interface FunnelSource {
  type: "csv" | "signals" | "webhook" | "companies";
  label: string;
  count: number;
}

export interface FunnelMetrics {
  total: number;
  active: number;
  replied: number;
  replyRate: number;
  bounced: number;
  completed: number;
}

export interface FunnelLead {
  id: string;
  name: string;
  company: string;
  title: string;
  email: string;
  currentStep: number;
  totalSteps: number;
  status: FunnelLeadStatus;
  nextAction: string;
  nextDate: Date;
  source: string;
  score: number;
}

export interface FunnelAnalyticsStep {
  label: string;
  channel: FunnelChannel;
  sent: number;
  opened: number;
  replied: number;
  openRate: number;
  replyRate: number;
}

export interface CockpitLinkedInItem {
  id: string;
  name: string;
  title: string;
  company: string;
  type: "connect" | "message";
  message: string;
  profileUrl: string;
}

export interface CockpitCallItem {
  id: string;
  name: string;
  title: string;
  company: string;
  phone: string;
  script: {
    hook: string;
    talkingPoints: string[];
    objectionHandlers: string[];
  };
}

export interface CockpitEmailSummary {
  sentToday: number;
  scheduled: number;
  opened: number;
  openRate: number;
  replied: number;
  replyRate: number;
}

export interface FunnelCockpit {
  linkedin: CockpitLinkedInItem[];
  calls: CockpitCallItem[];
  email: CockpitEmailSummary;
}

export interface Funnel {
  id: string;
  name: string;
  description: string;
  status: FunnelStatus;
  steps: FunnelStep[];
  metrics: FunnelMetrics;
  sources: FunnelSource[];
  leads: FunnelLead[];
  cockpit: FunnelCockpit;
  analyticsSteps: FunnelAnalyticsStep[];
  createdAt: Date;
}
