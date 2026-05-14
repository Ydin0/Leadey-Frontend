export type PlanName = "trial" | "starter" | "growth" | "scale" | "cancelled";
export type PlanStatus = "active" | "trialing" | "past_due" | "cancelled";

export interface BillingInfo {
  plan: PlanName;
  planName: string;
  planStatus: PlanStatus;
  trialEndsAt: string | null;
  trialDaysLeft: number;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  // Limits
  seatsIncluded: number;
  creditsIncluded: number;
  creditsUsed: number;
  enrichmentCredits: number;
  funnelsAllowed: number;
  phoneLinesAllowed: number;
  callRecording: boolean;
  aiSummaries: boolean;
  // Pricing
  prices: {
    starter: { priceId: string; amount: number };
    growth: { priceId: string; amount: number };
    scale: { priceId: string; amount: number };
  };
}

export interface StripeInvoice {
  id: string;
  number: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  invoiceUrl: string | null;
  invoicePdf: string | null;
  createdAt: string;
}
