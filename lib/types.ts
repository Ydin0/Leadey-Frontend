import type { LucideIcon } from "lucide-react";

export interface Reply {
  id: string;
  contact: {
    name: string;
    title: string;
    avatarUrl?: string;
  };
  company: string;
  channel: "email" | "linkedin";
  message: string;
  timestamp: Date;
  status: "unhandled" | "interested" | "not_interested" | "snoozed";
  sequence?: string;
  funnel?: string;
}

export interface LinkedInQueueItem {
  id: string;
  type: "connection_request" | "message";
  contact: {
    name: string;
    title: string;
    company: string;
  };
  message: string;
  profileUrl: string;
  status: "pending" | "sent" | "skipped";
}

export interface CallQueueItem {
  id: string;
  contact: {
    name: string;
    title: string;
    company: string;
  };
  phone: string;
  script: {
    hook: string;
    talkingPoints: string[];
    objectionHandlers: { objection: string; response: string }[];
    qualifyingQuestions: string[];
  };
  status: "pending" | "completed" | "skipped";
  outcome?: "interested" | "not_interested" | "voicemail" | "no_answer" | "busy";
}

export interface EmailNeedsAttention {
  id: string;
  contact: string;
  company: string;
  type: "bounce" | "delivery_issue" | "unsubscribe";
  detail: string;
}

export interface EmailSummary {
  sentToday: number;
  opens: number;
  openRate: number;
  replies: number;
  replyRate: number;
  bounces: number;
  bounceRate: number;
  needsAttention: EmailNeedsAttention[];
}

export interface Signal {
  id: string;
  source: "hiring" | "funding" | "tech_adoption" | "news" | "job_change" | "expansion" | "intent" | "social";
  company: string;
  summary: string;
  relevanceScore: number;
  timestamp: Date;
  dismissed?: boolean;
}

export interface QuickStat {
  id: string;
  label: string;
  value: number;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  type: "reply" | "signal" | "system" | "sequence" | "alert";
}

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
}
