import { apiRequest } from "./client";
import type { BillingInfo, StripeInvoice, LeadeyInvoice } from "@/lib/types/billing";

export async function getBillingInfo(): Promise<BillingInfo> {
  return apiRequest<BillingInfo>("/billing");
}

export async function createCheckoutSession(priceId: string, seats?: number): Promise<{ url: string }> {
  return apiRequest<{ url: string }>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ priceId, seats }),
  });
}

export async function addSubscriptionSeats(seats: number): Promise<{ seats: number }> {
  return apiRequest<{ seats: number }>("/billing/add-seats", {
    method: "POST",
    body: JSON.stringify({ seats }),
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

export async function getLeadeyInvoices(): Promise<LeadeyInvoice[]> {
  return apiRequest<LeadeyInvoice[]>("/billing/leadey-invoices");
}

export async function getLeadeyInvoice(id: string): Promise<LeadeyInvoice> {
  return apiRequest<LeadeyInvoice>(`/billing/leadey-invoices/${id}`);
}
