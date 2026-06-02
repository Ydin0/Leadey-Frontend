import type { EmailNeedsAttention } from "@/lib/types";

export type EmailDirection = "outbound" | "inbound";
export type EmailEventType = "sent" | "opened" | "clicked" | "replied" | "bounced";
export type ReplySentiment = "interested" | "not_interested" | "neutral";
export type ThreadStatus = "active" | "snoozed" | "closed";
export type WarmupStatus = "warming" | "active" | "paused";

/** A connected sending mailbox (Smartlead email account, white-labelled). */
export interface SendingAccount {
  id: string;
  email: string;
  fromName: string;
  isActive: boolean;
  warmupStatus: WarmupStatus;
  dailyLimit: number;
  sentToday: number;
  /** 0–100 deliverability/health score. */
  healthScore: number;
}

/** A single email in a thread — outbound (from a rep/sequence) or inbound. */
export interface EmailMessage {
  id: string;
  threadId: string;
  direction: EmailDirection;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  /** Sanitised HTML body (already personalized for display). */
  bodyHtml: string;
  sentAt: string; // ISO
  // Outbound tracking
  openedAt?: string | null;
  repliedAt?: string | null;
  bounced?: boolean;
  /** Which campaign step produced this message (0-indexed), if any. */
  stepIndex?: number | null;
}

/** A conversation with one lead — the unit shown in the inbox and per-lead
 *  thread panel. */
export interface EmailThread {
  id: string;
  leadId: string;
  leadName: string;
  leadTitle: string;
  company: string;
  contactEmail: string;
  funnelId: string | null;
  funnelName: string | null;
  subject: string;
  lastMessageAt: string; // ISO
  lastMessagePreview: string;
  unread: boolean;
  sentiment: ReplySentiment | null;
  status: ThreadStatus;
  messageCount: number;
  /** Populated by getThread(); omitted in list views. */
  messages?: EmailMessage[];
}

/** Honest email stats for the dashboard monitor — sentToday is real sends,
 *  NOT "leads updated in 24h". */
export interface EmailStats {
  sentToday: number;
  scheduled: number;
  opens: number;
  openRate: number;
  replies: number;
  replyRate: number;
  bounces: number;
  bounceRate: number;
  needsAttention: EmailNeedsAttention[];
}

export interface CampaignEmailStepStat {
  stepIndex: number;
  label: string;
  sent: number;
  opened: number;
  replied: number;
}

export interface CampaignEmailAnalytics {
  funnelId: string;
  sent: number;
  opened: number;
  replied: number;
  bounced: number;
  openRate: number;
  replyRate: number;
  bounceRate: number;
  perStep: CampaignEmailStepStat[];
  timeline: { date: string; sent: number; opened: number; replied: number }[];
}

/** Payload for composing/sending a new email from a lead. */
export interface SendEmailPayload {
  leadId: string;
  funnelId?: string | null;
  fromAccountId: string;
  toEmail: string;
  subject: string;
  bodyHtml: string;
  /** Set when this send completes a campaign step. */
  stepIndex?: number | null;
  scheduledAt?: string | null;
}

export interface InboxFilters {
  view?: "all" | "unread" | "interested" | "needs_reply";
  funnelId?: string | null;
  search?: string;
}
