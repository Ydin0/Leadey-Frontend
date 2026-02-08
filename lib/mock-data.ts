import {
  LayoutDashboard,
  GitFork,
  Target,
  Building2,
  Download,
  BarChart3,
  Settings,
  MessageSquare,
  Send,
  Phone,
  Mail,
  Sparkles,
  Coins,
} from "lucide-react";
import type {
  NavItem,
  QuickStat,
  Reply,
  LinkedInQueueItem,
  CallQueueItem,
  EmailSummary,
  Signal,
  Notification,
} from "./types";

// ── Navigation ──────────────────────────────────────────────
export const navItems: NavItem[] = [
  { id: "cockpit", label: "Cockpit", icon: LayoutDashboard, href: "/dashboard", badge: 14 },
  { id: "funnels", label: "Funnels", icon: GitFork, href: "/dashboard/funnels" },
  { id: "icps", label: "ICPs", icon: Target, href: "/dashboard/icps" },
  { id: "companies", label: "Companies", icon: Building2, href: "/dashboard/companies" },
  { id: "exports", label: "Exports", icon: Download, href: "/dashboard/exports" },
  { id: "analytics", label: "Analytics", icon: BarChart3, href: "/dashboard/analytics" },
  { id: "settings", label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

// ── Quick Stats ─────────────────────────────────────────────
export const quickStats: QuickStat[] = [
  { id: "replies", label: "Replies pending", value: 6, icon: MessageSquare, trend: "up", trendValue: "+3", color: "text-signal-red-text" },
  { id: "linkedin", label: "LinkedIn sends", value: 12, icon: Send, trend: "neutral", color: "text-signal-blue-text" },
  { id: "calls", label: "Calls", value: 4, icon: Phone, trend: "down", trendValue: "-2", color: "text-signal-green-text" },
  { id: "emails", label: "Emails sent", value: 148, icon: Mail, trend: "up", trendValue: "+12", color: "text-signal-blue-text" },
  { id: "signals", label: "New signals", value: 8, icon: Sparkles, trend: "up", trendValue: "+5", color: "text-signal-slate-text" },
  { id: "credits", label: "Credits", value: 2840, icon: Coins, color: "text-ink-secondary" },
];

// ── Replies ─────────────────────────────────────────────────
function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function minsAgo(m: number): Date {
  return new Date(Date.now() - m * 60 * 1000);
}

export const mockReplies: Reply[] = [
  {
    id: "r1",
    contact: { name: "Sarah Chen", title: "VP of Engineering" },
    company: "Vercel",
    channel: "email",
    message: "Thanks for reaching out! We are actually evaluating tools in this space right now. Could you share a quick demo link or calendar availability for next week?",
    timestamp: minsAgo(12),
    status: "unhandled",
    sequence: "Enterprise Outbound v3",
    funnel: "Product-Led Growth",
  },
  {
    id: "r2",
    contact: { name: "Marcus Johnson", title: "Head of Sales" },
    company: "Stripe",
    channel: "linkedin",
    message: "Interesting approach. We have been looking at signal-based prospecting. Let me loop in our RevOps lead.",
    timestamp: minsAgo(34),
    status: "unhandled",
    sequence: "LinkedIn Warm Intro",
  },
  {
    id: "r3",
    contact: { name: "Elena Rodriguez", title: "CRO" },
    company: "HubSpot",
    channel: "email",
    message: "Not the right time for us, but I would be happy to revisit in Q3. Can you follow up then?",
    timestamp: hoursAgo(2),
    status: "unhandled",
    funnel: "Mid-Market Expansion",
  },
  {
    id: "r4",
    contact: { name: "James Park", title: "Director of Growth" },
    company: "Notion",
    channel: "email",
    message: "This looks really compelling. What does your pricing look like for a team of 15 reps? Also, do you integrate with Salesforce?",
    timestamp: hoursAgo(3),
    status: "unhandled",
    sequence: "Enterprise Outbound v3",
  },
  {
    id: "r5",
    contact: { name: "Aisha Patel", title: "Sales Manager" },
    company: "Figma",
    channel: "linkedin",
    message: "Hey! Saw your post about intent signals. We are building out our outbound motion and this could be a great fit. DM me?",
    timestamp: hoursAgo(5),
    status: "unhandled",
  },
  {
    id: "r6",
    contact: { name: "Tom Williams", title: "VP Revenue" },
    company: "Datadog",
    channel: "email",
    message: "Please remove me from your mailing list.",
    timestamp: hoursAgo(6),
    status: "unhandled",
    sequence: "Enterprise Outbound v3",
  },
];

// ── LinkedIn Queue ──────────────────────────────────────────
export const mockLinkedInQueue: LinkedInQueueItem[] = [
  {
    id: "li1",
    type: "connection_request",
    contact: { name: "Rachel Kim", title: "VP Sales", company: "Snowflake" },
    message: "Hi Rachel, noticed Snowflake just expanded the sales team by 20%. Would love to connect and share how signal-driven outreach is helping similar teams hit quota faster.",
    profileUrl: "#",
    status: "pending",
  },
  {
    id: "li2",
    type: "connection_request",
    contact: { name: "David Liu", title: "Head of Growth", company: "Retool" },
    message: "Hi David, saw Retool just raised Series C. Congrats! Would love to connect and discuss how we help fast-growing teams scale outbound without burning leads.",
    profileUrl: "#",
    status: "pending",
  },
  {
    id: "li3",
    type: "connection_request",
    contact: { name: "Nina Patel", title: "RevOps Lead", company: "Amplitude" },
    message: "Hi Nina, love what Amplitude is doing with product analytics. We use similar signal approaches for sales. Would love to connect!",
    profileUrl: "#",
    status: "pending",
  },
  {
    id: "li4",
    type: "connection_request",
    contact: { name: "Chris Anderson", title: "SDR Manager", company: "MongoDB" },
    message: "Hi Chris, heard great things about MongoDB SDR team. We are helping SDR teams prioritize with buying signals. Would love to connect!",
    profileUrl: "#",
    status: "pending",
  },
  {
    id: "li5",
    type: "message",
    contact: { name: "Jessica Wang", title: "Director of Sales", company: "Airtable" },
    message: "Hey Jessica! Following up on our connection. I put together a quick breakdown of how signal-based prospecting could work for Airtable based on your ICP. Would 15 mins this week work to walk through it?",
    profileUrl: "#",
    status: "pending",
  },
  {
    id: "li6",
    type: "message",
    contact: { name: "Alex Thompson", title: "CRO", company: "Calendly" },
    message: "Alex, great chatting at SaaStr last month! As promised, here is a look at the buying signals we picked up for Calendly. Thought it might be useful for your Q2 planning.",
    profileUrl: "#",
    status: "pending",
  },
  {
    id: "li7",
    type: "message",
    contact: { name: "Maria Santos", title: "Head of Partnerships", company: "Zapier" },
    message: "Hi Maria, noticed Zapier just launched new enterprise features. We are seeing strong intent signals from companies adopting automation tools. Quick chat about potential synergies?",
    profileUrl: "#",
    status: "pending",
  },
  {
    id: "li8",
    type: "message",
    contact: { name: "Ryan O'Brien", title: "Sales Lead", company: "Linear" },
    message: "Ryan, saw your post about scaling outbound at Linear. We have helped teams like yours go from 50 to 200 qualified meetings/month using intent data. Worth a 10-min call?",
    profileUrl: "#",
    status: "pending",
  },
];

// ── Call Queue ───────────────────────────────────────────────
export const mockCallQueue: CallQueueItem[] = [
  {
    id: "c1",
    contact: { name: "Michael Foster", title: "VP of Sales", company: "Twilio" },
    phone: "4155551234",
    script: {
      hook: "Hi Michael, this is [Name] from Leadey. I noticed Twilio just posted 5 new SDR roles. We help sales teams that are scaling quickly prioritize the right accounts using buying signals.",
      talkingPoints: [
        "Twilio is expanding sales team, timing is perfect for signal-driven prospecting",
        "Our platform detects hiring, funding, and tech adoption signals",
        "Average customer sees 3x improvement in connect rates within 30 days",
      ],
      objectionHandlers: [
        { objection: "We already use ZoomInfo", response: "ZoomInfo is great for data. We complement it by adding real-time buying signals that tell you WHEN to reach out, not just WHO." },
        { objection: "We are not looking right now", response: "Totally understand. Most of our customers start with a free signal audit. Would it be helpful to see what signals we are picking up for your target accounts?" },
      ],
      qualifyingQuestions: [
        "How are your SDRs currently prioritizing which accounts to reach out to?",
        "What percentage of outbound meetings come from cold vs warm outreach?",
        "Are you using any intent data or signals in your current workflow?",
      ],
    },
    status: "pending",
  },
  {
    id: "c2",
    contact: { name: "Lauren Chen", title: "Director of Marketing", company: "Supabase" },
    phone: "6505559876",
    script: {
      hook: "Hi Lauren, this is [Name] from Leadey. Congrats on the recent Series B! We help fast-growing companies like Supabase turn market signals into qualified pipeline.",
      talkingPoints: [
        "Post-funding is ideal time to establish signal-driven GTM",
        "We integrate with existing CRM and outreach tools",
        "Marketing teams use our signals to improve ABM targeting",
      ],
      objectionHandlers: [
        { objection: "Send me an email instead", response: "Absolutely, I will send that right over. Quick question before I do - are you the right person for sales tooling decisions, or should I include someone else?" },
        { objection: "Too expensive", response: "I hear that. Most teams see ROI within the first month because they stop wasting time on accounts that are not ready to buy. Can I show you the math?" },
      ],
      qualifyingQuestions: [
        "How does your team currently identify high-intent accounts?",
        "What is your current pipeline generation process looking like?",
        "Who on your team would be involved in evaluating a tool like this?",
      ],
    },
    status: "pending",
  },
  {
    id: "c3",
    contact: { name: "Kevin Park", title: "Head of Revenue", company: "Loom" },
    phone: "2125553456",
    script: {
      hook: "Kevin, this is [Name] from Leadey. I saw Loom just expanded into the enterprise segment. We help revenue teams identify which enterprise accounts are showing buying signals right now.",
      talkingPoints: [
        "Enterprise expansion requires precision - signals help prioritize",
        "We track 15+ signal types including hiring, tech stack changes, and funding",
        "Customers in similar stage see 40% more qualified meetings",
      ],
      objectionHandlers: [
        { objection: "We have a process that works", response: "Love to hear that. Our best customers had good processes too - signals just made them more efficient. What if you could focus only on accounts showing active interest?" },
      ],
      qualifyingQuestions: [
        "How many enterprise accounts is your team currently working?",
        "What signals tell you an account might be ready to buy?",
        "What does your current tech stack for prospecting look like?",
      ],
    },
    status: "pending",
  },
  {
    id: "c4",
    contact: { name: "Amy Wu", title: "SDR Team Lead", company: "Miro" },
    phone: "3105557890",
    script: {
      hook: "Amy, this is [Name] from Leadey. I was looking at Miro and noticed you are hiring 8 new SDRs. We help SDR teams ramp faster by giving them warm accounts with buying signals.",
      talkingPoints: [
        "New SDRs ramp 50% faster when they start with signal-qualified accounts",
        "No more spray-and-pray - every outreach is backed by a real buying signal",
        "Easy to integrate into existing workflows and sequences",
      ],
      objectionHandlers: [
        { objection: "My SDRs are doing fine", response: "Great to hear. What we often find is even top-performing SDRs can 2x their output when they know exactly which accounts to hit. Can I show you a quick analysis?" },
      ],
      qualifyingQuestions: [
        "What does the average ramp time look like for new SDRs?",
        "How are you currently distributing accounts to your team?",
        "What metrics matter most for your SDR team?",
      ],
    },
    status: "pending",
  },
];

// ── Email Summary ───────────────────────────────────────────
export const mockEmailSummary: EmailSummary = {
  sentToday: 148,
  opens: 67,
  openRate: 45.3,
  replies: 6,
  replyRate: 4.1,
  bounces: 3,
  bounceRate: 2.0,
  needsAttention: [
    { id: "e1", contact: "j.smith@acme.co", company: "Acme Corp", type: "bounce", detail: "Hard bounce - invalid email address" },
    { id: "e2", contact: "lisa@techstart.io", company: "TechStart", type: "delivery_issue", detail: "Soft bounce - mailbox full, will retry" },
    { id: "e3", contact: "mark@bigco.com", company: "BigCo", type: "unsubscribe", detail: "Opted out via unsubscribe link" },
    { id: "e4", contact: "anna@startup.dev", company: "Startup Dev", type: "bounce", detail: "Hard bounce - domain not found" },
  ],
};

// ── Signals ─────────────────────────────────────────────────
export const mockSignals: Signal[] = [
  {
    id: "s1",
    source: "hiring",
    company: "Ramp",
    summary: "Posted 12 new sales positions in the last week, including VP of Sales and 8 SDR roles",
    relevanceScore: 95,
    timestamp: minsAgo(15),
  },
  {
    id: "s2",
    source: "funding",
    company: "Clerk",
    summary: "Raised $30M Series B led by Andreessen Horowitz. Plans to triple go-to-market team",
    relevanceScore: 92,
    timestamp: minsAgo(45),
  },
  {
    id: "s3",
    source: "tech_adoption",
    company: "Webflow",
    summary: "Added Salesforce, Outreach, and Gong to their tech stack in the past 30 days",
    relevanceScore: 88,
    timestamp: hoursAgo(1),
  },
  {
    id: "s4",
    source: "intent",
    company: "Postman",
    summary: "High research activity around sales engagement platforms and outbound tools",
    relevanceScore: 85,
    timestamp: hoursAgo(2),
  },
  {
    id: "s5",
    source: "job_change",
    company: "Plaid",
    summary: "New CRO hired from Gong. Previously scaled outbound from $10M to $50M ARR",
    relevanceScore: 90,
    timestamp: hoursAgo(3),
  },
  {
    id: "s6",
    source: "expansion",
    company: "Neon",
    summary: "Opened new offices in London and Singapore. Expanding enterprise sales internationally",
    relevanceScore: 78,
    timestamp: hoursAgo(4),
  },
  {
    id: "s7",
    source: "news",
    company: "Resend",
    summary: "Featured in TechCrunch for rapid growth. CEO mentioned plans to build out sales team in Q2",
    relevanceScore: 74,
    timestamp: hoursAgo(6),
  },
  {
    id: "s8",
    source: "social",
    company: "Cal.com",
    summary: "CTO posted about needing better sales tooling. Multiple team members engaged with outbound content",
    relevanceScore: 70,
    timestamp: hoursAgo(8),
  },
];

// ── Notifications ───────────────────────────────────────────
export const mockNotifications: Notification[] = [
  {
    id: "n1",
    title: "New reply from Sarah Chen",
    description: "VP Engineering at Vercel replied to your Enterprise Outbound sequence",
    timestamp: minsAgo(12),
    read: false,
    type: "reply",
  },
  {
    id: "n2",
    title: "High-intent signal detected",
    description: "Ramp posted 12 new sales roles - relevance score 95",
    timestamp: minsAgo(15),
    read: false,
    type: "signal",
  },
  {
    id: "n3",
    title: "Sequence completed",
    description: "Enterprise Outbound v3 finished for 24 contacts. 6 replies received",
    timestamp: hoursAgo(1),
    read: false,
    type: "sequence",
  },
  {
    id: "n4",
    title: "Bounce alert",
    description: "3 emails bounced in the last hour. Review recommended",
    timestamp: hoursAgo(2),
    read: true,
    type: "alert",
  },
  {
    id: "n5",
    title: "Weekly analytics ready",
    description: "Your outbound performance report for this week is available",
    timestamp: hoursAgo(8),
    read: true,
    type: "system",
  },
];
