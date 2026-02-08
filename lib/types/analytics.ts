export type AnalyticsPeriod = "7d" | "30d" | "90d";

export type AnalyticsViewMode = "manager" | "rep";

export interface PeriodValue {
  "7d": number;
  "30d": number;
  "90d": number;
}

export interface AnalyticsKpiSet {
  pipelineGeneratedUsd: PeriodValue;
  meetingsBooked: PeriodValue;
  replyRatePct: PeriodValue;
  avgResponseMinutes: PeriodValue;
  winRatePct: PeriodValue;
  creditsPerMeeting: PeriodValue;
}

export interface TeamMemberPerformance {
  id: string;
  name: string;
  role: "manager" | "rep";
  team: string;
  pipelineGeneratedUsd: PeriodValue;
  meetingsBooked: PeriodValue;
  repliesHandled: PeriodValue;
  replyRatePct: PeriodValue;
  avgResponseMinutes: PeriodValue;
  winRatePct: PeriodValue;
  creditsUsed: PeriodValue;
}

export interface ChannelAnalytics {
  channel: "email" | "linkedin" | "call";
  sentOrExecuted: PeriodValue;
  replies: PeriodValue;
  replyRatePct: PeriodValue;
  meetingRatePct: PeriodValue;
}

export interface FunnelHealthSnapshot {
  funnelId: string;
  funnelName: string;
  owner: string;
  status: "active" | "paused" | "draft";
  activeLeads: PeriodValue;
  replyRatePct: PeriodValue;
  meetingsBooked: PeriodValue;
  riskLevel: "healthy" | "watch" | "at_risk";
}

export interface SourceEfficiencySnapshot {
  source: "signals" | "csv" | "webhook" | "companies";
  leadsAdded: PeriodValue;
  qualifiedLeads: PeriodValue;
  meetingsBooked: PeriodValue;
  qualificationRatePct: PeriodValue;
  creditsPerQualifiedLead: PeriodValue;
}

export interface DailyActivityPoint {
  label: string;
  emailsSent: number;
  linkedinActions: number;
  callsMade: number;
  repliesReceived: number;
}

export interface GoalTrackingSnapshot {
  id: string;
  label: string;
  target: number;
  actual: number;
  unit: "count" | "usd" | "pct";
}

export interface AnalyticsInsight {
  id: string;
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

export interface AnalyticsSnapshot {
  teamName: string;
  kpis: AnalyticsKpiSet;
  teamPerformance: TeamMemberPerformance[];
  channels: ChannelAnalytics[];
  funnels: FunnelHealthSnapshot[];
  sources: SourceEfficiencySnapshot[];
  dailyActivity: DailyActivityPoint[];
  goals: GoalTrackingSnapshot[];
  insights: AnalyticsInsight[];
}
