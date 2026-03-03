import type { LeadStatus } from "./funnel-focus";

export type { LeadStatus };

export type FunnelStatus = "active" | "paused" | "draft";

export type FunnelChannel = "email" | "linkedin" | "call" | "whatsapp";

export interface FunnelStep {
  id: string;
  channel: FunnelChannel;
  label: string;
  dayOffset: number;
  subject?: string;
  emailBody?: string;
  action?: string;
}

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
  status: LeadStatus;
  nextAction: string;
  nextDate: Date;
  source: string;
  score: number;
  phone?: string | null;
  companyDomain?: string;
  notes?: Record<string, string>;
  linkedinUrl?: string;
  unipileProviderId?: string | null;
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

export interface LinkedInActionProgress {
  completed: number;
  limit: number;
  totalPending: number;
}

export interface CockpitLinkedInItem {
  id: string;
  leadId: string;
  name: string;
  title: string;
  company: string;
  type: "view" | "connect" | "message";
  action?: string;
  message: string;
  profileUrl: string;
}

export interface CockpitWhatsAppItem {
  id: string;
  name: string;
  title: string;
  company: string;
  phone: string;
  message: string;
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
  linkedinProgress: Record<string, LinkedInActionProgress>;
  calls: CockpitCallItem[];
  whatsapp: CockpitWhatsAppItem[];
  email: CockpitEmailSummary;
}

export interface FunnelMember {
  teamMemberId: string;
  role: "owner" | "contributor" | "viewer";
  addedAt: Date;
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
  members: FunnelMember[];
  createdAt: Date;
}
