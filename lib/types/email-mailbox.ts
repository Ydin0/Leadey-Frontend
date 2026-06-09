export type WarmupState = "on" | "ramp" | "off";
export type MailboxStatus = "active" | "paused" | "disconnected";

export interface EmailMailbox {
  id: string;
  email: string;
  name: string;
  domainId: string | null;
  smartleadAccountId: string | null;
  provider: string;
  warmup: WarmupState;
  warmScore: number;
  sentToday: number;
  dailyLimit: number;
  reputation: number;
  status: MailboxStatus;
  assignedTo: string | null;
  campaign: string | null;
  createdAt: string;
  updatedAt: string;
}
