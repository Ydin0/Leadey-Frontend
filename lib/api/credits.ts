import { apiRequest, apiRequestRaw } from "./client";

export interface CreditTransaction {
  id: string;
  kind: string;
  action: string;
  credits: number;
  quantity: number;
  unitCredits: number;
  balanceAfter: number;
  amountUsdCents: number | null;
  description: string | null;
  createdAt: string;
}

export interface CreditInfo {
  balance: number;
  centsPerCredit: number;
  costs: { phone: number; email: number; job: number };
  packs: { credits: number; usd: number }[];
  minTopup: number;
  usageThisMonth: {
    phoneEnrichment: { credits: number; quantity: number };
    emailEnrichment: { credits: number; quantity: number };
    jobScraping: { credits: number; quantity: number };
    totalSpent: number;
    totalAdded: number;
  };
  recent: CreditTransaction[];
}

export async function getCredits(): Promise<CreditInfo> {
  return apiRequest<CreditInfo>("/credits");
}

export async function getCreditTransactions(opts: {
  page?: number;
  pageSize?: number;
  action?: string;
}): Promise<{ data: CreditTransaction[]; meta: { page: number; pageSize: number; totalCount: number; totalPages: number } }> {
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.pageSize) params.set("pageSize", String(opts.pageSize));
  if (opts.action) params.set("action", opts.action);
  return apiRequestRaw(`/credits/transactions?${params}`);
}

export async function startCreditCheckout(credits: number): Promise<string> {
  const { url } = await apiRequest<{ url: string }>("/credits/checkout", {
    method: "POST",
    body: JSON.stringify({ credits }),
  });
  return url;
}

/** Convert a credit count to its USD value (credits are $0.01 each). */
export function creditsToUsd(credits: number, centsPerCredit = 1): string {
  return `$${((credits * centsPerCredit) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Telephony money wallet (customer-facing) ───────────────────────

export interface TelephonyCredits {
  balanceMinor: number;
  bufferPct: number;
  currency: string;
  /** This month's billed usage vs the org's monthly spending limit. */
  budget: {
    period: string;
    limitMinor: number | null;
    spentMinor: number;
    blocked: boolean;
  };
  autoTopup: {
    enabled: boolean;
    thresholdMinor: number;
    targetMinor: number;
    lastError: string | null;
  };
}

/** The org's telephony balance: calls/SMS/numbers draw it down daily; paid
 *  telephony invoices (usage + buffer %) or auto top-ups add to it. */
export async function getTelephonyCredits(): Promise<TelephonyCredits> {
  return apiRequest<TelephonyCredits>("/credits/telephony");
}

export interface TelephonySettingsResult {
  monthlyLimitMinor: number | null;
  autoTopup: { enabled: boolean; thresholdMinor: number; targetMinor: number };
  /** If auto top-up was enabled and the balance was below the threshold, the
   *  card was charged immediately — the outcome lands here. */
  immediateTopup: { charged: boolean; amountMinor?: number; error?: string };
}

export interface SavedPaymentMethod {
  kind: string; // "card" | "link" | ...
  brand: string;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  email: string | null;
}

/** The payment method a top-up would charge — shown on the confirmation
 *  dialog. Null when nothing is on file (top-up then goes via Checkout). */
export async function getTelephonyPaymentMethod(): Promise<SavedPaymentMethod | null> {
  const res = await apiRequest<{ paymentMethod: SavedPaymentMethod | null }>(
    "/credits/telephony/payment-method",
  );
  return res.paymentMethod;
}

/** One-off telephony top-up. With a saved card it charges immediately and
 *  settles open telephony invoices oldest-first; with no card on file the
 *  response carries a Stripe Checkout URL instead (paying there saves the
 *  card for future top-ups). */
export async function telephonyTopupNow(amountMinor: number): Promise<
  { balanceMinor: number; settledInvoices: string[] } | { checkoutUrl: string }
> {
  return apiRequest("/credits/telephony/topup", {
    method: "POST",
    body: JSON.stringify({ amountMinor }),
  });
}

export async function updateTelephonySettings(settings: {
  monthlyLimitMinor: number | null;
  autoTopupEnabled: boolean;
  autoTopupThresholdMinor: number;
  autoTopupTargetMinor: number;
}): Promise<TelephonySettingsResult> {
  return apiRequest<TelephonySettingsResult>("/credits/telephony/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}
