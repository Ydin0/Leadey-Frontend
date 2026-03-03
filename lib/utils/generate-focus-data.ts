import type { FunnelLead } from "../types/funnel";
import type {
  FunnelLeadFocusData,
  FunnelLeadContact,
  FunnelLeadActivity,
  FunnelLeadCustomField,
  FunnelLeadCompany,
} from "../types/funnel-focus";

/**
 * Extract the domain from an email address. Falls back to companyDomain if set.
 */
function getDomain(lead: FunnelLead): string {
  if (lead.companyDomain) return lead.companyDomain;
  const at = lead.email.indexOf("@");
  if (at > 0) return lead.email.slice(at + 1);
  return "";
}

/**
 * Simple deterministic hash from a string — used for seeded pseudo-randomness.
 */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const INDUSTRIES = [
  "Technology", "SaaS", "FinTech", "Recruitment", "Consulting",
  "Digital Media", "Healthcare Tech", "Cybersecurity", "AI / ML",
  "Professional Services", "E-Commerce", "HR Tech", "Marketing Tech",
  "Data Analytics", "Cloud Infrastructure",
];

const CITIES = [
  "London, UK", "Manchester, UK", "Bristol, UK", "Edinburgh, UK",
  "Birmingham, UK", "Leeds, UK", "Cambridge, UK", "Reading, UK",
  "San Francisco, CA", "New York, NY", "Berlin, Germany", "Amsterdam, Netherlands",
];

const TITLES = [
  "Head of Engineering", "Sales Manager", "Marketing Director",
  "Product Lead", "VP of Operations", "Business Development Manager",
  "Chief of Staff", "Account Executive", "Head of People",
  "CTO", "Engineering Manager", "Growth Lead",
];

const FIRST_NAMES = [
  "Alex", "Jordan", "Sam", "Morgan", "Taylor", "Casey",
  "Robin", "Jamie", "Chris", "Drew", "Max", "Riley",
  "Emma", "Liam", "Sophie", "Daniel", "Charlotte", "Oliver",
  "Amelia", "Noah", "Isla", "Harry", "Ava", "George",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia",
  "Miller", "Davis", "Rodriguez", "Martinez", "Anderson", "Taylor",
  "Thomas", "Jackson", "White", "Harris", "Martin", "Clark",
  "Lee", "Walker", "Hall", "Allen", "Young", "King",
];

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000);
}

function pickFrom<T>(arr: T[], seed: number, offset = 0): T {
  return arr[(seed + offset) % arr.length];
}

function generateCompany(lead: FunnelLead, domain: string): FunnelLeadCompany {
  const h = hash(lead.company);
  const employeeBrackets = [15, 35, 80, 150, 300, 500, 800, 1200, 2500, 5000];
  return {
    name: lead.company,
    domain,
    website: domain ? `https://${domain}` : null,
    address: pickFrom(CITIES, h),
    description: `${lead.company} is a ${pickFrom(INDUSTRIES, h).toLowerCase()} company specialising in innovative solutions for modern businesses. They work with enterprise clients across multiple sectors.`,
    industry: pickFrom(INDUSTRIES, h),
    employeeCount: pickFrom(employeeBrackets, h, 3),
    linkedinUrl: domain ? `https://linkedin.com/company/${domain.split(".")[0]}` : null,
  };
}

