export type OpportunityStage =
  | "no_show"
  | "demo_booked"
  | "demo_completed"
  | "negotiating"
  | "contract_sent"
  | "won"
  | "lost";

export type OpportunityPriority = "high" | "medium" | "low";

export interface OpportunityStageInfo {
  value: OpportunityStage;
  label: string;
  colorToken: string;
  defaultProbability: number;
}

export const OPPORTUNITY_STAGES: OpportunityStageInfo[] = [
  { value: "demo_booked", label: "Demo Booked", colorToken: "signal-blue", defaultProbability: 20 },
  { value: "no_show", label: "No Show", colorToken: "signal-slate", defaultProbability: 5 },
  { value: "demo_completed", label: "Demo Completed", colorToken: "signal-blue", defaultProbability: 40 },
  { value: "negotiating", label: "Negotiating", colorToken: "signal-blue", defaultProbability: 60 },
  { value: "contract_sent", label: "Contract Sent", colorToken: "signal-green", defaultProbability: 80 },
  { value: "won", label: "Won", colorToken: "signal-green", defaultProbability: 100 },
  { value: "lost", label: "Lost", colorToken: "signal-red", defaultProbability: 0 },
];

export interface Opportunity {
  id: string;
  companyName: string;
  companyDomain: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  stage: OpportunityStage;
  value: number;
  annualValue: number;
  probability: number;
  ownerId: string;
  closeDate: Date;
  priority: OpportunityPriority;
  sourceFunnelId?: string;
  sourceLeadId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
