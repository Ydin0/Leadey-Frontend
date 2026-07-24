"use client";

import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getBillingInfo, createPortalSession } from "@/lib/api/billing";
import type { BillingInfo } from "@/lib/types/billing";

export function TrialBanner() {
  const isAuthReady = useAuthReady();
  const { orgId } = useAuth();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Wait for both a Bearer token AND an active org. Without orgId the
    // backend /billing endpoint 403s.
    if (!isAuthReady || !orgId) return;
    let cancelled = false;
    getBillingInfo()
      .then((b) => {
        if (!cancelled) setBilling(b);
      })
      .catch((err) => {
        console.warn("[trial-banner] /billing failed:", err?.message || err);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthReady, orgId]);

  if (!billing) return null;
  if (dismissed) return null;

  // Show during a Stripe-managed free trial (card on file, auto-charges at the
  // end). The pre-card "trial" state never reaches the dashboard (payment wall);
  // legacy no-card trials have no subscription/customer, so skip them (their
  // portal button would fail — they keep the app-side trial with no banner).
  if (billing.planStatus !== "trialing" || !billing.stripeSubscriptionId) return null;

  const daysLeft = billing.trialDaysLeft;
  const isUrgent = daysLeft <= 3;
  const chargeDate = billing.trialEndsAt
    ? new Date(billing.trialEndsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : null;

  async function handleManage() {
    setLoading(true);
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "trial-banner-pill flex items-center gap-2.5 px-3.5 py-1.5 rounded-[24px] text-[12px] font-medium",
        isUrgent ? "text-signal-red-text" : "text-ink-secondary",
      )}
    >
      <Sparkles size={12} className={isUrgent ? "text-signal-red-text shrink-0" : "text-[#97A4D6] shrink-0"} />
      <span className="whitespace-nowrap">
        <strong className="font-semibold text-ink">Trial</strong> ·{" "}
        {daysLeft === 1 ? "1 day" : `${daysLeft} days`} left
        {chargeDate && (
          <span className="text-ink-muted"> · {billing.planName} starts {chargeDate}</span>
        )}
      </span>
      <button
        onClick={handleManage}
        disabled={loading}
        className={cn(
          "px-3 py-0.5 rounded-[20px] text-[11px] font-medium tracking-[0.02em] transition-opacity disabled:opacity-50",
          isUrgent
            ? "bg-signal-red-text text-white hover:opacity-90"
            : "bg-[#0F1730] text-white hover:bg-[#1A2347]",
        )}
      >
        Manage
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="p-0.5 rounded hover:bg-white/10 transition-colors text-ink-muted"
        aria-label="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  );
}
