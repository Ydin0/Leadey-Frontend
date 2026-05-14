"use client";

import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getBillingInfo, createCheckoutSession } from "@/lib/api/billing";
import type { BillingInfo } from "@/lib/types/billing";

export function TrialBanner() {
  const isAuthReady = useAuthReady();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthReady) return;
    getBillingInfo()
      .then(setBilling)
      .catch(() => {}); // silently fail — banner just won't show
  }, [isAuthReady]);

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
      <div className="bg-signal-red text-signal-red-text px-4 py-2.5 flex items-center justify-center gap-3 text-[12px] font-medium">
        <span>Your free trial has expired. Upgrade now to continue using Leadey.</span>
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="px-3 py-1 rounded-[20px] bg-signal-red-text text-white text-[11px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          Upgrade Now
        </button>
      </div>
    );
  }

  return (
    <div className={cn(
      "px-4 py-2 flex items-center justify-center gap-3 text-[11px] font-medium",
      isUrgent
        ? "bg-signal-red/10 text-signal-red-text"
        : "bg-signal-blue/10 text-signal-blue-text"
    )}>
      <Sparkles size={12} />
      <span>
        {daysLeft === 1
          ? "Your free trial ends tomorrow"
          : `You have ${daysLeft} days left on your free trial`}
      </span>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className={cn(
          "px-3 py-0.5 rounded-[20px] text-[10px] font-semibold transition-opacity disabled:opacity-50",
          isUrgent
            ? "bg-signal-red-text text-white hover:opacity-90"
            : "bg-signal-blue-text text-white hover:opacity-90"
        )}
      >
        Upgrade
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="p-0.5 rounded hover:bg-ink/10 transition-colors ml-2"
      >
        <X size={12} />
      </button>
    </div>
  );
}
