import type {
  SendingAccount,
  EmailThread,
  EmailMessage,
  EmailStats,
  CampaignEmailAnalytics,
} from "@/lib/types/email";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

export const mockSendingAccounts: SendingAccount[] = [
  { id: "acc_1", email: "yaseen@leadey.io", fromName: "Yaseen Ahmed", isActive: true, warmupStatus: "active", dailyLimit: 60, sentToday: 24, healthScore: 96 },
  { id: "acc_2", email: "outreach@leadey.io", fromName: "Leadey Team", isActive: true, warmupStatus: "active", dailyLimit: 50, sentToday: 18, healthScore: 92 },
  { id: "acc_3", email: "sales@leadey.io", fromName: "Leadey Sales", isActive: true, warmupStatus: "warming", dailyLimit: 25, sentToday: 9, healthScore: 81 },
  { id: "acc_4", email: "hello@leadey.io", fromName: "Leadey", isActive: false, warmupStatus: "paused", dailyLimit: 40, sentToday: 0, healthScore: 74 },
];

function thread(
  partial: Omit<EmailThread, "messages" | "messageCount" | "lastMessageAt" | "lastMessagePreview">,
  messages: EmailMessage[],
): EmailThread {
  const last = messages[messages.length - 1];
  return {
    ...partial,
    messageCount: messages.length,
    lastMessageAt: last.sentAt,
    lastMessagePreview: last.bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120),
    messages,
  };
}

export const mockEmailThreads: EmailThread[] = [
  thread(
    {
      id: "th_1", leadId: "lead_sarah", leadName: "Sarah Chen", leadTitle: "VP of Engineering",
      company: "Vercel", contactEmail: "sarah@vercel.com", funnelId: null, funnelName: "Enterprise Outbound",
      subject: "Quick question about Vercel", unread: true, sentiment: "interested", status: "active",
    },
    [
      { id: "m1", threadId: "th_1", direction: "outbound", fromName: "Yaseen Ahmed", fromEmail: "yaseen@leadey.io", toEmail: "sarah@vercel.com", subject: "Quick question about Vercel", bodyHtml: "<p>Hi Sarah,</p><p>I noticed Vercel is scaling its platform team — we help eng leaders cut outbound busywork by 70%. Worth a quick chat?</p><p>Best,<br/>Yaseen</p>", sentAt: iso(3 * DAY), openedAt: iso(3 * DAY - 2 * HOUR), stepIndex: 0 },
      { id: "m2", threadId: "th_1", direction: "inbound", fromName: "Sarah Chen", fromEmail: "sarah@vercel.com", toEmail: "yaseen@leadey.io", subject: "Re: Quick question about Vercel", bodyHtml: "<p>Thanks for reaching out! We're actually evaluating tools in this space right now. Could you send over a bit more detail on pricing?</p>", sentAt: iso(2 * HOUR), repliedAt: iso(2 * HOUR) },
    ],
  ),
  thread(
    {
      id: "th_2", leadId: "lead_mark", leadName: "Mark Lee", leadTitle: "Head of Growth",
      company: "Linear", contactEmail: "mark@linear.app", funnelId: null, funnelName: "PLG Expansion",
      subject: "Idea for Linear's outbound", unread: true, sentiment: null, status: "active",
    },
    [
      { id: "m3", threadId: "th_2", direction: "outbound", fromName: "Leadey Team", fromEmail: "outreach@leadey.io", toEmail: "mark@linear.app", subject: "Idea for Linear's outbound", bodyHtml: "<p>Hey Mark,</p><p>Quick idea on how Linear could 3x reply rates on cold outbound. Open to me sharing?</p>", sentAt: iso(1 * DAY), openedAt: iso(1 * DAY - 4 * HOUR), stepIndex: 0 },
      { id: "m4", threadId: "th_2", direction: "inbound", fromName: "Mark Lee", fromEmail: "mark@linear.app", toEmail: "outreach@leadey.io", subject: "Re: Idea for Linear's outbound", bodyHtml: "<p>Sure, go ahead. What did you have in mind?</p>", sentAt: iso(1 * HOUR), repliedAt: iso(1 * HOUR) },
    ],
  ),
  thread(
    {
      id: "th_3", leadId: "lead_tom", leadName: "Tom Roe", leadTitle: "CRO",
      company: "Retool", contactEmail: "tom@retool.com", funnelId: null, funnelName: "Enterprise Outbound",
      subject: "Retool + Leadey", unread: false, sentiment: "not_interested", status: "active",
    },
    [
      { id: "m5", threadId: "th_3", direction: "outbound", fromName: "Yaseen Ahmed", fromEmail: "yaseen@leadey.io", toEmail: "tom@retool.com", subject: "Retool + Leadey", bodyHtml: "<p>Hi Tom,</p><p>Reaching out re: scaling Retool's SDR motion. Worth 15 minutes?</p>", sentAt: iso(4 * DAY), openedAt: iso(4 * DAY - 6 * HOUR), stepIndex: 0 },
      { id: "m6", threadId: "th_3", direction: "inbound", fromName: "Tom Roe", fromEmail: "tom@retool.com", toEmail: "yaseen@leadey.io", subject: "Re: Retool + Leadey", bodyHtml: "<p>Not a priority for us this quarter, but thanks.</p>", sentAt: iso(3 * HOUR), repliedAt: iso(3 * HOUR) },
    ],
  ),
  thread(
    {
      id: "th_4", leadId: "lead_anna", leadName: "Anna Park", leadTitle: "Director of Sales",
      company: "Ramp", contactEmail: "anna@ramp.com", funnelId: null, funnelName: "Mid-Market",
      subject: "Cutting Ramp's prospecting time", unread: false, sentiment: null, status: "active",
    },
    [
      { id: "m7", threadId: "th_4", direction: "outbound", fromName: "Leadey Sales", fromEmail: "sales@leadey.io", toEmail: "anna@ramp.com", subject: "Cutting Ramp's prospecting time", bodyHtml: "<p>Hi Anna,</p><p>Teams like yours save ~8 hrs/rep/week with Leadey. Curious if that's a problem worth solving for Ramp?</p>", sentAt: iso(6 * HOUR), openedAt: iso(5 * HOUR), stepIndex: 0 },
    ],
  ),
];

