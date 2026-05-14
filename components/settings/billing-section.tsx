"use client";

import { useState, useEffect, useCallback } from "react";
import { CreditCard, ExternalLink, Loader2, Check, Sparkles, Minus, Plus, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getBillingInfo, createCheckoutSession, getInvoices } from "@/lib/api/billing";
import { apiRequest } from "@/lib/api/client";
import { NativeSelect } from "@/components/ui/native-select";
import { downloadInvoiceAsPdf } from "@/lib/utils/generate-invoice-pdf";
import type { BillingInfo, StripeInvoice } from "@/lib/types/billing";

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
  past_due: { label: "Past Due", className: "bg-signal-red text-signal-red-text" },
  cancelled: { label: "Cancelled", className: "bg-signal-slate text-signal-slate-text" },
};

export function BillingSection() {
  const isAuthReady = useAuthReady();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [invoices, setInvoices] = useState<StripeInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelFeedback, setCancelFeedback] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelSubmitted, setCancelSubmitted] = useState(false);
  const [showAddSeats, setShowAddSeats] = useState(false);
  const [additionalSeats, setAdditionalSeats] = useState(1);

  useEffect(() => {
    if (!isAuthReady) return;
    Promise.all([getBillingInfo(), getInvoices()])
      .then(([b, inv]) => { setBilling(b); setInvoices(inv); })
      .catch((err) => console.error("Failed to load billing:", err))
      .finally(() => setLoading(false));
  }, [isAuthReady]);

  // Seat selection per plan
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
      const { url } = await createCheckoutSession(priceId, seats);
      window.location.href = url;
    } catch (err) {
      console.error("Checkout failed:", err);
      setCheckoutLoading(null);
    }
  }

  async function handleCancelRequest() {
    setCancelSubmitting(true);
    try {
      // Send cancellation request (this doesn't actually cancel — it sends a request to the team)
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

  if (!billing) return null;

  const status = planStatusLabel[billing.planStatus] || planStatusLabel.active;
  const isTrial = billing.plan === "trial";
  const hasSubscription = !!billing.stripeSubscriptionId;
  const creditsPercent = billing.creditsIncluded > 0 ? Math.round((billing.creditsUsed / billing.creditsIncluded) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-ink">{billing.planName} Plan</h3>
              <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", status.className)}>
                {status.label}
              </span>
            </div>
            {isTrial && (
              <p className="text-[11px] text-ink-muted mt-1">
                {billing.trialDaysLeft > 0
                  ? `${billing.trialDaysLeft} days remaining in your free trial`
                  : "Your trial has expired"}
              </p>
            )}
            {hasSubscription && billing.currentPeriodEnd && (
              <p className="text-[11px] text-ink-muted mt-1">
                Next billing date: {new Date(billing.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
        </div>

        {/* Usage + Seats */}
        <div className="space-y-4">
          {/* Credits bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Scraper Credits</p>
              <span className="text-[10px] text-ink-muted">
                {billing.creditsUsed.toLocaleString()} / {billing.creditsIncluded.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-section overflow-hidden">
              <div
                className={cn("h-full rounded-full", creditsPercent > 90 ? "bg-signal-red-text" : "bg-signal-blue-text")}
                style={{ width: `${Math.min(100, creditsPercent)}%` }}
              />
            </div>
          </div>

          {/* Seats */}
          <div className="flex items-center justify-between py-3 border-t border-border-subtle">
            <div>
              <p className="text-[12px] font-medium text-ink">Seats</p>
              <p className="text-[10px] text-ink-muted">{billing.seatsIncluded} seat{billing.seatsIncluded !== 1 ? "s" : ""} on your plan</p>
            </div>
            {hasSubscription && (
              <div className="relative">
                <button
                  onClick={() => setShowAddSeats(!showAddSeats)}
                  className="px-3 py-1.5 rounded-[20px] text-[11px] font-medium bg-section text-ink-secondary border border-border-subtle hover:bg-hover transition-colors"
                >
                  <Plus size={10} className="inline mr-1" />
                  Add Seats
                </button>
                {showAddSeats && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-surface rounded-[12px] border border-border-subtle shadow-lg p-4 z-30">
                    <p className="text-[12px] font-medium text-ink mb-3">Add seats to your plan</p>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setAdditionalSeats(Math.max(1, additionalSeats - 1))}
                          className="w-7 h-7 flex items-center justify-center rounded-md border border-border-subtle text-ink-muted hover:bg-hover transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-[14px] font-semibold text-ink w-8 text-center">{additionalSeats}</span>
                        <button
                          type="button"
                          onClick={() => setAdditionalSeats(additionalSeats + 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-md border border-border-subtle text-ink-muted hover:bg-hover transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="text-[11px] text-ink-muted">
                        seat{additionalSeats !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="text-[10px] text-ink-faint mb-3">
                      {(() => {
                        const price = billing.prices[billing.plan as keyof typeof billing.prices];
                        if (!price) return "";
                        return `+£${((price.amount / 100) * additionalSeats).toFixed(0)}/mo added to your next invoice`;
                      })()}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAddSeats(false)}
                        className="px-3 py-1.5 rounded-[8px] text-[11px] font-medium text-ink-muted hover:bg-hover transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          const price = billing.prices[billing.plan as keyof typeof billing.prices];
                          if (!price?.priceId) return;
                          setCheckoutLoading("add-seats");
                          try {
                            const { url } = await createCheckoutSession(price.priceId, additionalSeats);
                            window.location.href = url;
                          } catch (err) {
                            console.error("Add seats failed:", err);
                            setCheckoutLoading(null);
                          }
                        }}
                        disabled={!!checkoutLoading}
                        className="flex-1 py-1.5 rounded-[8px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
                      >
                        {checkoutLoading === "add-seats" ? <Loader2 size={11} className="animate-spin mx-auto" /> : "Confirm & Pay"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Limits grid */}
          <div className="grid grid-cols-4 gap-3 text-[11px] py-3 border-t border-border-subtle">
            <div>
              <span className="text-ink-faint text-[10px]">Funnels</span>
              <p className="text-ink font-medium">{billing.funnelsAllowed === -1 ? "Unlimited" : billing.funnelsAllowed}</p>
            </div>
            <div>
              <span className="text-ink-faint text-[10px]">Phone lines</span>
              <p className="text-ink font-medium">{billing.phoneLinesAllowed}</p>
            </div>
            <div>
              <span className="text-ink-faint text-[10px]">Enrichment</span>
              <p className="text-ink font-medium">{billing.enrichmentCredits.toLocaleString()}/mo</p>
            </div>
            <div>
              <span className="text-ink-faint text-[10px]">Call recording</span>
              <p className="text-ink font-medium">{billing.callRecording ? "Yes" : "No"}</p>
            </div>
          </div>

          {/* Cancel link */}
          {hasSubscription && (
            <div className="pt-3 border-t border-border-subtle">
              <button
                onClick={() => setShowCancelModal(true)}
                className="text-[11px] text-ink-faint hover:text-signal-red-text transition-colors"
              >
                Cancel subscription
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40">
          <div className="bg-surface rounded-[14px] border border-border-subtle p-6 w-full max-w-md shadow-xl">
            {cancelSubmitted ? (
              <div className="text-center py-4">
                <Check size={32} className="text-signal-green-text mx-auto mb-3" />
                <h3 className="text-[14px] font-semibold text-ink mb-1">Request Received</h3>
                <p className="text-[12px] text-ink-muted mb-4">
                  We have received your cancellation request. Our team will be in touch within 24 hours.
                </p>
                <button
                  onClick={() => { setShowCancelModal(false); setCancelSubmitted(false); setCancelReason(""); setCancelFeedback(""); }}
                  className="px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-[14px] font-semibold text-ink mb-1">Cancel Subscription</h3>
                <p className="text-[12px] text-ink-muted mb-4">
                  We are sorry to see you go. Please let us know why so we can improve.
                </p>

                <div className="space-y-3 mb-5">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5 block">Reason</label>
                    <NativeSelect
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    >
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
                    <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5 block">Additional Feedback</label>
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
                    Keep Subscription
                  </button>
                  <button
                    onClick={handleCancelRequest}
                    disabled={!cancelReason || cancelSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-signal-red text-signal-red-text text-[11px] font-medium hover:bg-signal-red/80 transition-colors disabled:opacity-50"
                  >
                    {cancelSubmitting && <Loader2 size={11} className="animate-spin" />}
                    Submit Cancellation Request
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Plans Grid (show if trial or no subscription) */}
      {(isTrial || !hasSubscription) && (
        <div>
          <h3 className="text-[14px] font-semibold text-ink mb-3">Choose a Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["starter", "growth", "scale"] as const).map((planKey) => {
              const price = billing.prices[planKey];
              const details = PLAN_DETAILS[planKey];
              const isCurrentPlan = billing.plan === planKey;
              const isPopular = planKey === "growth";
              const seats = seatCounts[planKey] || details?.minSeats || 1;
              const perSeatPrice = price.amount / 100;
              const totalPrice = perSeatPrice * seats;

              return (
                <div
                  key={planKey}
                  className={cn(
                    "bg-surface rounded-[14px] border p-5 relative flex flex-col",
                    isPopular ? "border-signal-blue-text" : "border-border-subtle"
                  )}
                >
                  {isPopular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-signal-blue-text text-white text-[9px] font-semibold">
                      Most Popular
                    </span>
                  )}
                  <h4 className="text-[14px] font-semibold text-ink capitalize">{planKey}</h4>
                  <p className="text-[10px] text-ink-muted mt-0.5 mb-3">{details?.description}</p>

                  <div className="mb-1">
                    <span className="text-[24px] font-bold text-ink">&pound;{perSeatPrice.toFixed(0)}</span>
                    <span className="text-[11px] text-ink-muted">/seat/month</span>
                  </div>

                  {/* Seat selector */}
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border-subtle">
                    <span className="text-[11px] text-ink-secondary">Seats:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => adjustSeats(planKey, -1)}
                        disabled={seats <= (details?.minSeats || 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-md border border-border-subtle text-ink-muted hover:bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-[13px] font-semibold text-ink w-6 text-center">{seats}</span>
                      <button
                        type="button"
                        onClick={() => adjustSeats(planKey, 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-md border border-border-subtle text-ink-muted hover:bg-hover transition-colors"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                    <span className="text-[11px] text-ink-faint ml-auto">
                      &pound;{totalPrice.toFixed(0)}/mo
                    </span>
                  </div>

                  <ul className="space-y-1.5 mb-5 flex-1">
                    {details?.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-[11px] text-ink-secondary">
                        <Check size={11} className="text-signal-green-text shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleCheckout(planKey)}
                    disabled={isCurrentPlan || !!checkoutLoading}
                    className={cn(
                      "w-full py-2.5 rounded-[20px] text-[11px] font-medium transition-colors",
                      isCurrentPlan
                        ? "bg-section text-ink-faint cursor-not-allowed"
                        : isPopular
                          ? "bg-signal-blue-text text-white hover:opacity-90"
                          : "bg-ink text-on-ink hover:bg-ink/90"
                    )}
                  >
                    {checkoutLoading === planKey ? (
                      <Loader2 size={12} className="animate-spin mx-auto" />
                    ) : isCurrentPlan ? (
                      "Current Plan"
                    ) : planKey === "scale" ? (
                      "Talk to Sales"
                    ) : (
                      "Start 14-Day Free Trial"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invoice History */}
      {invoices.length > 0 && (
        <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
          <h3 className="text-[14px] font-semibold text-ink mb-3">Invoice History</h3>
          <div className="overflow-hidden rounded-[10px] border border-border-subtle">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-section/50 border-b border-border-subtle">
                  <th className="text-left px-3 py-2 font-medium text-ink-muted">Invoice</th>
                  <th className="text-left px-3 py-2 font-medium text-ink-muted">Date</th>
                  <th className="text-right px-3 py-2 font-medium text-ink-muted">Amount</th>
                  <th className="text-center px-3 py-2 font-medium text-ink-muted">Status</th>
                  <th className="text-right px-3 py-2 font-medium text-ink-muted w-20"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border-subtle last:border-b-0">
                    <td className="px-3 py-2.5">
                      <span className="text-[12px] font-medium text-ink">{inv.number || "—"}</span>
                    </td>
                    <td className="px-3 py-2.5 text-ink-secondary">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-[12px] font-semibold text-ink">
                        &pound;{((inv.amountPaid || inv.amountDue) / 100).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn(
                        "text-[10px] font-medium rounded-full px-2 py-0.5",
                        inv.status === "paid" ? "bg-signal-green text-signal-green-text" : "bg-signal-slate text-signal-slate-text"
                      )}>
                        {inv.status || "pending"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {inv.invoicePdf ? (
                          <a
                            href={inv.invoicePdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Download PDF"
                            className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-hover transition-colors"
                          >
                            <Download size={13} />
                          </a>
                        ) : (
                          <button
                            onClick={() => downloadInvoiceAsPdf(inv, billing?.planName || "Leadey")}
                            title="Download PDF"
                            className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-hover transition-colors"
                          >
                            <Download size={13} />
                          </button>
                        )}
                        {inv.invoiceUrl && (
                          <a
                            href={inv.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View online"
                            className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-hover transition-colors"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
