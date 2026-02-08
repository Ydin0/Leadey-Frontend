import type { ICP } from "../types/icp";

function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000);
}

export const mockICPs: ICP[] = [
  {
    id: "icp_001",
    name: "Mid-Market SaaS RevOps",
    status: "active",
    createdAt: daysAgo(14),
    companyProfile: {
      industries: ["SaaS", "DevTools", "FinTech"],
      companySizeMin: 200,
      companySizeMax: 1000,
      fundingStages: ["Series A", "Series B", "Series C"],
      geographies: ["United States", "Canada", "United Kingdom"],
      excludedDomains: ["competitor.com", "donotsell.io"],
    },
    personas: [
      {
        id: "p1",
        name: "Sales Leadership",
        departments: ["Sales"],
        seniorityLevels: ["VP", "Director"],
        titleKeywords: ["Head of Sales", "VP Sales"],
        excludeTitleKeywords: ["Assistant"],
      },
      {
        id: "p2",
        name: "RevOps",
        departments: ["RevOps", "Operations"],
        seniorityLevels: ["VP", "Director", "Manager"],
        titleKeywords: ["RevOps", "Revenue Operations"],
        excludeTitleKeywords: [],
      },
    ],
    signalPreferences: {
      enabledSignals: ["hiring", "funding", "tech_adoption", "intent", "job_change"],
      keywords: ["sales engagement", "outbound", "pipeline generation"],
      technologies: ["Salesforce", "HubSpot", "Outreach", "Gong"],
    },
    enrichmentRules: {
      globalBudget: 2000,
      companyRules: [
        {
          id: "rule1",
          name: "Large companies preview",
          condition: "Companies > 500 employees",
          conditionMin: 500,
          action: {
            mode: "preview",
            maxLeadsPerCompany: 20,
            onlyPersonas: true,
            prioritySeniority: ["VP", "Director"],
          },
        },
        {
          id: "rule2",
          name: "Mid-size auto-enrich",
          condition: "Companies 200-500 employees",
          conditionMin: 200,
          conditionMax: 500,
          action: {
            mode: "auto",
            maxLeadsPerCompany: 15,
            onlyPersonas: true,
            prioritySeniority: ["Director", "Manager"],
          },
        },
      ],
      defaultRule: {
        mode: "auto",
        maxLeadsPerCompany: 10,
        onlyPersonas: true,
        prioritySeniority: ["VP", "Director", "Manager"],
      },
      safetyThreshold: 80,
      notifyThreshold: 1000,
    },
    stats: {
      companiesFound: 247,
      companiesEnriched: 89,
      leadsFound: 1840,
      leadsEnriched: 412,
      creditsUsed: 760,
      creditsRemaining: 1240,
      scrapersActive: 3,
      emailsFired: 147,
      webhooksReceived: 34,
    },
  },
  {
    id: "icp_002",
    name: "Enterprise FinTech",
    status: "draft",
    createdAt: daysAgo(2),
    companyProfile: {
      industries: ["FinTech", "Banking", "Insurance"],
      companySizeMin: 1000,
      companySizeMax: 50000,
      fundingStages: ["Series C", "Series D+", "Public"],
      geographies: ["United States", "United Kingdom", "Germany"],
      excludedDomains: [],
    },
    personas: [
      {
        id: "p3",
        name: "C-Suite",
        departments: ["C-Suite"],
        seniorityLevels: ["C-Level"],
        titleKeywords: ["CEO", "CRO", "CTO"],
        excludeTitleKeywords: [],
      },
    ],
    signalPreferences: {
      enabledSignals: ["funding", "expansion", "news"],
      keywords: ["digital transformation", "fintech infrastructure"],
      technologies: ["Stripe", "Plaid", "Adyen"],
    },
    enrichmentRules: {
      globalBudget: 5000,
      companyRules: [],
      defaultRule: {
        mode: "manual",
        maxLeadsPerCompany: 5,
        onlyPersonas: true,
        prioritySeniority: ["C-Level", "VP"],
      },
      safetyThreshold: 70,
      notifyThreshold: 500,
    },
    stats: {
      companiesFound: 0,
      companiesEnriched: 0,
      leadsFound: 0,
      leadsEnriched: 0,
      creditsUsed: 0,
      creditsRemaining: 5000,
      scrapersActive: 0,
      emailsFired: 0,
      webhooksReceived: 0,
    },
  },
];
