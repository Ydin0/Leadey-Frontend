"use client";

import { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Check, Minus, Plus, CreditCard, CalendarClock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getBillingInfo, createCheckoutSession, getInvoices, getLeadeyInvoices, getStripePayments, addSubscriptionSeats, type StripePayment } from "@/lib/api/billing";
import { apiRequest } from "@/lib/api/client";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import type { BillingInfo, StripeInvoice, LeadeyInvoice } from "@/lib/types/billing";

const PLAN_DETAILS: Record<string, { minSeats: number; description: string; features: string[] }> = {
  starter: {
    minSeats: 1,
    description: "For solo reps or founders doing their own outbound",
    features: [
      "200 leads scraped/mo",
      "200 contact enrichments/mo",
      "Email sequences (1 sender)",
      "LinkedIn templates",
      "3 funnels",
      "CSV export",
    ],
  },
  growth: {
    minSeats: 1,
    description: "Full multi-channel outreach with calling, email, and LinkedIn",
    features: [
      "1,000 leads scraped/mo",
      "1,000 enrichments/mo",
      "Email sequences (3 senders)",
      "LinkedIn templates",
      "Built-in dialer (200 mins)",
      "Multi-channel funnels",
      "Call recording & logging",
      "10 funnels",
    ],
  },
  scale: {
    minSeats: 3,
    description: "For sales teams running outbound at volume",
    features: [
      "3,000 leads/seat/mo",
      "3,000 enrichments/seat/mo",
      "Unlimited sender accounts",
      "Built-in dialer (500 mins)",
      "Multi-channel funnels",
      "Call recording & analytics",
      "A/B testing",
      "Unlimited funnels",
      "API access",
      "Priority support",
    ],
  },
};

const planStatusLabel: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-signal-green text-signal-green-text" },
  trialing: { label: "Trial", className: "bg-signal-blue text-signal-blue-text" },
  past_due: { label: "Past due", className: "bg-signal-red text-signal-red-text" },
  cancelled: { label: "Cancelled", className: "bg-signal-slate text-signal-slate-text" },
};

const SECTION_LABEL = "text-[10px] uppercase tracking-wider text-ink-muted font-medium";

function StepperButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 flex items-center justify-center rounded-full border border-border-subtle text-ink-muted hover:bg-hover hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

