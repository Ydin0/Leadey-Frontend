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
