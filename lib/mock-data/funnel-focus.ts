import type { FunnelLeadFocusData } from "../types/funnel-focus";

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000);
}

const focusDataList: FunnelLeadFocusData[] = [
  // Funnel 1 leads (fl_001 - fl_010)
  {
    leadId: "fl_001",
    company: {
      name: "Monzo", domain: "monzo.com",
      website: "https://monzo.com", address: "Broadwalk House, London, UK",
      description: "Digital banking platform serving over 7 million customers across the UK with current accounts, savings, and business banking.",
      industry: "FinTech", employeeCount: 2800, linkedinUrl: "https://linkedin.com/company/monzo-bank",
    },
    contacts: [
      { id: "c_001", name: "Sarah Chen", title: "VP of Sales", email: "s.chen@monzo.com", phone: "+44 20 7946 0101", linkedinUrl: "https://linkedin.com/in/sarachen", isPrimary: true },
      { id: "c_002", name: "Tom Richards", title: "Head of Growth", email: "t.richards@monzo.com", phone: "+44 20 7946 0102", linkedinUrl: null, isPrimary: false },
    ],
    activities: [
      { id: "a_001", type: "email_opened", summary: "Opened \"Intro Email\"", timestamp: hoursAgo(2), userInitials: "YA" },
      { id: "a_002", type: "email_sent", summary: "Sent \"Intro Email\"", detail: "Subject: Quick question about Monzo's sales stack", timestamp: daysAgo(1), userInitials: "YA" },
      { id: "a_003", type: "import", summary: "Bulk imported from Hiring Signals", timestamp: daysAgo(3), userInitials: "SY" },
    ],
    customFields: [
      { label: "Company LinkedIn", value: "https://linkedin.com/company/monzo-bank", isLink: true },
      { label: "Funding Stage", value: "Series G" },
    ],
    localTime: "4:35 PM",
  },
  {
    leadId: "fl_002",
    company: {
      name: "Revolut", domain: "revolut.com",
      website: "https://revolut.com", address: "7 Westferry Circus, London, UK",
      description: "Global financial super app with 35M+ customers offering banking, crypto, trading, and insurance.",
      industry: "FinTech", employeeCount: 6500, linkedinUrl: "https://linkedin.com/company/revolut",
    },
    contacts: [
      { id: "c_003", name: "James Wright", title: "Head of Growth", email: "j.wright@revolut.com", phone: "+44 20 7946 0201", linkedinUrl: "https://linkedin.com/in/jameswright", isPrimary: true },
      { id: "c_004", name: "Priya Sharma", title: "Growth Manager", email: "p.sharma@revolut.com", phone: "+44 20 7946 0202", linkedinUrl: "https://linkedin.com/in/priyasharma", isPrimary: false },
      { id: "c_005", name: "Daniel Osei", title: "VP Sales EMEA", email: "d.osei@revolut.com", phone: null, linkedinUrl: "https://linkedin.com/in/danielosei", isPrimary: false },
    ],
    activities: [
      { id: "a_004", type: "email_sent", summary: "Replied with interest", detail: "\"Let's set up a quick call next week\"", timestamp: hoursAgo(5), userInitials: "JW" },
      { id: "a_005", type: "linkedin", summary: "Accepted connection request", timestamp: daysAgo(2), userInitials: "YA" },
      { id: "a_006", type: "email_sent", summary: "Sent \"Follow-up Email\"", detail: "Subject: Re: Outbound at scale for Revolut", timestamp: daysAgo(4), userInitials: "YA" },
      { id: "a_007", type: "email_opened", summary: "Opened \"Intro Email\"", timestamp: daysAgo(6), userInitials: "YA" },
      { id: "a_008", type: "email_sent", summary: "Sent \"Intro Email\"", detail: "Subject: Revolut's outbound — quick idea", timestamp: daysAgo(7), userInitials: "YA" },
      { id: "a_009", type: "import", summary: "Imported from SaaStr List", timestamp: daysAgo(10), userInitials: "SY" },
    ],
    customFields: [
      { label: "Company LinkedIn", value: "https://linkedin.com/company/revolut", isLink: true },
      { label: "Funding Stage", value: "Series E" },
      { label: "Annual Revenue", value: "$1.8B" },
    ],
    localTime: "4:35 PM",
  },
  {
    leadId: "fl_003",
    company: {
      name: "GoCardless", domain: "gocardless.com",
      website: "https://gocardless.com", address: "Sutton Yard, London, UK",
      description: "Global leader in bank payment solutions, processing over $30B annually for 75,000+ businesses.",
      industry: "Payments", employeeCount: 900, linkedinUrl: "https://linkedin.com/company/gocardless",
    },
    contacts: [
      { id: "c_006", name: "Emily Watson", title: "Director of Sales", email: "e.watson@gocardless.com", phone: "+44 20 7946 0301", linkedinUrl: "https://linkedin.com/in/emilywatson", isPrimary: true },
    ],
    activities: [
      { id: "a_010", type: "email_sent", summary: "Sent \"Intro Email\"", detail: "Subject: GoCardless + signal-driven outbound", timestamp: daysAgo(2), userInitials: "YA" },
      { id: "a_011", type: "import", summary: "Bulk imported from Hiring Signals", timestamp: daysAgo(5), userInitials: "SY" },
    ],
    customFields: [
      { label: "Company LinkedIn", value: "https://linkedin.com/company/gocardless", isLink: true },
      { label: "Funding Stage", value: "Series G" },
    ],
    localTime: "4:35 PM",
  },
  {
    leadId: "fl_004",
    company: {
      name: "Paddle", domain: "paddle.com",
      website: "https://paddle.com", address: "15 Brixton Road, London, UK",
      description: "Complete payments infrastructure for SaaS companies — billing, tax compliance, and subscription management.",
      industry: "SaaS / Payments", employeeCount: 450, linkedinUrl: "https://linkedin.com/company/paddle-com",
    },
    contacts: [
      { id: "c_007", name: "Oliver Brown", title: "CRO", email: "o.brown@paddle.com", phone: "+44 20 7946 0401", linkedinUrl: "https://linkedin.com/in/oliverbrown", isPrimary: true },
      { id: "c_008", name: "Lucy Fletcher", title: "Head of Sales Ops", email: "l.fletcher@paddle.com", phone: "+44 20 7946 0402", linkedinUrl: null, isPrimary: false },
    ],
    activities: [
      { id: "a_012", type: "call", summary: "Called — no answer", detail: "Rang 4 times, went to voicemail", timestamp: hoursAgo(6), userInitials: "YA" },
      { id: "a_013", type: "email_opened", summary: "Opened \"Follow-up Email\"", timestamp: daysAgo(1), userInitials: "YA" },
      { id: "a_014", type: "email_sent", summary: "Sent \"Follow-up Email\"", detail: "Subject: Re: Paddle's revenue stack", timestamp: daysAgo(3), userInitials: "YA" },
      { id: "a_015", type: "linkedin", summary: "Sent connection request", timestamp: daysAgo(5), userInitials: "YA" },
      { id: "a_016", type: "import", summary: "Imported from UK Tech Companies", timestamp: daysAgo(8), userInitials: "SY" },
    ],
    customFields: [
      { label: "Company LinkedIn", value: "https://linkedin.com/company/paddle-com", isLink: true },
      { label: "Funding Stage", value: "Series D" },
    ],
    localTime: "4:35 PM",
  },
  {
    leadId: "fl_005",
    company: {
      name: "Checkout.com", domain: "checkout.com",
      website: "https://checkout.com", address: "Wenlock Works, London, UK",
      description: "Cloud-based payments platform processing for enterprise merchants globally.",
      industry: "Payments", employeeCount: 1800, linkedinUrl: "https://linkedin.com/company/checkout-com",
    },
    contacts: [
      { id: "c_009", name: "Charlotte Taylor", title: "VP Revenue", email: "c.taylor@checkout.com", phone: "+44 20 7946 0501", linkedinUrl: "https://linkedin.com/in/charlottetaylor", isPrimary: true },
      { id: "c_010", name: "Marcus Adebayo", title: "Sales Director", email: "m.adebayo@checkout.com", phone: "+44 20 7946 0502", linkedinUrl: null, isPrimary: false },
      { id: "c_011", name: "Sophie Turner", title: "Head of Partnerships", email: "s.turner@checkout.com", phone: null, linkedinUrl: "https://linkedin.com/in/sophieturner", isPrimary: false },
    ],
    activities: [
      { id: "a_017", type: "status_change", summary: "Status changed to Completed", timestamp: hoursAgo(12), userInitials: "YA" },
      { id: "a_018", type: "email_sent", summary: "Replied: meeting booked", detail: "\"Thursday 2pm works — sent a calendar invite\"", timestamp: daysAgo(1), userInitials: "CT" },
      { id: "a_019", type: "call", summary: "Discovery call — 12 min", detail: "Discussed pain points with current outbound tools", timestamp: daysAgo(3), userInitials: "YA" },
      { id: "a_020", type: "email_opened", summary: "Opened \"Intro Email\"", timestamp: daysAgo(7), userInitials: "YA" },
      { id: "a_021", type: "email_sent", summary: "Sent \"Intro Email\"", timestamp: daysAgo(8), userInitials: "YA" },
      { id: "a_022", type: "import", summary: "Imported from SaaStr List", timestamp: daysAgo(12), userInitials: "SY" },
    ],
    customFields: [
      { label: "Company LinkedIn", value: "https://linkedin.com/company/checkout-com", isLink: true },
      { label: "Funding Stage", value: "Series D" },
      { label: "Annual Revenue", value: "$500M+" },
    ],
    localTime: "4:35 PM",
  },
  {
    leadId: "fl_006",
    company: {
      name: "Starling Bank", domain: "starlingbank.com",
      website: "https://starlingbank.com", address: "Finsbury Avenue, London, UK",
      description: "Award-winning digital bank offering personal, business, and joint accounts across the UK.",
      industry: "Banking", employeeCount: 2200, linkedinUrl: "https://linkedin.com/company/starling-bank",
    },
    contacts: [
      { id: "c_012", name: "Harry Wilson", title: "Head of Partnerships", email: "h.wilson@starlingbank.com", phone: null, linkedinUrl: "https://linkedin.com/in/harrywilson", isPrimary: true },
    ],
    activities: [
      { id: "a_023", type: "status_change", summary: "Email bounced", detail: "550 5.1.1 User unknown", timestamp: daysAgo(1), userInitials: "SY" },
      { id: "a_024", type: "email_sent", summary: "Sent \"Intro Email\"", timestamp: daysAgo(1), userInitials: "YA" },
      { id: "a_025", type: "import", summary: "Bulk imported from Hiring Signals", timestamp: daysAgo(3), userInitials: "SY" },
    ],
    customFields: [
      { label: "Company LinkedIn", value: "https://linkedin.com/company/starling-bank", isLink: true },
    ],
    localTime: "4:35 PM",
  },
  {
    leadId: "fl_007",
    company: {
      name: "Wise", domain: "wise.com",
      website: "https://wise.com", address: "Tea Building, London, UK",
      description: "International money transfer service used by 16M customers to send money abroad at the real exchange rate.",
      industry: "FinTech", employeeCount: 4500, linkedinUrl: "https://linkedin.com/company/wiseaccount",
    },
    contacts: [
      { id: "c_013", name: "Amelia Clarke", title: "Director of Marketing", email: "a.clarke@wise.com", phone: "+44 20 7946 0701", linkedinUrl: "https://linkedin.com/in/ameliaclarke", isPrimary: true },
      { id: "c_014", name: "Raj Patel", title: "Marketing Manager", email: "r.patel@wise.com", phone: null, linkedinUrl: null, isPrimary: false },
    ],
    activities: [
      { id: "a_026", type: "email_opened", summary: "Opened \"Follow-up Email\"", timestamp: hoursAgo(4), userInitials: "YA" },
      { id: "a_027", type: "email_sent", summary: "Sent \"Follow-up Email\"", detail: "Subject: Re: signal-driven outreach for Wise", timestamp: daysAgo(2), userInitials: "YA" },
      { id: "a_028", type: "linkedin", summary: "Sent connection request", timestamp: daysAgo(4), userInitials: "YA" },
      { id: "a_029", type: "email_sent", summary: "Sent \"Intro Email\"", timestamp: daysAgo(6), userInitials: "YA" },
      { id: "a_030", type: "import", summary: "Imported from UK Tech Companies", timestamp: daysAgo(9), userInitials: "SY" },
    ],
    customFields: [
      { label: "Company LinkedIn", value: "https://linkedin.com/company/wiseaccount", isLink: true },
      { label: "Funding Stage", value: "Public (LSE)" },
    ],
    localTime: "4:35 PM",
  },
  {
    leadId: "fl_008",
    company: {
      name: "Thought Machine", domain: "thoughtmachine.net",
      website: "https://thoughtmachine.net", address: "Whitechapel, London, UK",
      description: "Cloud-native core banking technology provider powering banks across 5 continents.",
      industry: "Banking Infrastructure", employeeCount: 600, linkedinUrl: "https://linkedin.com/company/thought-machine",
    },
    contacts: [
      { id: "c_015", name: "George Evans", title: "VP Engineering", email: "g.evans@thoughtmachine.net", phone: "+44 20 7946 0801", linkedinUrl: "https://linkedin.com/in/georgeevans", isPrimary: true },
    ],
    activities: [
      { id: "a_031", type: "import", summary: "Imported from SaaStr List", timestamp: daysAgo(1), userInitials: "SY" },
    ],
    customFields: [
      { label: "Funding Stage", value: "Series C" },
    ],
    localTime: "4:35 PM",
  },
  {
    leadId: "fl_009",
    company: {
      name: "Cazoo", domain: "cazoo.co.uk",
      website: "https://cazoo.co.uk", address: "41 Chalton Street, London, UK",
      description: "Online car retailer offering a seamless digital experience for buying used cars with home delivery.",
      industry: "Automotive / E-Commerce", employeeCount: 1200, linkedinUrl: "https://linkedin.com/company/cazoo",
    },
    contacts: [
      { id: "c_016", name: "Isla Roberts", title: "Head of Sales", email: "i.roberts@cazoo.co.uk", phone: "+44 20 7946 0901", linkedinUrl: "https://linkedin.com/in/islaroberts", isPrimary: true },
      { id: "c_017", name: "Nathan Brooks", title: "Sales Manager", email: "n.brooks@cazoo.co.uk", phone: "+44 20 7946 0902", linkedinUrl: null, isPrimary: false },
    ],
    activities: [
      { id: "a_032", type: "email_sent", summary: "Replied with interest", detail: "\"Sounds great, can we do a demo next Tuesday?\"", timestamp: hoursAgo(8), userInitials: "IR" },
      { id: "a_033", type: "call", summary: "Discovery call — 8 min", detail: "Good rapport, interested in signal features", timestamp: daysAgo(2), userInitials: "YA" },
      { id: "a_034", type: "email_opened", summary: "Opened \"Follow-up Email\"", timestamp: daysAgo(3), userInitials: "YA" },
      { id: "a_035", type: "email_sent", summary: "Sent \"Follow-up Email\"", timestamp: daysAgo(4), userInitials: "YA" },
      { id: "a_036", type: "import", summary: "Bulk imported from Hiring Signals", timestamp: daysAgo(10), userInitials: "SY" },
    ],
    customFields: [
      { label: "Company LinkedIn", value: "https://linkedin.com/company/cazoo", isLink: true },
      { label: "Funding Stage", value: "Public (NYSE)" },
    ],
    localTime: "4:35 PM",
  },
  {
    leadId: "fl_010",
    company: {
      name: "Snyk", domain: "snyk.io",
      website: "https://snyk.io", address: "Highlands House, London, UK",
      description: "Developer security platform helping teams find and fix vulnerabilities in code, dependencies, containers, and IaC.",
      industry: "Cybersecurity", employeeCount: 1100, linkedinUrl: "https://linkedin.com/company/snyk",
    },
    contacts: [
      { id: "c_018", name: "Noah Harris", title: "SDR Manager", email: "n.harris@snyk.io", phone: "+44 20 7946 1001", linkedinUrl: "https://linkedin.com/in/noahharris", isPrimary: true },
      { id: "c_019", name: "Emma Collins", title: "Sales Director", email: "e.collins@snyk.io", phone: null, linkedinUrl: "https://linkedin.com/in/emmacollins", isPrimary: false },
    ],
    activities: [
      { id: "a_037", type: "email_sent", summary: "Sent \"Intro Email\"", detail: "Subject: SDR signals for Snyk", timestamp: daysAgo(1), userInitials: "YA" },
      { id: "a_038", type: "import", summary: "Imported from UK Tech Companies", timestamp: daysAgo(4), userInitials: "SY" },
    ],
    customFields: [
      { label: "Company LinkedIn", value: "https://linkedin.com/company/snyk", isLink: true },
      { label: "Funding Stage", value: "Series G" },
    ],
    localTime: "4:35 PM",
  },

  // Funnel 2 leads (fl_011 - fl_020)
  {
    leadId: "fl_011",
    company: {
      name: "PostHog", domain: "posthog.com",
      website: "https://posthog.com", address: "San Francisco, CA",
      description: "Open-source product analytics platform with session recording, feature flags, and A/B testing.",
      industry: "Product Analytics", employeeCount: 80, linkedinUrl: "https://linkedin.com/company/posthog",
    },
    contacts: [
      { id: "c_020", name: "Alex Rivera", title: "Head of Growth", email: "a.rivera@posthog.com", phone: "+1 415-555-1101", linkedinUrl: "https://linkedin.com/in/alexrivera", isPrimary: true },
    ],
    activities: [
      { id: "a_039", type: "email_opened", summary: "Opened \"Warm Intro\"", timestamp: hoursAgo(3), userInitials: "YA" },
      { id: "a_040", type: "email_sent", summary: "Sent \"Warm Intro\"", detail: "Subject: PostHog + signal-driven growth", timestamp: daysAgo(2), userInitials: "YA" },
      { id: "a_041", type: "import", summary: "Imported from Funding Signals", timestamp: daysAgo(5), userInitials: "SY" },
    ],
    customFields: [
      { label: "Funding Stage", value: "Series B" },
    ],
    localTime: "11:35 AM",
  },
  {
    leadId: "fl_012",
    company: {
      name: "Raycast", domain: "raycast.com",
      website: "https://raycast.com", address: "London, UK",
      description: "Blazingly fast productivity tool replacing Spotlight for developers and teams.",
      industry: "Developer Tools", employeeCount: 45, linkedinUrl: "https://linkedin.com/company/raycast",
    },
    contacts: [
      { id: "c_021", name: "Mia Patel", title: "CEO", email: "m.patel@raycast.com", phone: "+1 415-555-1201", linkedinUrl: "https://linkedin.com/in/miapatel", isPrimary: true },
      { id: "c_022", name: "Thomas Berg", title: "Head of Business", email: "t.berg@raycast.com", phone: null, linkedinUrl: null, isPrimary: false },
    ],
    activities: [
      { id: "a_042", type: "email_sent", summary: "Replied with interest", detail: "\"This looks relevant, send me a case study?\"", timestamp: hoursAgo(6), userInitials: "MP" },
      { id: "a_043", type: "email_sent", summary: "Sent \"Value Add Email\"", timestamp: daysAgo(3), userInitials: "YA" },
      { id: "a_044", type: "linkedin", summary: "Connected on LinkedIn", timestamp: daysAgo(5), userInitials: "YA" },
      { id: "a_045", type: "email_sent", summary: "Sent \"Warm Intro\"", timestamp: daysAgo(7), userInitials: "YA" },
      { id: "a_046", type: "import", summary: "Imported from Funding Signals", timestamp: daysAgo(10), userInitials: "SY" },
    ],
    customFields: [
      { label: "Funding Stage", value: "Series B" },
    ],
    localTime: "4:35 PM",
  },
  {
    leadId: "fl_013",
    company: {
      name: "Resend", domain: "resend.com",
      website: "https://resend.com", address: "San Francisco, CA",
      description: "Email API for developers — build, test, and send transactional emails at scale.",
      industry: "Developer Tools", employeeCount: 30, linkedinUrl: "https://linkedin.com/company/resend-inc",
    },
    contacts: [
      { id: "c_023", name: "Liam Foster", title: "CTO", email: "l.foster@resend.com", phone: "+1 415-555-1301", linkedinUrl: "https://linkedin.com/in/liamfoster", isPrimary: true },
    ],
    activities: [
      { id: "a_047", type: "email_sent", summary: "Sent \"Warm Intro\"", detail: "Subject: Resend + outbound signals", timestamp: daysAgo(1), userInitials: "YA" },
      { id: "a_048", type: "import", summary: "Imported from Zapier Inbound", timestamp: daysAgo(3), userInitials: "SY" },
    ],
    customFields: [
      { label: "Funding Stage", value: "Seed" },
    ],
    localTime: "11:35 AM",
  },
  {
    leadId: "fl_014",
    company: {
      name: "Neon", domain: "neon.tech",
      website: "https://neon.tech", address: "San Francisco, CA",
      description: "Serverless Postgres with branching, autoscaling, and bottomless storage.",
      industry: "Database / Infrastructure", employeeCount: 120, linkedinUrl: "https://linkedin.com/company/neondatabase",
    },
    contacts: [
      { id: "c_024", name: "Sophia Kim", title: "VP Sales", email: "s.kim@neon.tech", phone: "+1 415-555-1401", linkedinUrl: "https://linkedin.com/in/sophiakim", isPrimary: true },
    ],
    activities: [
      { id: "a_049", type: "status_change", summary: "Status changed to Completed", timestamp: hoursAgo(10), userInitials: "YA" },
      { id: "a_050", type: "call", summary: "Demo call — 22 min", detail: "Full product demo, very interested", timestamp: daysAgo(2), userInitials: "YA" },
      { id: "a_051", type: "email_sent", summary: "Replied: scheduled demo", timestamp: daysAgo(4), userInitials: "SK" },
      { id: "a_052", type: "email_sent", summary: "Sent \"Value Add Email\"", timestamp: daysAgo(6), userInitials: "YA" },
      { id: "a_053", type: "import", summary: "Imported from Funding Signals", timestamp: daysAgo(10), userInitials: "SY" },
    ],
    customFields: [
      { label: "Funding Stage", value: "Series B" },
      { label: "Annual Revenue", value: "$15M ARR" },
    ],
    localTime: "11:35 AM",
  },
  {
    leadId: "fl_015",
    company: {
      name: "Vercel", domain: "vercel.com",
      website: "https://vercel.com", address: "San Francisco, CA",
      description: "Frontend cloud platform for building and deploying web experiences, creators of Next.js.",
      industry: "Developer Platform", employeeCount: 550, linkedinUrl: "https://linkedin.com/company/vercel",
    },
    contacts: [
      { id: "c_025", name: "Ethan Moore", title: "Director BD", email: "e.moore@vercel.com", phone: "+1 415-555-1501", linkedinUrl: "https://linkedin.com/in/ethanmoore", isPrimary: true },
    ],
    activities: [
      { id: "a_054", type: "email_opened", summary: "Opened \"Warm Intro\"", timestamp: daysAgo(1), userInitials: "YA" },
      { id: "a_055", type: "email_sent", summary: "Sent \"Warm Intro\"", timestamp: daysAgo(2), userInitials: "YA" },
      { id: "a_056", type: "import", summary: "Imported from Zapier Inbound", timestamp: daysAgo(5), userInitials: "SY" },
    ],
    customFields: [
      { label: "Funding Stage", value: "Series E" },
    ],
    localTime: "11:35 AM",
  },
  {
    leadId: "fl_016",
    company: {
      name: "Supabase", domain: "supabase.com",
      website: "https://supabase.com", address: "San Francisco, CA",
      description: "Open source Firebase alternative with Postgres database, auth, edge functions, and realtime subscriptions.",
      industry: "Developer Tools", employeeCount: 100, linkedinUrl: "https://linkedin.com/company/supabase",
    },
    contacts: [
      { id: "c_026", name: "Ava Thompson", title: "Head of Sales", email: "a.thompson@supabase.com", phone: null, linkedinUrl: "https://linkedin.com/in/avathompson", isPrimary: true },
    ],
    activities: [
      { id: "a_057", type: "status_change", summary: "Email bounced", detail: "550 5.1.1 User unknown", timestamp: daysAgo(1), userInitials: "SY" },
      { id: "a_058", type: "email_sent", summary: "Sent \"Warm Intro\"", timestamp: daysAgo(1), userInitials: "YA" },
      { id: "a_059", type: "import", summary: "Imported from Funding Signals", timestamp: daysAgo(4), userInitials: "SY" },
    ],
    customFields: [
      { label: "Funding Stage", value: "Series C" },
    ],
    localTime: "11:35 AM",
  },
  {
    leadId: "fl_017",
    company: {
      name: "Linear", domain: "linear.app",
      website: "https://linear.app", address: "San Francisco, CA",
      description: "Streamlined project management and issue tracking for software teams.",
      industry: "Productivity / SaaS", employeeCount: 70, linkedinUrl: "https://linkedin.com/company/linearapp",
    },
    contacts: [
      { id: "c_027", name: "Lucas White", title: "CRO", email: "l.white@linear.app", phone: "+1 415-555-1701", linkedinUrl: "https://linkedin.com/in/lucaswhite", isPrimary: true },
      { id: "c_028", name: "Anna Lee", title: "Sales Lead", email: "a.lee@linear.app", phone: "+1 415-555-1702", linkedinUrl: null, isPrimary: false },
    ],
    activities: [
      { id: "a_060", type: "email_opened", summary: "Opened \"Value Add Email\"", timestamp: hoursAgo(5), userInitials: "YA" },
      { id: "a_061", type: "note", summary: "Added note: wants callback after board meeting", timestamp: daysAgo(1), userInitials: "YA" },
      { id: "a_062", type: "email_sent", summary: "Sent \"Value Add Email\"", timestamp: daysAgo(3), userInitials: "YA" },
      { id: "a_063", type: "linkedin", summary: "Connected on LinkedIn", timestamp: daysAgo(5), userInitials: "YA" },
      { id: "a_064", type: "email_sent", summary: "Sent \"Warm Intro\"", timestamp: daysAgo(7), userInitials: "YA" },
      { id: "a_065", type: "import", summary: "Imported from Zapier Inbound", timestamp: daysAgo(10), userInitials: "SY" },
    ],
    customFields: [
      { label: "Funding Stage", value: "Series C" },
    ],
    localTime: "11:35 AM",
  },
  {
    leadId: "fl_018",
    company: {
      name: "Clerk", domain: "clerk.com",
      website: "https://clerk.com", address: "San Francisco, CA",
      description: "Authentication and user management platform for modern web applications.",
      industry: "Auth / Developer Tools", employeeCount: 55, linkedinUrl: "https://linkedin.com/company/clerk-dev",
    },
    contacts: [
      { id: "c_029", name: "Isabella Chen", title: "VP Marketing", email: "i.chen@clerk.com", phone: "+1 415-555-1801", linkedinUrl: "https://linkedin.com/in/isabellachen", isPrimary: true },
    ],
    activities: [
      { id: "a_066", type: "email_sent", summary: "Sent \"Warm Intro\"", detail: "Subject: Auth companies + outbound signals", timestamp: daysAgo(2), userInitials: "YA" },
      { id: "a_067", type: "import", summary: "Imported from Funding Signals", timestamp: daysAgo(5), userInitials: "SY" },
    ],
    customFields: [
      { label: "Funding Stage", value: "Series B" },
    ],
    localTime: "11:35 AM",
  },
  {
    leadId: "fl_019",
    company: {
      name: "Fly.io", domain: "fly.io",
      website: "https://fly.io", address: "Chicago, IL",
      description: "Deploy app servers close to your users with a global edge platform for full-stack apps.",
      industry: "Cloud Infrastructure", employeeCount: 90, linkedinUrl: "https://linkedin.com/company/fly-io",
    },
    contacts: [
      { id: "c_030", name: "Mason Lee", title: "Head of Revenue", email: "m.lee@fly.io", phone: "+1 415-555-1901", linkedinUrl: "https://linkedin.com/in/masonlee", isPrimary: true },
    ],
    activities: [
      { id: "a_068", type: "import", summary: "Imported from Zapier Inbound", timestamp: daysAgo(1), userInitials: "SY" },
    ],
    customFields: [
      { label: "Funding Stage", value: "Series C" },
    ],
    localTime: "10:35 AM",
  },
  {
    leadId: "fl_020",
    company: {
      name: "Railway", domain: "railway.app",
      website: "https://railway.app", address: "San Francisco, CA",
      description: "Infrastructure platform for developers to deploy, manage, and scale applications effortlessly.",
      industry: "Cloud Infrastructure", employeeCount: 40, linkedinUrl: "https://linkedin.com/company/railway-app",
    },
    contacts: [
      { id: "c_031", name: "Harper Davis", title: "CEO", email: "h.davis@railway.app", phone: "+1 415-555-2001", linkedinUrl: "https://linkedin.com/in/harperdavis", isPrimary: true },
    ],
    activities: [
      { id: "a_069", type: "email_sent", summary: "Replied: interested in demo", detail: "\"This is exactly what we need. Let's chat.\"", timestamp: hoursAgo(4), userInitials: "HD" },
      { id: "a_070", type: "call", summary: "Quick call — 6 min", detail: "Initial discovery, very warm", timestamp: daysAgo(2), userInitials: "YA" },
      { id: "a_071", type: "email_sent", summary: "Sent \"Value Add Email\"", timestamp: daysAgo(4), userInitials: "YA" },
      { id: "a_072", type: "linkedin", summary: "Connected on LinkedIn", timestamp: daysAgo(6), userInitials: "YA" },
      { id: "a_073", type: "email_sent", summary: "Sent \"Warm Intro\"", timestamp: daysAgo(8), userInitials: "YA" },
      { id: "a_074", type: "import", summary: "Imported from Funding Signals", timestamp: daysAgo(12), userInitials: "SY" },
    ],
    customFields: [
      { label: "Funding Stage", value: "Series B" },
    ],
    localTime: "11:35 AM",
  },

  // Funnel 3 leads (fl_021 - fl_030)
  {
    leadId: "fl_021",
    company: {
      name: "Amplitude", domain: "amplitude.com",
      website: "https://amplitude.com", address: "San Francisco, CA",
      description: "Digital analytics platform helping companies build better products through data-driven insights.",
      industry: "Product Analytics", employeeCount: 850, linkedinUrl: "https://linkedin.com/company/amplitude-analytics",
    },
    contacts: [
      { id: "c_032", name: "Ryan Park", title: "VP Sales", email: "r.park@amplitude.com", phone: "+1 415-555-2101", linkedinUrl: "https://linkedin.com/in/ryanpark", isPrimary: true },
    ],
    activities: [
      { id: "a_075", type: "status_change", summary: "Sequence completed", timestamp: daysAgo(2), userInitials: "SY" },
      { id: "a_076", type: "email_sent", summary: "Sent \"Resource Share\"", timestamp: daysAgo(5), userInitials: "YA" },
      { id: "a_077", type: "linkedin", summary: "Followed on LinkedIn", timestamp: daysAgo(7), userInitials: "YA" },
      { id: "a_078", type: "email_sent", summary: "Sent \"Nice Meeting You\"", timestamp: daysAgo(9), userInitials: "YA" },
      { id: "a_079", type: "import", summary: "Imported from SaaStr Badge Scans", timestamp: daysAgo(10), userInitials: "SY" },
    ],
    customFields: [
      { label: "Met at", value: "SaaStr Annual 2025" },
    ],
    localTime: "11:35 AM",
  },
  {
    leadId: "fl_022",
    company: {
      name: "Datadog", domain: "datadoghq.com",
      website: "https://datadoghq.com", address: "New York, NY",
      description: "Cloud monitoring and security platform for infrastructure, applications, and logs.",
      industry: "Cloud Monitoring", employeeCount: 5500, linkedinUrl: "https://linkedin.com/company/datadog",
    },
    contacts: [
      { id: "c_033", name: "Diana Flores", title: "Director of Sales", email: "d.flores@datadoghq.com", phone: "+1 415-555-2201", linkedinUrl: "https://linkedin.com/in/dianaflores", isPrimary: true },
      { id: "c_034", name: "Chris Nolan", title: "Enterprise AE", email: "c.nolan@datadoghq.com", phone: "+1 415-555-2202", linkedinUrl: null, isPrimary: false },
    ],
    activities: [
      { id: "a_080", type: "email_sent", summary: "Replied: wants to learn more", detail: "\"Great meeting you at SaaStr. Send me the signal report?\"", timestamp: daysAgo(1), userInitials: "DF" },
      { id: "a_081", type: "email_sent", summary: "Sent \"Resource Share\"", timestamp: daysAgo(3), userInitials: "YA" },
      { id: "a_082", type: "linkedin", summary: "Followed on LinkedIn", timestamp: daysAgo(5), userInitials: "YA" },
      { id: "a_083", type: "email_sent", summary: "Sent \"Nice Meeting You\"", timestamp: daysAgo(7), userInitials: "YA" },
      { id: "a_084", type: "import", summary: "Imported from SaaStr Badge Scans", timestamp: daysAgo(8), userInitials: "SY" },
    ],
    customFields: [
      { label: "Met at", value: "SaaStr Annual 2025" },
      { label: "Annual Revenue", value: "$2.1B" },
    ],
    localTime: "2:35 PM",
  },
  {
    leadId: "fl_023",
    company: {
      name: "Figma", domain: "figma.com",
      website: "https://figma.com", address: "San Francisco, CA",
      description: "Collaborative design platform for building meaningful products together.",
      industry: "Design Tools", employeeCount: 1500, linkedinUrl: "https://linkedin.com/company/figma",
    },
    contacts: [
      { id: "c_035", name: "Kevin Zhang", title: "Head of Growth", email: "k.zhang@figma.com", phone: "+1 415-555-2301", linkedinUrl: "https://linkedin.com/in/kevinzhang", isPrimary: true },
    ],
    activities: [
      { id: "a_085", type: "email_opened", summary: "Opened \"Nice Meeting You\"", timestamp: daysAgo(3), userInitials: "YA" },
      { id: "a_086", type: "linkedin", summary: "Followed on LinkedIn", timestamp: daysAgo(5), userInitials: "YA" },
      { id: "a_087", type: "email_sent", summary: "Sent \"Nice Meeting You\"", timestamp: daysAgo(7), userInitials: "YA" },
      { id: "a_088", type: "import", summary: "Imported from SaaStr Badge Scans", timestamp: daysAgo(8), userInitials: "SY" },
    ],
    customFields: [
      { label: "Met at", value: "SaaStr Annual 2025" },
    ],
    localTime: "11:35 AM",
  },
  {
    leadId: "fl_024",
    company: {
      name: "Notion", domain: "notion.so",
      website: "https://notion.so", address: "San Francisco, CA",
      description: "All-in-one workspace for notes, docs, project management, and wikis.",
      industry: "Productivity / SaaS", employeeCount: 500, linkedinUrl: "https://linkedin.com/company/notionhq",
    },
    contacts: [
      { id: "c_036", name: "Natalie Wood", title: "VP Marketing", email: "n.wood@notion.so", phone: "+1 415-555-2401", linkedinUrl: "https://linkedin.com/in/nataliewood", isPrimary: true },
    ],
    activities: [
      { id: "a_089", type: "status_change", summary: "Sequence completed", timestamp: daysAgo(5), userInitials: "SY" },
      { id: "a_090", type: "email_sent", summary: "Sent \"Resource Share\"", timestamp: daysAgo(7), userInitials: "YA" },
      { id: "a_091", type: "email_sent", summary: "Sent \"Nice Meeting You\"", timestamp: daysAgo(10), userInitials: "YA" },
      { id: "a_092", type: "import", summary: "Imported from SaaStr Badge Scans", timestamp: daysAgo(12), userInitials: "SY" },
    ],
    customFields: [
      { label: "Met at", value: "SaaStr Annual 2025" },
    ],
    localTime: "11:35 AM",
  },
  {
    leadId: "fl_025",
    company: {
      name: "Miro", domain: "miro.com",
      website: "https://miro.com", address: "San Francisco, CA",
      description: "Online collaborative whiteboarding platform for distributed teams.",
      industry: "Collaboration / SaaS", employeeCount: 1800, linkedinUrl: "https://linkedin.com/company/maboread",
    },
    contacts: [
      { id: "c_037", name: "Jason Lee", title: "CRO", email: "j.lee@miro.com", phone: null, linkedinUrl: "https://linkedin.com/in/jasonlee", isPrimary: true },
    ],
    activities: [
      { id: "a_093", type: "status_change", summary: "Email bounced", detail: "550 Mailbox not found", timestamp: daysAgo(4), userInitials: "SY" },
      { id: "a_094", type: "email_sent", summary: "Sent \"Nice Meeting You\"", timestamp: daysAgo(4), userInitials: "YA" },
      { id: "a_095", type: "import", summary: "Imported from SaaStr Badge Scans", timestamp: daysAgo(5), userInitials: "SY" },
    ],
    customFields: [
      { label: "Met at", value: "SaaStr Annual 2025" },
    ],
    localTime: "11:35 AM",
  },
  {
    leadId: "fl_026",
    company: {
      name: "HubSpot", domain: "hubspot.com",
      website: "https://hubspot.com", address: "Cambridge, MA",
      description: "CRM platform for scaling companies — marketing, sales, service, and operations software.",
      industry: "CRM / SaaS", employeeCount: 7400, linkedinUrl: "https://linkedin.com/company/hubspot",
    },
    contacts: [
      { id: "c_038", name: "Maria Santos", title: "VP Revenue", email: "m.santos@hubspot.com", phone: "+1 415-555-2601", linkedinUrl: "https://linkedin.com/in/mariasantos", isPrimary: true },
    ],
    activities: [
      { id: "a_096", type: "status_change", summary: "Sequence completed", timestamp: daysAgo(3), userInitials: "SY" },
      { id: "a_097", type: "email_sent", summary: "Sent \"Resource Share\"", timestamp: daysAgo(5), userInitials: "YA" },
      { id: "a_098", type: "email_sent", summary: "Sent \"Nice Meeting You\"", timestamp: daysAgo(8), userInitials: "YA" },
      { id: "a_099", type: "import", summary: "Imported from SaaStr Badge Scans", timestamp: daysAgo(9), userInitials: "SY" },
    ],
    customFields: [
      { label: "Met at", value: "SaaStr Annual 2025" },
      { label: "Annual Revenue", value: "$2.2B" },
    ],
    localTime: "2:35 PM",
  },
  {
    leadId: "fl_027",
    company: {
      name: "Airtable", domain: "airtable.com",
      website: "https://airtable.com", address: "San Francisco, CA",
      description: "Low-code platform for building collaborative apps — spreadsheet meets database.",
      industry: "Productivity / SaaS", employeeCount: 900, linkedinUrl: "https://linkedin.com/company/airtable",
    },
    contacts: [
      { id: "c_039", name: "Ben Cooper", title: "Head of Sales", email: "b.cooper@airtable.com", phone: "+1 415-555-2701", linkedinUrl: "https://linkedin.com/in/bencooper", isPrimary: true },
      { id: "c_040", name: "Lisa Park", title: "Enterprise AE", email: "l.park@airtable.com", phone: "+1 415-555-2702", linkedinUrl: null, isPrimary: false },
    ],
    activities: [
      { id: "a_100", type: "email_sent", summary: "Replied: demo booked", detail: "\"Really enjoyed our chat at SaaStr. Let's do Thursday.\"", timestamp: daysAgo(1), userInitials: "BC" },
      { id: "a_101", type: "email_sent", summary: "Sent \"Resource Share\"", timestamp: daysAgo(3), userInitials: "YA" },
      { id: "a_102", type: "linkedin", summary: "Followed on LinkedIn", timestamp: daysAgo(5), userInitials: "YA" },
      { id: "a_103", type: "email_sent", summary: "Sent \"Nice Meeting You\"", timestamp: daysAgo(7), userInitials: "YA" },
      { id: "a_104", type: "import", summary: "Imported from SaaStr Badge Scans", timestamp: daysAgo(8), userInitials: "SY" },
    ],
    customFields: [
      { label: "Met at", value: "SaaStr Annual 2025" },
      { label: "Funding Stage", value: "Series F" },
    ],
    localTime: "11:35 AM",
  },
  {
    leadId: "fl_028",
    company: {
      name: "Calendly", domain: "calendly.com",
      website: "https://calendly.com", address: "Atlanta, GA",
      description: "Scheduling automation platform eliminating the back-and-forth for meetings.",
      industry: "Scheduling / SaaS", employeeCount: 700, linkedinUrl: "https://linkedin.com/company/calendly",
    },
    contacts: [
      { id: "c_041", name: "Emma Wilson", title: "Director BD", email: "e.wilson@calendly.com", phone: "+1 415-555-2801", linkedinUrl: "https://linkedin.com/in/emmawilson", isPrimary: true },
    ],
    activities: [
      { id: "a_105", type: "status_change", summary: "Sequence completed", timestamp: daysAgo(6), userInitials: "SY" },
      { id: "a_106", type: "email_sent", summary: "Sent \"Resource Share\"", timestamp: daysAgo(8), userInitials: "YA" },
      { id: "a_107", type: "email_sent", summary: "Sent \"Nice Meeting You\"", timestamp: daysAgo(11), userInitials: "YA" },
      { id: "a_108", type: "import", summary: "Imported from SaaStr Badge Scans", timestamp: daysAgo(12), userInitials: "SY" },
    ],
    customFields: [
      { label: "Met at", value: "SaaStr Annual 2025" },
    ],
    localTime: "2:35 PM",
  },
  {
    leadId: "fl_029",
    company: {
      name: "MongoDB", domain: "mongodb.com",
      website: "https://mongodb.com", address: "New York, NY",
      description: "General purpose, document-based, distributed database built for modern application developers.",
      industry: "Database / Infrastructure", employeeCount: 4800, linkedinUrl: "https://linkedin.com/company/mongodbinc",
    },
    contacts: [
      { id: "c_042", name: "David Kim", title: "VP Sales", email: "d.kim@mongodb.com", phone: "+1 415-555-2901", linkedinUrl: "https://linkedin.com/in/davidkim", isPrimary: true },
    ],
    activities: [
      { id: "a_109", type: "email_sent", summary: "Sent \"Nice Meeting You\"", timestamp: daysAgo(2), userInitials: "YA" },
      { id: "a_110", type: "import", summary: "Imported from SaaStr Badge Scans", timestamp: daysAgo(4), userInitials: "SY" },
    ],
    customFields: [
      { label: "Met at", value: "SaaStr Annual 2025" },
      { label: "Annual Revenue", value: "$1.7B" },
    ],
    localTime: "2:35 PM",
  },
  {
    leadId: "fl_030",
    company: {
      name: "Twilio", domain: "twilio.com",
      website: "https://twilio.com", address: "San Francisco, CA",
      description: "Cloud communications platform providing APIs for voice, SMS, video, and authentication.",
      industry: "Communications / SaaS", employeeCount: 7900, linkedinUrl: "https://linkedin.com/company/twilio-inc",
    },
    contacts: [
      { id: "c_043", name: "Sarah Lin", title: "SDR Manager", email: "s.lin@twilio.com", phone: "+1 415-555-3001", linkedinUrl: "https://linkedin.com/in/sarahlin", isPrimary: true },
      { id: "c_044", name: "Mike Chen", title: "Sales Director", email: "m.chen@twilio.com", phone: "+1 415-555-3002", linkedinUrl: null, isPrimary: false },
    ],
    activities: [
      { id: "a_111", type: "status_change", summary: "Sequence completed", timestamp: daysAgo(4), userInitials: "SY" },
      { id: "a_112", type: "email_sent", summary: "Sent \"Resource Share\"", timestamp: daysAgo(6), userInitials: "YA" },
      { id: "a_113", type: "linkedin", summary: "Followed on LinkedIn", timestamp: daysAgo(8), userInitials: "YA" },
      { id: "a_114", type: "email_sent", summary: "Sent \"Nice Meeting You\"", timestamp: daysAgo(10), userInitials: "YA" },
      { id: "a_115", type: "import", summary: "Imported from SaaStr Badge Scans", timestamp: daysAgo(11), userInitials: "SY" },
    ],
    customFields: [
      { label: "Met at", value: "SaaStr Annual 2025" },
      { label: "Annual Revenue", value: "$3.8B" },
    ],
    localTime: "11:35 AM",
  },
];

export const focusDataMap: Record<string, FunnelLeadFocusData> = Object.fromEntries(
  focusDataList.map((d) => [d.leadId, d])
);
