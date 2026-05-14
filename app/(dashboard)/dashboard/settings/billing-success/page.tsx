"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Users, LayoutDashboard, Sparkles } from "lucide-react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getBillingInfo } from "@/lib/api/billing";
import type { BillingInfo } from "@/lib/types/billing";

export default function BillingSuccessPage() {
  const router = useRouter();
  const isAuthReady = useAuthReady();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (!isAuthReady) return;
    getBillingInfo().then(setBilling).catch(() => {});
  }, [isAuthReady]);

  // Auto-redirect countdown
  useEffect(() => {
    if (countdown <= 0) {
      router.push("/dashboard");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, router]);

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="text-center max-w-md">
        {/* Animated checkmark */}
        <div className="relative mx-auto w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full bg-signal-green/20 animate-ping" style={{ animationDuration: "1.5s" }} />
          <div className="relative w-20 h-20 rounded-full bg-signal-green flex items-center justify-center animate-[scale-in_0.5s_ease-out]">
            <Check size={36} strokeWidth={3} className="text-signal-green-text" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-[24px] font-bold text-ink mb-2">
          {billing ? `Welcome to ${billing.planName}!` : "Payment Successful!"}
        </h1>
        <p className="text-[13px] text-ink-muted mb-6">
          Your subscription is now active. You have full access to all features.
        </p>

        {/* Plan summary */}
        {billing && (
          <div className="bg-surface rounded-[14px] border border-border-subtle p-4 mb-6 text-left">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-signal-blue-text" />
              <span className="text-[12px] font-semibold text-ink">{billing.planName} Plan</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="text-ink-muted">Seats</div>
              <div className="text-ink font-medium">{billing.seatsIncluded}</div>
              <div className="text-ink-muted">Scraper credits</div>
              <div className="text-ink font-medium">{billing.creditsIncluded.toLocaleString()}/mo</div>
              <div className="text-ink-muted">Enrichment credits</div>
              <div className="text-ink font-medium">{billing.enrichmentCredits.toLocaleString()}/mo</div>
              <div className="text-ink-muted">Funnels</div>
              <div className="text-ink font-medium">{billing.funnelsAllowed === -1 ? "Unlimited" : billing.funnelsAllowed}</div>
              {billing.callRecording && (
                <>
                  <div className="text-ink-muted">Call recording</div>
                  <div className="text-signal-green-text font-medium">Included</div>
                </>
              )}
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            onClick={() => router.push("/dashboard/settings?tab=team")}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-[20px] bg-ink text-on-ink text-[12px] font-medium hover:bg-ink/90 transition-colors"
          >
            <Users size={14} />
            Invite Team Members
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-[20px] bg-section text-ink-secondary text-[12px] font-medium border border-border-subtle hover:bg-hover transition-colors"
          >
            <LayoutDashboard size={14} />
            Go to Dashboard
          </button>
        </div>

        <p className="text-[10px] text-ink-faint">
          Redirecting to dashboard in {countdown}s...
        </p>
      </div>
    </div>
  );
}