export function BillingSection() {
  const isAuthReady = useAuthReady();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [invoices, setInvoices] = useState<StripeInvoice[]>([]);
  const [payments, setPayments] = useState<StripePayment[]>([]);
  const [leadeyInvoices, setLeadeyInvoices] = useState<LeadeyInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelFeedback, setCancelFeedback] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelSubmitted, setCancelSubmitted] = useState(false);
  const [showAddSeats, setShowAddSeats] = useState(false);
  const [additionalSeats, setAdditionalSeats] = useState(1);

  // Each dataset loads independently — a failing Stripe invoice fetch must
  // never blank the whole tab.
  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    getBillingInfo()
      .then((b) => {
        setBilling(b);
        // Default the plan pickers to the org's assigned seat count — a
        // subscription's quantity REPLACES the admin-granted seats, so the
        // company must subscribe with at least what they're using.
        if (b.seatsIncluded > 1) {
          setSeatCounts((prev) => {
            const next = { ...prev };
            for (const key of Object.keys(next)) {
              next[key] = Math.max(b.seatsIncluded, PLAN_DETAILS[key]?.minSeats || 1);
            }
            return next;
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load billing:", err);
        setLoadError(err instanceof Error ? err.message : "Failed to load billing");
      })
      .finally(() => setLoading(false));
    getInvoices()
      .then(setInvoices)
      .catch((err) => console.error("Failed to load Stripe invoices:", err));
    getStripePayments()
      .then(setPayments)
      .catch((err) => console.error("Failed to load Stripe payments:", err));
    getLeadeyInvoices()
      .then(setLeadeyInvoices)
      .catch((err) => console.error("Failed to load Leadey invoices:", err));
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    load();
  }, [isAuthReady, load]);

  // Seat selection per plan (for the plan-picker cards)
  const [seatCounts, setSeatCounts] = useState<Record<string, number>>({
    starter: 1,
    growth: 1,
    scale: 3,
  });

  function adjustSeats(planKey: string, delta: number) {
    setSeatCounts((prev) => {
      const min = PLAN_DETAILS[planKey]?.minSeats || 1;
      const current = prev[planKey] || min;
      return { ...prev, [planKey]: Math.max(min, current + delta) };
    });
  }

  async function handleCheckout(planKey: string) {
    if (!billing) return;
    const priceId = billing.prices[planKey as keyof typeof billing.prices]?.priceId;
    if (!priceId) return;

    setCheckoutLoading(planKey);
    try {
      const seats = seatCounts[planKey] || 1;
      // Explicit return URLs — the backend default derives from CORS_ORIGIN,
      // which can point at the wrong domain.
      const { url } = await createCheckoutSession(priceId, seats, {
        successUrl: `${window.location.origin}/dashboard/settings/billing-success`,
        cancelUrl: `${window.location.origin}/dashboard/settings?tab=billing`,
      });
      window.location.href = url;
    } catch (err) {
      console.error("Checkout failed:", err);
      setCheckoutLoading(null);
    }
  }

  const [addSeatsNotice, setAddSeatsNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  // Bumps the existing subscription's quantity — never a second checkout.
  async function handleAddSeats() {
    if (!billing) return;
    setCheckoutLoading("add-seats");
    setAddSeatsNotice(null);
    try {
      const res = await addSubscriptionSeats(additionalSeats);
      setBilling((prev) => (prev ? { ...prev, seatsIncluded: res.seats } : prev));
      setShowAddSeats(false);
      setAdditionalSeats(1);
      setAddSeatsNotice({ tone: "ok", text: `Seats updated to ${res.seats} — the prorated difference is charged to your card now.` });
    } catch (err) {
      setAddSeatsNotice({ tone: "err", text: err instanceof Error ? err.message : "Failed to add seats" });
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handleCancelRequest() {
    setCancelSubmitting(true);
    try {
      // Sends a request to the team — doesn't cancel on the spot.
      await apiRequest("/billing/cancel-request", {
        method: "POST",
        body: JSON.stringify({ reason: cancelReason, feedback: cancelFeedback }),
      });
      setCancelSubmitted(true);
    } catch (err) {
      console.error("Cancel request failed:", err);
    } finally {
      setCancelSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  if (!billing) {
    return (
      <div className="rounded-[14px] border border-border-subtle bg-surface p-8 text-center max-w-4xl">
        <p className="text-[13px] font-medium text-ink mb-1">Couldn&apos;t load billing</p>
        <p className="text-[12px] text-ink-muted mb-4">{loadError || "Something went wrong fetching your plan."}</p>
        <button
          onClick={load}
          className="px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11.5px] font-medium hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
    );
  }

  const status = planStatusLabel[billing.planStatus] || planStatusLabel.active;
  const isTrial = billing.plan === "trial";
  const hasSubscription = !!billing.stripeSubscriptionId;
  const currentPrice = billing.prices[billing.plan as keyof typeof billing.prices];
  const discountPct = billing.discountPct ?? 0;
  // Display-only math — Stripe's coupon does the authoritative discounting.
  const applyDiscount = (amount: number) => (amount * (100 - discountPct)) / 100;
  const perSeat = currentPrice ? currentPrice.amount / 100 : 0;
  const monthlyTotal = perSeat * billing.seatsIncluded;
  const monthlyTotalDiscounted = applyDiscount(monthlyTotal);
  const gbp = (n: number) =>
    `£${n.toLocaleString(undefined, { maximumFractionDigits: Number.isInteger(n) ? 0 : 2 })}`;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* ── Current plan ── */}
      <div className="rounded-[14px] border border-border-subtle bg-surface overflow-hidden">
        <div className="p-6 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className={cn("flex items-center gap-2 mb-2", SECTION_LABEL)}>
              <CreditCard size={12} className="text-accent" /> Current plan
              <span className={cn("text-[9px] uppercase tracking-wide font-semibold rounded-full px-2 py-0.5", status.className)}>
                {status.label}
              </span>
              {discountPct > 0 && (
                <span className="text-[9px] uppercase tracking-wide font-semibold rounded-full px-2 py-0.5 bg-signal-green text-signal-green-text">
                  {discountPct}% discount
                </span>
              )}
            </div>
            <div className="text-[26px] font-semibold text-ink leading-none">{billing.planName}</div>
            <p className="text-[12px] text-ink-muted mt-2 max-w-[380px]">
              {isTrial
                ? billing.trialDaysLeft > 0
                  ? `${billing.trialDaysLeft} day${billing.trialDaysLeft === 1 ? "" : "s"} left in your free trial — pick a plan below to keep everything running.`
                  : "Your trial has expired — pick a plan below to keep everything running."
                : PLAN_DETAILS[billing.plan]?.description ?? ""}
            </p>
          </div>

          {hasSubscription && currentPrice && (
            <div className="text-right">
              <div className="text-[26px] font-semibold text-ink tabular-nums leading-none">
                {discountPct > 0 && (
                  <span className="text-[15px] font-normal text-ink-faint line-through mr-2">
                    {gbp(monthlyTotal)}
                  </span>
                )}
                {gbp(monthlyTotalDiscounted)}
                <span className="text-[13px] font-normal text-ink-muted">/mo</span>
              </div>
              <p className="text-[11.5px] text-ink-muted mt-2 tabular-nums">
                {billing.seatsIncluded} seat{billing.seatsIncluded === 1 ? "" : "s"} × £{perSeat.toLocaleString()}
                {discountPct > 0 && ` − ${discountPct}%`}
              </p>
              {billing.currentPeriodEnd && (
                <p className="text-[11.5px] text-ink-faint mt-1 flex items-center justify-end gap-1.5">
                  <CalendarClock size={12} />
                  Renews {new Date(billing.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Plan allowance cells */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-border-subtle divide-x divide-border-subtle">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-ink-faint font-medium">Seats</span>
              {hasSubscription && (
                <button
                  onClick={() => setShowAddSeats((v) => !v)}
                  className="text-[10.5px] font-medium text-accent hover:opacity-80 transition-opacity"
                >
                  + Add
                </button>
              )}
            </div>
            <p className="text-[17px] font-semibold text-ink tabular-nums mt-1">{billing.seatsIncluded}</p>
          </div>
          <div className="px-5 py-4">
            <span className="text-[10px] uppercase tracking-wider text-ink-faint font-medium">Funnels</span>
            <p className="text-[17px] font-semibold text-ink tabular-nums mt-1">
              {billing.funnelsAllowed === -1 ? "Unlimited" : billing.funnelsAllowed}
            </p>
          </div>
          <div className="px-5 py-4">
            <span className="text-[10px] uppercase tracking-wider text-ink-faint font-medium">Phone lines</span>
            <p className="text-[17px] font-semibold text-ink tabular-nums mt-1">{billing.phoneLinesAllowed}</p>
          </div>
          <div className="px-5 py-4">
            <span className="text-[10px] uppercase tracking-wider text-ink-faint font-medium">Enrichments</span>
            <p className="text-[17px] font-semibold text-ink tabular-nums mt-1">
              {billing.enrichmentCredits.toLocaleString()}
              <span className="text-[11px] font-normal text-ink-muted">/mo</span>
            </p>
          </div>
        </div>

        {/* Inline add-seats panel */}
        {showAddSeats && hasSubscription && (
          <div className="border-t border-border-subtle bg-section/40 px-6 py-4 flex items-center gap-5 flex-wrap">
            <div className="flex items-center gap-2.5">
              <StepperButton onClick={() => setAdditionalSeats(Math.max(1, additionalSeats - 1))} disabled={additionalSeats <= 1}>
                <Minus size={12} />
              </StepperButton>
              <span className="text-[15px] font-semibold text-ink w-7 text-center tabular-nums">{additionalSeats}</span>
              <StepperButton onClick={() => setAdditionalSeats(additionalSeats + 1)}>
                <Plus size={12} />
              </StepperButton>
              <span className="text-[12px] text-ink-secondary">extra seat{additionalSeats === 1 ? "" : "s"}</span>
            </div>
            <span className="text-[12px] text-ink-muted tabular-nums">
              +{gbp(applyDiscount(perSeat * additionalSeats))}/mo
              {discountPct > 0 && ` (${discountPct}% off)`}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setShowAddSeats(false)}
                className="px-3.5 py-1.5 rounded-[20px] text-[11px] font-medium text-ink-muted hover:bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleAddSeats()}
                disabled={!!checkoutLoading}
                className="px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {checkoutLoading === "add-seats" ? <Loader2 size={12} className="animate-spin" /> : "Confirm & pay"}
              </button>
            </div>
          </div>
        )}

        {addSeatsNotice && (
          <div
            className={cn(
              "border-t border-border-subtle px-6 py-2.5 text-[11.5px]",
              addSeatsNotice.tone === "err" ? "text-signal-red-text font-medium" : "text-signal-green-text",
            )}
          >
            {addSeatsNotice.text}
          </div>
        )}

        {hasSubscription && (
          <div className="border-t border-border-subtle px-6 py-3 flex items-center justify-end">
            <button
              onClick={() => setShowCancelModal(true)}
              className="text-[11px] text-ink-faint hover:text-signal-red-text transition-colors"
            >
              Cancel subscription
            </button>
          </div>
        )}
      </div>

      {/* ── Plan picker (trial / no subscription) ── */}
      {(isTrial || !hasSubscription) && (
        <div>
          <div className="mb-3">
            <h3 className="text-[14px] font-semibold text-ink">Choose a plan</h3>
            <p className="text-[11.5px] text-ink-muted mt-0.5">
              Per-seat pricing, billed monthly. Cancel any time.
              {discountPct > 0 && (
                <span className="text-signal-green-text font-medium"> Your {discountPct}% discount is applied at checkout.</span>
              )}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["starter", "growth", "scale"] as const).map((planKey) => {
              const price = billing.prices[planKey];
              const details = PLAN_DETAILS[planKey];
              const isCurrentPlan = billing.plan === planKey;
              const isPopular = planKey === "growth";
              const seats = seatCounts[planKey] || details?.minSeats || 1;
              const perSeatPrice = price.amount / 100;
              const perSeatDiscounted = applyDiscount(perSeatPrice);
              const totalPrice = applyDiscount(perSeatPrice * seats);

              return (
                <div
                  key={planKey}
                  className={cn(
                    "rounded-[14px] border bg-surface flex flex-col overflow-hidden",
                    isPopular ? "border-accent" : "border-border-subtle",
                  )}
                >
                  {isPopular ? (
                    <div className="bg-accent/10 text-accent text-[9.5px] font-semibold uppercase tracking-wider text-center py-1.5">
                      Most popular
                    </div>
                  ) : (
                    <div className="py-1.5 text-[9.5px]">&nbsp;</div>
                  )}
                  <div className="p-5 pt-3 flex flex-col flex-1">
                    <h4 className="text-[14px] font-semibold text-ink capitalize">{planKey}</h4>
                    <p className="text-[11px] text-ink-muted mt-0.5 min-h-[30px]">{details?.description}</p>

                    <div className="mt-3 mb-4">
                      {discountPct > 0 && (
                        <span className="text-[16px] font-normal text-ink-faint line-through mr-2 tabular-nums">
                          £{perSeatPrice.toFixed(0)}
                        </span>
                      )}
                      <span className="text-[28px] font-semibold text-ink tabular-nums">
                        {gbp(perSeatDiscounted)}
                      </span>
                      <span className="text-[11.5px] text-ink-muted"> /seat per month</span>
                    </div>

                    {/* Seat selector */}
                    <div className="flex items-center justify-between rounded-[10px] border border-border-subtle bg-section/40 px-3 py-2 mb-4">
                      <div className="flex items-center gap-2">
                        <StepperButton onClick={() => adjustSeats(planKey, -1)} disabled={seats <= (details?.minSeats || 1)}>
                          <Minus size={11} />
                        </StepperButton>
                        <span className="text-[13px] font-semibold text-ink w-6 text-center tabular-nums">{seats}</span>
                        <StepperButton onClick={() => adjustSeats(planKey, 1)}>
                          <Plus size={11} />
                        </StepperButton>
                        <span className="text-[11px] text-ink-muted">seat{seats === 1 ? "" : "s"}</span>
                      </div>
                      <span className="text-[12px] font-medium text-ink tabular-nums">{gbp(totalPrice)}/mo</span>
                    </div>

                    <ul className="space-y-1.5 mb-5 flex-1">
                      {details?.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-[11px] text-ink-secondary">
                          <Check size={11} className="text-signal-green-text shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleCheckout(planKey)}
                      // A plan assigned without a Stripe subscription still
                      // needs paying for — only a live subscription disables.
                      disabled={(isCurrentPlan && hasSubscription) || !!checkoutLoading}
                      className={cn(
                        "w-full py-2.5 rounded-[20px] text-[11.5px] font-medium transition-opacity",
                        isCurrentPlan && hasSubscription
                          ? "bg-section text-ink-faint cursor-not-allowed"
                          : isPopular
                            ? "bg-accent text-white hover:opacity-90"
                            : "bg-ink text-on-ink hover:opacity-90",
                      )}
                    >
                      {checkoutLoading === planKey ? (
                        <Loader2 size={12} className="animate-spin mx-auto" />
                      ) : isCurrentPlan && hasSubscription ? (
                        "Current plan"
                      ) : (
                        "Subscribe"
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Leadey invoices (telephony + seats) ── */}
      {leadeyInvoices.length > 0 && (
        <div className="rounded-[14px] border border-border-subtle bg-surface overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border-subtle">
            <h3 className="text-[13px] font-semibold text-ink">Invoices</h3>
            <p className="text-[11px] text-ink-muted mt-0.5">Telephony usage and seat invoices issued by Leadey.</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border-subtle bg-section/50 hover:bg-section/50">
                <TableHead className="text-left w-[30%]">Invoice</TableHead>
                <TableHead className="text-left">Type</TableHead>
                <TableHead className="text-left">Period</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right w-[16%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leadeyInvoices.map((inv) => {
                const money = new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: inv.currency.toUpperCase(),
                }).format(inv.totalMinor / 100);
                return (
                  <TableRow key={inv.id} className="hover:bg-hover/40">
                    <TableCell>
                      <span className="text-[12px] font-medium text-ink">{inv.number}</span>
                      <span className="text-[10.5px] text-ink-faint ml-2">
                        {new Date(inv.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[11.5px] text-ink-secondary capitalize">{inv.type}</span>
                    </TableCell>
                    <TableCell className="text-[11.5px] text-ink-secondary tabular-nums">{inv.period || "—"}</TableCell>
                    <TableCell className="text-right text-[12px] font-semibold text-ink tabular-nums">{money}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "text-[10px] font-medium rounded-full px-2 py-0.5 capitalize",
                          inv.status === "paid"
                            ? "bg-signal-green text-signal-green-text"
                            : inv.status === "void"
                              ? "bg-signal-slate text-signal-slate-text"
                              : "bg-signal-blue text-signal-blue-text",
                        )}
                      >
                        {inv.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {inv.status === "open" && inv.paymentUrl && (
                          <a
                            href={inv.paymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-[16px] bg-ink text-on-ink text-[10.5px] font-medium hover:opacity-90 transition-opacity"
                          >
                            <CreditCard size={11} /> Pay
                          </a>
                        )}
                        <Link
                          href={`/dashboard/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-[16px] border border-border-subtle text-[10.5px] font-medium text-ink-secondary hover:bg-hover transition-colors"
                        >
                          <FileText size={11} /> View
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Subscription payments (Stripe) ── */}
      {invoices.length > 0 && (
        <div className="rounded-[14px] border border-border-subtle bg-surface overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border-subtle">
            <h3 className="text-[13px] font-semibold text-ink">Subscription payments</h3>
            <p className="text-[11px] text-ink-muted mt-0.5">Plan charges billed through Stripe.</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border-subtle bg-section/50 hover:bg-section/50">
                <TableHead className="text-left">Invoice</TableHead>
                <TableHead className="text-left">Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right w-[15%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-hover/40">
                  <TableCell>
                    <span className="text-[12px] font-medium text-ink">{inv.number || "—"}</span>
                  </TableCell>
                  <TableCell className="text-[11.5px] text-ink-secondary">
                    {inv.createdAt
                      ? new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right text-[12px] font-semibold text-ink tabular-nums">
                    £{((inv.amountPaid || inv.amountDue) / 100).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={cn(
                        "text-[10px] font-medium rounded-full px-2 py-0.5 capitalize",
                        inv.status === "paid"
                          ? "bg-signal-green text-signal-green-text"
                          : "bg-signal-slate text-signal-slate-text",
                      )}
                    >
                      {inv.status || "pending"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/dashboard/invoices/stripe/${inv.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-[16px] border border-border-subtle text-[10.5px] font-medium text-ink-secondary hover:bg-hover transition-colors"
                    >
                      <FileText size={11} /> View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Top-ups & one-off payments (Stripe PaymentIntents) ── */}
      {payments.length > 0 && (
        <div className="rounded-[14px] border border-border-subtle bg-surface overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border-subtle">
            <h3 className="text-[13px] font-semibold text-ink">Top-ups &amp; payments</h3>
            <p className="text-[11px] text-ink-muted mt-0.5">Calling-credit top-ups and one-off charges via Stripe.</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border-subtle bg-section/50 hover:bg-section/50">
                <TableHead className="text-left">Description</TableHead>
                <TableHead className="text-left">Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right w-[15%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id} className="hover:bg-hover/40">
                  <TableCell className="text-[12px] font-medium text-ink truncate">{p.description}</TableCell>
                  <TableCell className="text-[11.5px] text-ink-secondary">
                    {new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </TableCell>
                  <TableCell className="text-right text-[12px] font-semibold text-ink tabular-nums">
                    {new Intl.NumberFormat(undefined, { style: "currency", currency: p.currency.toUpperCase() }).format(p.amount / 100)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cn(
                      "text-[10px] font-medium rounded-full px-2 py-0.5 capitalize",
                      p.status === "succeeded" ? "bg-signal-green text-signal-green-text" : "bg-signal-slate text-signal-slate-text",
                    )}>
                      {p.status === "succeeded" ? "paid" : p.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/dashboard/invoices/payment/${p.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-[16px] border border-border-subtle text-[10.5px] font-medium text-ink-secondary hover:bg-hover transition-colors"
                    >
                      <FileText size={11} /> View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Cancel modal ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[3px]">
          <div className="bg-surface rounded-[14px] border border-border-subtle p-6 w-full max-w-md shadow-xl">
            {cancelSubmitted ? (
              <div className="text-center py-4">
                <Check size={32} className="text-signal-green-text mx-auto mb-3" />
                <h3 className="text-[14px] font-semibold text-ink mb-1">Request received</h3>
                <p className="text-[12px] text-ink-muted mb-4">
                  We have received your cancellation request. Our team will be in touch within 24 hours.
                </p>
                <button
                  onClick={() => { setShowCancelModal(false); setCancelSubmitted(false); setCancelReason(""); setCancelFeedback(""); }}
                  className="px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 transition-opacity"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-[14px] font-semibold text-ink mb-1">Cancel subscription</h3>
                <p className="text-[12px] text-ink-muted mb-4">
                  We are sorry to see you go. Please let us know why so we can improve.
                </p>

                <div className="space-y-3 mb-5">
                  <div>
                    <label className={cn("mb-1.5 block", SECTION_LABEL)}>Reason</label>
                    <NativeSelect value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}>
                      <option value="">Select a reason...</option>
                      <option value="too_expensive">Too expensive</option>
                      <option value="missing_features">Missing features I need</option>
                      <option value="switching_competitor">Switching to another tool</option>
                      <option value="not_using">Not using it enough</option>
                      <option value="temporary">Temporary pause</option>
                      <option value="other">Other</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <label className={cn("mb-1.5 block", SECTION_LABEL)}>Additional feedback</label>
                    <textarea
                      value={cancelFeedback}
                      onChange={(e) => setCancelFeedback(e.target.value)}
                      placeholder="Anything else you would like us to know..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowCancelModal(false)}
                    className="px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle"
                  >
                    Keep subscription
                  </button>
                  <button
                    onClick={handleCancelRequest}
                    disabled={!cancelReason || cancelSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-signal-red text-signal-red-text text-[11px] font-medium hover:bg-signal-red/80 transition-colors disabled:opacity-50"
                  >
                    {cancelSubmitting && <Loader2 size={11} className="animate-spin" />}
                    Submit cancellation request
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