function generateContacts(lead: FunnelLead, domain: string): FunnelLeadContact[] {
  const h = hash(lead.id);
  const contacts: FunnelLeadContact[] = [];

  // Primary contact is always the lead itself
  contacts.push({
    id: `gc_${lead.id}_0`,
    name: lead.name,
    title: lead.title,
    email: lead.email,
    phone: lead.phone ?? null,
    linkedinUrl: lead.linkedinUrl ?? `https://linkedin.com/in/${lead.name.toLowerCase().replace(/\s+/g, "")}`,
    isPrimary: true,
  });

  // Add 1-2 extra contacts seeded from the lead ID
  const extraCount = (h % 3); // 0, 1, or 2 extra contacts
  for (let i = 0; i < extraCount; i++) {
    const firstName = pickFrom(FIRST_NAMES, h, i * 7 + 1);
    const lastName = pickFrom(LAST_NAMES, h, i * 5 + 2);
    const fullName = `${firstName} ${lastName}`;
    const emailUser = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    const title = pickFrom(TITLES, h, i * 3 + 4);
    const hasPhone = (h + i) % 3 !== 0;
    const phoneNum = hasPhone
      ? `+44 ${7700 + ((h + i * 13) % 300)} ${100000 + ((h + i * 17) % 900000)}`
      : null;

    contacts.push({
      id: `gc_${lead.id}_${i + 1}`,
      name: fullName,
      title,
      email: domain ? `${emailUser}@${domain}` : null,
      phone: phoneNum,
      linkedinUrl: (h + i) % 2 === 0 ? `https://linkedin.com/in/${emailUser}` : null,
      isPrimary: false,
    });
  }

  return contacts;
}