export const mockEmailStats: EmailStats = {
  sentToday: 51,
  scheduled: 34,
  opens: 23,
  openRate: 45.1,
  replies: 3,
  replyRate: 5.9,
  bounces: 1,
  bounceRate: 2.0,
  needsAttention: [
    { id: "na1", contact: "j.smith@acme.co", company: "Acme Corp", type: "bounce", detail: "Hard bounce — invalid address" },
    { id: "na2", contact: "lisa@techstart.io", company: "TechStart", type: "delivery_issue", detail: "Soft bounce — mailbox full, retrying" },
    { id: "na3", contact: "mark@bigco.com", company: "BigCo", type: "unsubscribe", detail: "Opted out via unsubscribe link" },
  ],
};

export function mockCampaignEmailAnalytics(funnelId: string): CampaignEmailAnalytics {
  const sent = 420, opened = 198, replied = 31, bounced = 9;
  return {
    funnelId,
    sent, opened, replied, bounced,
    openRate: Math.round((opened / sent) * 1000) / 10,
    replyRate: Math.round((replied / sent) * 1000) / 10,
    bounceRate: Math.round((bounced / sent) * 1000) / 10,
    perStep: [
      { stepIndex: 0, label: "Intro Email", sent: 220, opened: 121, replied: 18 },
      { stepIndex: 1, label: "Follow-up", sent: 130, opened: 52, replied: 9 },
      { stepIndex: 2, label: "Breakup", sent: 70, opened: 25, replied: 4 },
    ],
    timeline: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * DAY).toISOString().slice(0, 10),
      sent: 40 + ((i * 13) % 35),
      opened: 18 + ((i * 7) % 20),
      replied: 2 + (i % 4),
    })),
  };
}
