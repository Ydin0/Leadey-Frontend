import type { Funnel } from "../types/funnel";

function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000);
}

function daysFromNow(d: number): Date {
  return new Date(Date.now() + d * 24 * 60 * 60 * 1000);
}

export const mockFunnels: Funnel[] = [
  {
    id: "funnel_001",
    name: "UK SaaS Q1",
    description: "Multi-touch outbound for UK SaaS decision makers in Q1",
    status: "active",
    steps: [
      { id: "s1", channel: "email", label: "Intro Email", dayOffset: 0 },
      { id: "s2", channel: "linkedin", label: "Connection Request", dayOffset: 2 },
      { id: "s3", channel: "email", label: "Follow-up Email", dayOffset: 5 },
      { id: "s4", channel: "call", label: "Discovery Call", dayOffset: 7 },
      { id: "s5", channel: "linkedin", label: "LinkedIn Message", dayOffset: 10 },
      { id: "s6", channel: "email", label: "Break-up Email", dayOffset: 14 },
    ],
    metrics: { total: 156, active: 98, replied: 23, replyRate: 14.7, bounced: 8, completed: 27 },
    sources: [
      { type: "signals", label: "Hiring Signals", count: 72 },
      { type: "csv", label: "SaaStr List", count: 54 },
      { type: "companies", label: "UK Tech Companies", count: 30 },
    ],
    leads: [
      { id: "fl_001", name: "Sarah Chen", company: "Monzo", title: "VP of Sales", email: "s.chen@monzo.com", currentStep: 3, totalSteps: 6, status: "opened", nextAction: "Send follow-up", nextDate: daysFromNow(1), source: "Hiring Signals", score: 92 },
      { id: "fl_002", name: "James Wright", company: "Revolut", title: "Head of Growth", email: "j.wright@revolut.com", currentStep: 5, totalSteps: 6, status: "replied", nextAction: "Book meeting", nextDate: daysFromNow(0), source: "SaaStr List", score: 88 },
      { id: "fl_003", name: "Emily Watson", company: "GoCardless", title: "Director of Sales", email: "e.watson@gocardless.com", currentStep: 2, totalSteps: 6, status: "sent", nextAction: "LinkedIn connect", nextDate: daysFromNow(2), source: "Hiring Signals", score: 85 },
      { id: "fl_004", name: "Oliver Brown", company: "Paddle", title: "CRO", email: "o.brown@paddle.com", currentStep: 4, totalSteps: 6, status: "clicked", nextAction: "Discovery call", nextDate: daysFromNow(1), source: "UK Tech Companies", score: 90 },
      { id: "fl_005", name: "Charlotte Taylor", company: "Checkout.com", title: "VP Revenue", email: "c.taylor@checkout.com", currentStep: 6, totalSteps: 6, status: "completed", nextAction: "Meeting booked", nextDate: daysFromNow(3), source: "SaaStr List", score: 95 },
      { id: "fl_006", name: "Harry Wilson", company: "Starling Bank", title: "Head of Partnerships", email: "h.wilson@starlingbank.com", currentStep: 1, totalSteps: 6, status: "bounced", nextAction: "Verify email", nextDate: daysFromNow(0), source: "Hiring Signals", score: 45 },
      { id: "fl_007", name: "Amelia Clarke", company: "Wise", title: "Director of Marketing", email: "a.clarke@wise.com", currentStep: 3, totalSteps: 6, status: "opened", nextAction: "Send follow-up", nextDate: daysFromNow(2), source: "UK Tech Companies", score: 78 },
      { id: "fl_008", name: "George Evans", company: "Thought Machine", title: "VP Engineering", email: "g.evans@thoughtmachine.net", currentStep: 1, totalSteps: 6, status: "pending", nextAction: "Send intro email", nextDate: daysFromNow(0), source: "SaaStr List", score: 72 },
      { id: "fl_009", name: "Isla Roberts", company: "Cazoo", title: "Head of Sales", email: "i.roberts@cazoo.co.uk", currentStep: 4, totalSteps: 6, status: "replied", nextAction: "Schedule demo", nextDate: daysFromNow(1), source: "Hiring Signals", score: 91 },
      { id: "fl_010", name: "Noah Harris", company: "Snyk", title: "SDR Manager", email: "n.harris@snyk.io", currentStep: 2, totalSteps: 6, status: "sent", nextAction: "Follow up email", nextDate: daysFromNow(3), source: "UK Tech Companies", score: 68 },
    ],
    cockpit: {
      linkedin: [
        { id: "cli_001", name: "Emily Watson", title: "Director of Sales", company: "GoCardless", type: "connect", message: "Hi Emily, noticed GoCardless is expanding the sales team. Would love to connect and share how signal-driven outreach is helping similar teams.", profileUrl: "#" },
        { id: "cli_002", name: "Amelia Clarke", title: "Director of Marketing", company: "Wise", type: "message", message: "Hey Amelia! Following up on our connection. I put together a quick breakdown of how signal-based prospecting could work for Wise. Would 15 mins this week work?", profileUrl: "#" },
        { id: "cli_003", name: "Noah Harris", title: "SDR Manager", company: "Snyk", type: "connect", message: "Hi Noah, love what Snyk is doing with developer security. We help SDR teams prioritize with buying signals. Would love to connect!", profileUrl: "#" },
      ],
      calls: [
        { id: "cc_001", name: "Oliver Brown", title: "CRO", company: "Paddle", phone: "+44 20 7946 0001", script: { hook: "Hi Oliver, this is [Name] from Leadey. I noticed Paddle just expanded into new markets. We help revenue teams identify which accounts are showing buying signals right now.", talkingPoints: ["Paddle expanding internationally - timing is perfect for signal-driven prospecting", "Average customer sees 3x improvement in connect rates within 30 days"], objectionHandlers: ["We use ZoomInfo: Great for data, we complement with real-time buying signals for WHEN to reach out."] } },
        { id: "cc_002", name: "Isla Roberts", title: "Head of Sales", company: "Cazoo", phone: "+44 20 7946 0002", script: { hook: "Isla, this is [Name] from Leadey. Saw Cazoo is scaling the sales team. We help teams ramp faster with warm accounts backed by buying signals.", talkingPoints: ["New reps ramp 50% faster with signal-qualified accounts", "Integrates with existing CRM and outreach tools"], objectionHandlers: ["Not the right time: Most teams start with a free signal audit to see the impact."] } },
      ],
      email: { sentToday: 34, scheduled: 18, opened: 15, openRate: 44.1, replied: 4, replyRate: 11.8 },
    },
    analyticsSteps: [
      { label: "Intro Email", channel: "email", sent: 156, opened: 89, replied: 12, openRate: 57.1, replyRate: 7.7 },
      { label: "Connection Request", channel: "linkedin", sent: 134, opened: 98, replied: 18, openRate: 73.1, replyRate: 13.4 },
      { label: "Follow-up Email", channel: "email", sent: 112, opened: 58, replied: 15, openRate: 51.8, replyRate: 13.4 },
      { label: "Discovery Call", channel: "call", sent: 87, opened: 42, replied: 23, openRate: 48.3, replyRate: 26.4 },
      { label: "LinkedIn Message", channel: "linkedin", sent: 64, opened: 51, replied: 14, openRate: 79.7, replyRate: 21.9 },
      { label: "Break-up Email", channel: "email", sent: 41, opened: 22, replied: 8, openRate: 53.7, replyRate: 19.5 },
    ],
    createdAt: daysAgo(28),
  },
  {
    id: "funnel_002",
    name: "Startup MVP",
    description: "Lightweight outreach for early-stage startups exploring outbound",
    status: "active",
    steps: [
      { id: "s1", channel: "email", label: "Warm Intro", dayOffset: 0 },
      { id: "s2", channel: "linkedin", label: "LinkedIn Connect", dayOffset: 3 },
      { id: "s3", channel: "email", label: "Value Add Email", dayOffset: 6 },
      { id: "s4", channel: "call", label: "Quick Call", dayOffset: 9 },
    ],
    metrics: { total: 82, active: 54, replied: 11, replyRate: 13.4, bounced: 3, completed: 14 },
    sources: [
      { type: "signals", label: "Funding Signals", count: 45 },
      { type: "webhook", label: "Zapier Inbound", count: 37 },
    ],
    leads: [
      { id: "fl_011", name: "Alex Rivera", company: "PostHog", title: "Head of Growth", email: "a.rivera@posthog.com", currentStep: 2, totalSteps: 4, status: "opened", nextAction: "LinkedIn connect", nextDate: daysFromNow(1), source: "Funding Signals", score: 84 },
      { id: "fl_012", name: "Mia Patel", company: "Raycast", title: "CEO", email: "m.patel@raycast.com", currentStep: 3, totalSteps: 4, status: "replied", nextAction: "Send case study", nextDate: daysFromNow(0), source: "Funding Signals", score: 91 },
      { id: "fl_013", name: "Liam Foster", company: "Resend", title: "CTO", email: "l.foster@resend.com", currentStep: 1, totalSteps: 4, status: "sent", nextAction: "Wait for open", nextDate: daysFromNow(2), source: "Zapier Inbound", score: 76 },
      { id: "fl_014", name: "Sophia Kim", company: "Neon", title: "VP Sales", email: "s.kim@neon.tech", currentStep: 4, totalSteps: 4, status: "completed", nextAction: "Demo scheduled", nextDate: daysFromNow(4), source: "Funding Signals", score: 93 },
      { id: "fl_015", name: "Ethan Moore", company: "Vercel", title: "Director BD", email: "e.moore@vercel.com", currentStep: 2, totalSteps: 4, status: "clicked", nextAction: "Send value add", nextDate: daysFromNow(1), source: "Zapier Inbound", score: 80 },
      { id: "fl_016", name: "Ava Thompson", company: "Supabase", title: "Head of Sales", email: "a.thompson@supabase.com", currentStep: 1, totalSteps: 4, status: "bounced", nextAction: "Verify email", nextDate: daysFromNow(0), source: "Funding Signals", score: 42 },
      { id: "fl_017", name: "Lucas White", company: "Linear", title: "CRO", email: "l.white@linear.app", currentStep: 3, totalSteps: 4, status: "opened", nextAction: "Quick call", nextDate: daysFromNow(2), source: "Zapier Inbound", score: 77 },
      { id: "fl_018", name: "Isabella Chen", company: "Clerk", title: "VP Marketing", email: "i.chen@clerk.com", currentStep: 2, totalSteps: 4, status: "sent", nextAction: "LinkedIn connect", nextDate: daysFromNow(1), source: "Funding Signals", score: 73 },
      { id: "fl_019", name: "Mason Lee", company: "Fly.io", title: "Head of Revenue", email: "m.lee@fly.io", currentStep: 1, totalSteps: 4, status: "pending", nextAction: "Send warm intro", nextDate: daysFromNow(0), source: "Zapier Inbound", score: 69 },
      { id: "fl_020", name: "Harper Davis", company: "Railway", title: "CEO", email: "h.davis@railway.app", currentStep: 4, totalSteps: 4, status: "replied", nextAction: "Book demo", nextDate: daysFromNow(1), source: "Funding Signals", score: 87 },
    ],
    cockpit: {
      linkedin: [
        { id: "cli_004", name: "Alex Rivera", title: "Head of Growth", company: "PostHog", type: "connect", message: "Hi Alex, congrats on PostHog growth! Would love to connect and chat about signal-driven outreach.", profileUrl: "#" },
        { id: "cli_005", name: "Isabella Chen", title: "VP Marketing", company: "Clerk", type: "connect", message: "Hi Isabella, noticed Clerk just raised. We help fast-growing teams turn market signals into pipeline.", profileUrl: "#" },
      ],
      calls: [
        { id: "cc_003", name: "Lucas White", title: "CRO", company: "Linear", phone: "+1 415-555-3001", script: { hook: "Lucas, this is [Name] from Leadey. Saw Linear is expanding enterprise sales. We help revenue teams identify which accounts are ready to buy.", talkingPoints: ["Enterprise expansion requires signal-driven precision", "Customers see 40% more qualified meetings"], objectionHandlers: ["We have a process: Great, signals make good processes more efficient."] } },
      ],
      email: { sentToday: 18, scheduled: 12, opened: 8, openRate: 44.4, replied: 2, replyRate: 11.1 },
    },
    analyticsSteps: [
      { label: "Warm Intro", channel: "email", sent: 82, opened: 45, replied: 6, openRate: 54.9, replyRate: 7.3 },
      { label: "LinkedIn Connect", channel: "linkedin", sent: 68, opened: 52, replied: 9, openRate: 76.5, replyRate: 13.2 },
      { label: "Value Add Email", channel: "email", sent: 51, opened: 28, replied: 7, openRate: 54.9, replyRate: 13.7 },
      { label: "Quick Call", channel: "call", sent: 34, opened: 18, replied: 11, openRate: 52.9, replyRate: 32.4 },
    ],
    createdAt: daysAgo(14),
  },
  {
    id: "funnel_003",
    name: "Conference Follow-Up",
    description: "Post-event nurture sequence for SaaStr Annual attendees",
    status: "paused",
    steps: [
      { id: "s1", channel: "email", label: "Nice Meeting You", dayOffset: 0 },
      { id: "s2", channel: "linkedin", label: "LinkedIn Follow", dayOffset: 2 },
      { id: "s3", channel: "email", label: "Resource Share", dayOffset: 5 },
    ],
    metrics: { total: 47, active: 0, replied: 9, replyRate: 19.1, bounced: 2, completed: 36 },
    sources: [
      { type: "csv", label: "SaaStr Badge Scans", count: 47 },
    ],
    leads: [
      { id: "fl_021", name: "Ryan Park", company: "Amplitude", title: "VP Sales", email: "r.park@amplitude.com", currentStep: 3, totalSteps: 3, status: "completed", nextAction: "Sequence done", nextDate: daysAgo(2), source: "SaaStr Badge Scans", score: 88 },
      { id: "fl_022", name: "Diana Flores", company: "Datadog", title: "Director of Sales", email: "d.flores@datadoghq.com", currentStep: 3, totalSteps: 3, status: "replied", nextAction: "Follow up reply", nextDate: daysAgo(1), source: "SaaStr Badge Scans", score: 90 },
      { id: "fl_023", name: "Kevin Zhang", company: "Figma", title: "Head of Growth", email: "k.zhang@figma.com", currentStep: 2, totalSteps: 3, status: "opened", nextAction: "Send resource", nextDate: daysAgo(3), source: "SaaStr Badge Scans", score: 75 },
      { id: "fl_024", name: "Natalie Wood", company: "Notion", title: "VP Marketing", email: "n.wood@notion.so", currentStep: 3, totalSteps: 3, status: "completed", nextAction: "Sequence done", nextDate: daysAgo(5), source: "SaaStr Badge Scans", score: 82 },
      { id: "fl_025", name: "Jason Lee", company: "Miro", title: "CRO", email: "j.lee@miro.com", currentStep: 1, totalSteps: 3, status: "bounced", nextAction: "Verify email", nextDate: daysAgo(4), source: "SaaStr Badge Scans", score: 40 },
      { id: "fl_026", name: "Maria Santos", company: "HubSpot", title: "VP Revenue", email: "m.santos@hubspot.com", currentStep: 3, totalSteps: 3, status: "completed", nextAction: "Sequence done", nextDate: daysAgo(3), source: "SaaStr Badge Scans", score: 86 },
      { id: "fl_027", name: "Ben Cooper", company: "Airtable", title: "Head of Sales", email: "b.cooper@airtable.com", currentStep: 3, totalSteps: 3, status: "replied", nextAction: "Demo booked", nextDate: daysAgo(1), source: "SaaStr Badge Scans", score: 94 },
      { id: "fl_028", name: "Emma Wilson", company: "Calendly", title: "Director BD", email: "e.wilson@calendly.com", currentStep: 3, totalSteps: 3, status: "completed", nextAction: "Sequence done", nextDate: daysAgo(6), source: "SaaStr Badge Scans", score: 79 },
      { id: "fl_029", name: "David Kim", company: "MongoDB", title: "VP Sales", email: "d.kim@mongodb.com", currentStep: 2, totalSteps: 3, status: "sent", nextAction: "Waiting", nextDate: daysAgo(2), source: "SaaStr Badge Scans", score: 71 },
      { id: "fl_030", name: "Sarah Lin", company: "Twilio", title: "SDR Manager", email: "s.lin@twilio.com", currentStep: 3, totalSteps: 3, status: "completed", nextAction: "Sequence done", nextDate: daysAgo(4), source: "SaaStr Badge Scans", score: 76 },
    ],
    cockpit: {
      linkedin: [],
      calls: [],
      email: { sentToday: 0, scheduled: 0, opened: 0, openRate: 0, replied: 0, replyRate: 0 },
    },
    analyticsSteps: [
      { label: "Nice Meeting You", channel: "email", sent: 47, opened: 31, replied: 5, openRate: 66.0, replyRate: 10.6 },
      { label: "LinkedIn Follow", channel: "linkedin", sent: 44, opened: 38, replied: 7, openRate: 86.4, replyRate: 15.9 },
      { label: "Resource Share", channel: "email", sent: 38, opened: 24, replied: 9, openRate: 63.2, replyRate: 23.7 },
    ],
    createdAt: daysAgo(42),
  },
  {
    id: "funnel_004",
    name: "DevOps Hiring",
    description: "Target companies actively hiring DevOps and platform engineers",
    status: "draft",
    steps: [
      { id: "s1", channel: "email", label: "Intro Email", dayOffset: 0 },
      { id: "s2", channel: "linkedin", label: "Connect Request", dayOffset: 2 },
      { id: "s3", channel: "email", label: "Case Study", dayOffset: 5 },
      { id: "s4", channel: "call", label: "Intro Call", dayOffset: 8 },
      { id: "s5", channel: "email", label: "Final Follow-up", dayOffset: 12 },
    ],
    metrics: { total: 0, active: 0, replied: 0, replyRate: 0, bounced: 0, completed: 0 },
    sources: [],
    leads: [],
    cockpit: {
      linkedin: [],
      calls: [],
      email: { sentToday: 0, scheduled: 0, opened: 0, openRate: 0, replied: 0, replyRate: 0 },
    },
    analyticsSteps: [
      { label: "Intro Email", channel: "email", sent: 0, opened: 0, replied: 0, openRate: 0, replyRate: 0 },
      { label: "Connect Request", channel: "linkedin", sent: 0, opened: 0, replied: 0, openRate: 0, replyRate: 0 },
      { label: "Case Study", channel: "email", sent: 0, opened: 0, replied: 0, openRate: 0, replyRate: 0 },
      { label: "Intro Call", channel: "call", sent: 0, opened: 0, replied: 0, openRate: 0, replyRate: 0 },
      { label: "Final Follow-up", channel: "email", sent: 0, opened: 0, replied: 0, openRate: 0, replyRate: 0 },
    ],
    createdAt: daysAgo(2),
  },
];

// Backward-compatible funnel picker options for ICP lead table
export const mockFunnelPickerOptions = mockFunnels
  .filter((f) => f.status !== "draft")
  .map((f) => ({ id: f.id, name: f.name, description: f.description }));
