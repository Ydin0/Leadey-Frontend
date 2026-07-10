import { apiRequest } from "./client";
import type { BillingInfo, StripeInvoice, LeadeyInvoice } from "@/lib/types/billing";

export async function getBillingInfo(): Promise<BillingInfo> {
  return apiRequest<BillingInfo>("/billing");
}

export async function createCheckoutSession(
  priceId: string,
  seats?: number,
  urls?: { successUrl: string; cancelUrl: string },
): Promise<{ url: string }> {
  return apiRequest<{ url: string }>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ priceId, seats, ...urls }),
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

/** One Stripe subscription invoice, reshaped by the backend to the Leadey
 *  invoice-document format (rendered by InvoiceView). */
export async function getStripeInvoiceDetail(id: string): Promise<
  LeadeyInvoice & { periodLabel: string | null; amountPaidMinor: number }
> {
  return apiRequest(`/billing/invoices/${id}`);
}

/** Standalone Stripe payments (calling-credit top-ups + one-off charges). */
export interface StripePayment {
  id: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export async function getStripePayments(): Promise<StripePayment[]> {
  return apiRequest<StripePayment[]>("/billing/payments");
}

/** One Stripe payment reshaped to the Leadey invoice-document format. */
export async function getStripePaymentDetail(id: string): Promise<
  LeadeyInvoice & { periodLabel: string | null; amountPaidMinor: number }
> {
  return apiRequest(`/billing/payments/${id}`);
}

export async function getLeadeyInvoices(): Promise<LeadeyInvoice[]> {
  return apiRequest<LeadeyInvoice[]>("/billing/leadey-invoices");
}

export async function getLeadeyInvoice(id: string): Promise<LeadeyInvoice> {
  return apiRequest<LeadeyInvoice>(`/billing/leadey-invoices/${id}`);
}