function generateActivities(lead: FunnelLead): FunnelLeadActivity[] {
  const h = hash(lead.id);
  const activities: FunnelLeadActivity[] = [];
  let idCounter = 0;

  const initials = ["YA", "AM", "SY", "JW"];
  const userInit = pickFrom(initials, h);

  // Build a realistic timeline based on current step and status
  const { currentStep, status } = lead;

  // Most recent activity based on status
  if (status === "interested") {
    activities.push({
      id: `ga_${lead.id}_${idCounter++}`,
      type: "email_sent",
      summary: `Replied with interest`,
      detail: `"Would love to learn more. Can we set up a call?"`,
      timestamp: hoursAgo(2 + (h % 8)),
      userInitials: lead.name.split(" ").map(n => n[0]).join("").slice(0, 2),
    });
  } else if (status === "no_answer") {
    activities.push({
      id: `ga_${lead.id}_${idCounter++}`,
      type: "call",
      summary: "Called — no answer",
      detail: "Rang 5 times, went to voicemail. Left message.",
      timestamp: hoursAgo(3 + (h % 6)),
      userInitials: userInit,
    });
  } else if (status === "callback") {
    activities.push({
      id: `ga_${lead.id}_${idCounter++}`,
      type: "note",
      summary: "Callback requested",
      detail: `"Call back after ${pickFrom(["Monday", "next week", "the board meeting", "Q2 planning"], h)}"`,
      timestamp: hoursAgo(4 + (h % 10)),
      userInitials: userInit,
    });
  } else if (status === "bounced") {
    activities.push({
      id: `ga_${lead.id}_${idCounter++}`,
      type: "status_change",
      summary: "Email bounced",
      detail: "550 5.1.1 User unknown",
      timestamp: daysAgo(1),
      userInitials: "SY",
    });
  } else if (status === "completed" || status === "qualified") {
    activities.push({
      id: `ga_${lead.id}_${idCounter++}`,
      type: "status_change",
      summary: `Status changed to ${status === "completed" ? "Completed" : "Qualified"}`,
      timestamp: hoursAgo(6 + (h % 24)),
      userInitials: userInit,
    });
  }

  // Email opened
  if (currentStep >= 2 && status !== "new") {
    activities.push({
      id: `ga_${lead.id}_${idCounter++}`,
      type: "email_opened",
      summary: `Opened "${pickFrom(["Intro Email", "Follow-up", "Value Proposition", "Quick question"], h, 1)}"`,
      timestamp: daysAgo(1 + (h % 3)),
      userInitials: userInit,
    });
  }

  // Call if step >= 3
  if (currentStep >= 3) {
    const duration = 4 + (h % 15);
    activities.push({
      id: `ga_${lead.id}_${idCounter++}`,
      type: "call",
      summary: `Discovery call — ${duration} min`,
      detail: pickFrom([
        "Discussed pain points with current outbound tools",
        "Good conversation, exploring budget timeline",
        "Walked through product demo, asked strong questions",
        "Brief call, requested follow-up materials",
      ], h, 2),
      timestamp: daysAgo(2 + (h % 4)),
      userInitials: userInit,
    });
  }

  // LinkedIn activity
  if (currentStep >= 2) {
    activities.push({
      id: `ga_${lead.id}_${idCounter++}`,
      type: "linkedin",
      summary: pickFrom([
        "Accepted connection request",
        "Sent connection request",
        "Viewed profile",
        "Connected on LinkedIn",
      ], h, 3),
      timestamp: daysAgo(3 + (h % 5)),
      userInitials: userInit,
    });
  }

  // Email sent
  activities.push({
    id: `ga_${lead.id}_${idCounter++}`,
    type: "email_sent",
    summary: `Sent "${pickFrom(["Intro Email", "First Touch", "Introduction", "Warm Intro"], h, 4)}"`,
    detail: `Subject: ${pickFrom([
      `Quick question about ${lead.company}'s growth`,
      `${lead.company} + signal-driven outreach`,
      `Helping ${lead.company} scale outbound`,
      `Ideas for ${lead.company}'s sales team`,
    ], h, 5)}`,
    timestamp: daysAgo(4 + (h % 7)),
    userInitials: userInit,
  });

  // Follow-up email if step > 1
  if (currentStep > 1) {
    activities.push({
      id: `ga_${lead.id}_${idCounter++}`,
      type: "email_sent",
      summary: `Sent "Follow-up"`,
      detail: `Subject: Re: ${lead.company} outbound`,
      timestamp: daysAgo(6 + (h % 5)),
      userInitials: userInit,
    });
  }

  // Import event (always)
  activities.push({
    id: `ga_${lead.id}_${idCounter++}`,
    type: "import",
    summary: `Imported from ${lead.source || "CSV Upload"}`,
    timestamp: daysAgo(8 + (h % 14)),
    userInitials: "SY",
  });

  return activities;
}

function generateCustomFields(lead: FunnelLead, domain: string): FunnelLeadCustomField[] {
  const h = hash(lead.id);
  const fields: FunnelLeadCustomField[] = [];

  if (domain) {
    fields.push({
      label: "Company LinkedIn",
      value: `https://linkedin.com/company/${domain.split(".")[0]}`,
      isLink: true,
    });
  }

  if (lead.source) {
    fields.push({ label: "Lead Source", value: lead.source });
  }

  // Add a few more fields based on hash
  const extras: FunnelLeadCustomField[][] = [
    [{ label: "Funding Stage", value: pickFrom(["Seed", "Series A", "Series B", "Series C", "Series D", "Growth", "Public"], h) }],
    [{ label: "Annual Revenue", value: pickFrom(["$1M-5M", "$5M-20M", "$20M-50M", "$50M-100M", "$100M+"], h, 1) }],
    [{ label: "Tech Stack", value: pickFrom(["React, Node.js, AWS", "Python, Django, GCP", ".NET, Azure", "Ruby on Rails, Heroku", "Next.js, Vercel"], h, 2) }],
    [{ label: "Decision Timeline", value: pickFrom(["Q1 2026", "Q2 2026", "H2 2026", "Evaluating now"], h, 3) }],
  ];

  // Pick 1-2 extra fields
  const numExtras = 1 + (h % 2);
  for (let i = 0; i < numExtras; i++) {
    fields.push(...pickFrom(extras, h, i + 7));
  }

  return fields;
}

/**
 * Generate focus view data for any FunnelLead — used when no manually-curated
 * entry exists in focusDataMap. Creates realistic contacts, activities,
 * company info, and custom fields from the lead's existing properties.
 */
export function generateFocusData(lead: FunnelLead): FunnelLeadFocusData {
  const domain = getDomain(lead);
  const h = hash(lead.id);

  // Generate a plausible local time
  const hours = [9, 10, 11, 14, 15, 16, 17];
  const mins = [0, 5, 15, 20, 30, 35, 45, 50];
  const hour = pickFrom(hours, h);
  const min = pickFrom(mins, h, 2);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour;
  const localTime = `${displayHour}:${String(min).padStart(2, "0")} ${ampm}`;

  return {
    leadId: lead.id,
    company: generateCompany(lead, domain),
    contacts: generateContacts(lead, domain),
    activities: generateActivities(lead),
    customFields: generateCustomFields(lead, domain),
    localTime,
  };
}
