import type {
  ChannelConfig,
  LinkedInAccount,
  EmailAccount,
  LinkedInRateLimit,
} from "@/lib/types/channel";

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function minsAgo(m: number): Date {
  return new Date(Date.now() - m * 60 * 1000);
}

// ── Channel Configs ─────────────────────────────

export const mockChannels: ChannelConfig[] = [
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Automated connection requests, messages, and profile engagement",
    providerName: "Unipile",
    connectionStatus: "connected",
    connectedAccountLabel: "Yaseen Ahmed",
    lastActivity: minsAgo(12),
    healthMetrics: [
      { label: "Sends today", value: "12/50", status: "good" },
      { label: "Weekly invites", value: "45/100", status: "warning" },
      { label: "Reply rate", value: "18%", status: "good" },
    ],
    summaryMetrics: [
      { label: "Sends today", value: 12 },
      { label: "Connections this week", value: 45 },
      { label: "Messages this week", value: 32 },
      { label: "Reply rate", value: "18%" },
    ],
    setupSteps: [
      { id: "connect", label: "Connect LinkedIn", description: "Authenticate with your LinkedIn credentials", completed: true },
      { id: "verify", label: "Verify identity", description: "Complete 2FA verification", completed: true },
      { id: "select", label: "Select account", description: "Choose which LinkedIn account to use", completed: true },
      { id: "limits", label: "Set rate limits", description: "Configure daily and weekly sending limits", completed: true },
    ],
    completedSteps: 4,
  },
  {
    id: "email",
    name: "Email",
    description: "Multi-account sending with warmup, tracking, and deliverability monitoring",
    providerName: "Smartlead",
    connectionStatus: "connected",
    connectedAccountLabel: "3 sending accounts",
    lastActivity: minsAgo(3),
    healthMetrics: [
      { label: "Sent today", value: 148, status: "good" },
      { label: "Open rate", value: "45%", status: "good" },
      { label: "Reply rate", value: "4.1%", status: "neutral" },
      { label: "Bounce rate", value: "2%", status: "good" },
    ],
    summaryMetrics: [
      { label: "Sent today", value: 148 },
      { label: "Open rate", value: "45%" },
      { label: "Reply rate", value: "4.1%" },
      { label: "Bounce rate", value: "2%" },
    ],
    setupSteps: [
      { id: "connect", label: "Connect Smartlead", description: "Enter your Smartlead API key", completed: true },
      { id: "accounts", label: "Select accounts", description: "Choose which email accounts to use", completed: true },
      { id: "config", label: "Configure sending", description: "Set daily limits and warmup preferences", completed: true },
    ],
    completedSteps: 3,
  },
  {
    id: "calling",
    name: "Calling",
    description: "Provisioned phone lines for outbound and inbound calling",
    providerName: "Twilio",
    connectionStatus: "connected",
    connectedAccountLabel: "3 active lines",
    lastActivity: minsAgo(45),
    healthMetrics: [
      { label: "Calls today", value: 8, status: "good" },
      { label: "Lines active", value: "3/5", status: "good" },
      { label: "Minutes", value: 47, status: "neutral" },
      { label: "Avg duration", value: "3:24", status: "neutral" },
    ],
    summaryMetrics: [
      { label: "Total calls", value: 232 },
      { label: "Total minutes", value: 2490 },
      { label: "Active lines", value: 3 },
      { label: "Monthly cost", value: "$95.50" },
    ],
    setupSteps: [
      { id: "twilio", label: "Connect Twilio", description: "Add your Twilio credentials", completed: true },
      { id: "provision", label: "Provision numbers", description: "Acquire phone numbers", completed: true },
      { id: "assign", label: "Assign lines", description: "Assign lines to team members", completed: true },
    ],
    completedSteps: 3,
  },
];

// ── LinkedIn Mock Data ──────────────────────────

export const mockLinkedInAccounts: LinkedInAccount[] = [
  {
    id: "li_acc_001",
    name: "Yaseen Ahmed",
    profileUrl: "https://linkedin.com/in/yaseenahmed",
    type: "LINKEDIN",
  },
  {
    id: "li_acc_002",
    name: "Leadey Sales",
    profileUrl: "https://linkedin.com/in/leadeysales",
    type: "LINKEDIN",
  },
];

export const mockLinkedInRateLimits: LinkedInRateLimit[] = [
  { id: "inv_daily", label: "Invitations (daily)", current: 12, limit: 50, period: "daily" },
  { id: "inv_weekly", label: "Invitations (weekly)", current: 45, limit: 100, period: "weekly" },
  { id: "msg_daily", label: "Messages (daily)", current: 28, limit: 80, period: "daily" },
  { id: "view_daily", label: "Profile views (daily)", current: 35, limit: 100, period: "daily" },
];

// ── Email Mock Data ─────────────────────────────

export const mockEmailAccounts: EmailAccount[] = [
  { id: 1, email: "yaseen@leadey.io", fromName: "Yaseen Ahmed", selected: true, isActive: true },
  { id: 2, email: "outreach@leadey.io", fromName: "Leadey Team", selected: true, isActive: true },
  { id: 3, email: "sales@leadey.io", fromName: "Leadey Sales", selected: true, isActive: true },
  { id: 4, email: "hello@leadey.io", fromName: "Leadey", selected: false, isActive: false },
];
