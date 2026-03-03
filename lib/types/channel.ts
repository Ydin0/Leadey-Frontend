export type ChannelId = "linkedin" | "email" | "calling";

export type ChannelConnectionStatus =
  | "not_connected"
  | "connecting"
  | "connected"
  | "needs_attention";

export interface ChannelHealthMetric {
  label: string;
  value: string | number;
  status: "good" | "warning" | "critical" | "neutral";
}

export interface ChannelSetupStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  optional?: boolean;
}

export interface ChannelConfig {
  id: ChannelId;
  name: string;
  description: string;
  providerName: string;
  connectionStatus: ChannelConnectionStatus;
  connectedAccountLabel: string | null;
  lastActivity: Date | null;
  healthMetrics: ChannelHealthMetric[];
  summaryMetrics: { label: string; value: string | number }[];
  setupSteps: ChannelSetupStep[];
  completedSteps: number;
}

export interface LinkedInAccount {
  id: string;
  name: string;
  profileUrl: string;
  type: string;
}

export interface EmailAccount {
  id: number;
  email: string;
  fromName: string;
  selected: boolean;
  isActive: boolean;
}

export interface LinkedInRateLimit {
  id: string;
  label: string;
  current: number;
  limit: number;
  period: "daily" | "weekly";
}
