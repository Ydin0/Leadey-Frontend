import { apiRequest } from "./client";
import type { BillingInfo, StripeInvoice } from "@/lib/types/billing";

export async function getBillingInfo(): Promise<BillingInfo> {
  return apiRequest<BillingInfo>("/billing");
}

export async function createCheckoutSession(priceId: string, seats?: number): Promise<{ url: string }> {
  return apiRequest<{ url: string }>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ priceId, seats }),
  });
}

export async function createPortalSession(): Promise<{ url: string }> {
  return apiRequest<{ url: string }>("/billing/portal", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getInvoices(): Promise<StripeInvoice[]> {
  return apiRequest<StripeInvoice[]>("/billing/invoices");
}
