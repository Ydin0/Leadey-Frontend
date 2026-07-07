"use client";

import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getBillingInfo, createCheckoutSession } from "@/lib/api/billing";
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

  // Only show for trial users
  if (billing.plan !== "trial") return null;

  const daysLeft = billing.trialDaysLeft;
  const isUrgent = daysLeft <= 3;
  const isExpired = daysLeft <= 0;

  async function handleUpgrade() {
    if (!billing?.prices.growth.priceId) return;
    setLoading(true);
    try {
      const { url } = await createCheckoutSession(billing.prices.growth.priceId);
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  if (isExpired) {
    return (
      <div className="trial-banner-pill flex items-center gap-2.5 px-3.5 py-1.5 rounded-[24px] text-[12px] font-medium text-signal-red-text">
        <Sparkles size={12} className="text-signal-red-text shrink-0" />
        <span className="whitespace-nowrap">Your free trial has expired.</span>
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="px-3 py-1 rounded-[20px] bg-signal-red-text text-white text-[11px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          Upgrade now
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "trial-banner-pill flex items-center gap-2.5 px-3.5 py-1.5 rounded-[24px] text-[12px] font-medium",
        isUrgent ? "text-signal-red-text" : "text-ink-secondary",
      )}
    >
      <Sparkles size={12} className="text-[#97A4D6] shrink-0" />
      <span className="whitespace-nowrap">
        <strong className="font-semibold text-ink">Free</strong> plan ·{" "}
        {daysLeft === 1 ? "1 day" : `${daysLeft} days`} left
      </span>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className={cn(
          "px-3 py-0.5 rounded-[20px] text-[11px] font-medium tracking-[0.02em] transition-opacity disabled:opacity-50",
          isUrgent
            ? "bg-signal-red-text text-white hover:opacity-90"
            : "bg-[#0F1730] text-white hover:bg-[#1A2347]",
        )}
      >
        Upgrade
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
