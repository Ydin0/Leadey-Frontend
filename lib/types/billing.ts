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
  /** True when the org must add a card + start a trial subscription before
   *  using the app (signup payment wall). Drives the /start-trial redirect. */
  needsPaymentSetup: boolean;
  /** Whether the wall offers a FREE trial. False for an additional workspace
   *  created by an existing member — they must pay immediately. */
  trialAllowed: boolean;
  /** Negotiated discount (0–100 %) applied to the seat subscription. */
  discountPct: number;
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

export interface LeadeyInvoiceLineItem {
  description: string;
  quantity: number;
  unit: string;
  amountMinor: number;
}

/** A Leadey-issued invoice (telephony usage, seats, or manual). Telephony
 *  invoices arrive with a single summary line — the detailed breakdown is
 *  internal. */
export interface LeadeyInvoice {
  id: string;
  number: string;
  type: string;
  status: string; // open | paid | void
  period: string | null;
  currency: string;
  lineItems: LeadeyInvoiceLineItem[];
  subtotalMinor: number;
  totalMinor: number;
  paymentUrl: string | null;
  issuedAt: string;
  dueAt: string | null;
  paidAt: string | null;
  orgName: string;
  billingName: string | null;
  billingEmail: string | null;
  billingAddress: string | null;
  billingVat: string | null;
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
