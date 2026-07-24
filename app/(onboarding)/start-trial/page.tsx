"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Check, Minus, Plus, ShieldCheck, CalendarClock, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getBillingInfo, createCheckoutSession } from "@/lib/api/billing";

type PlanKey = "starter" | "growth" | "scale";

const PLANS: Record<PlanKey, { minSeats: number; blurb: string; features: string[] }> = {
  starter: {
    minSeats: 1,
    blurb: "Solo reps doing their own outbound.",
    features: ["200 leads scraped/mo", "200 enrichments/mo", "Email sequences", "3 funnels"],
  },
  growth: {
    minSeats: 1,
    blurb: "Full multi-channel outreach with the dialer.",
    features: ["1,000 leads/mo", "1,000 enrichments/mo", "Built-in dialer", "Call recording", "10 funnels"],
  },
  scale: {
    minSeats: 3,
    blurb: "Sales teams running outbound at volume.",
    features: ["3,000 leads/seat/mo", "Unlimited senders", "Analytics & A/B testing", "Unlimited funnels", "API access"],
  },
};

const gbp = (n: number) => `£${n.toLocaleString(undefined, { maximumFractionDigits: Number.isInteger(n) ? 0 : 2 })}`;

export default function StartTrialPage() {
  const isReady = useAuthReady();
  const router = useRouter();

  const { data: billing, isError } = useQuery({
    queryKey: ["billing", "payment-gate"],
    queryFn: getBillingInfo,
    enabled: isReady,
    staleTime: 60_000,
  });

  const [plan, setPlan] = useState<PlanKey>("growth");
  const [seats, setSeats] = useState<Record<PlanKey, number>>({ starter: 1, growth: 1, scale: 3 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already has a card / subscription → nothing to do here.
  useEffect(() => {
    if (billing && !billing.needsPaymentSetup) router.replace("/dashboard");
  }, [billing, router]);

  // Seed seat counts from the org's assigned seats (invited team etc.).
  useEffect(() => {
    if (billing && billing.seatsIncluded > 1) {
      setSeats((prev) => {
        const next = { ...prev };
        (Object.keys(next) as PlanKey[]).forEach((k) => {
          next[k] = Math.max(billing.seatsIncluded, PLANS[k].minSeats);
        });
        return next;
      });
    }
  }, [billing]);

  const trialEndLabel = useMemo(() => {
    const d = new Date(Date.now() + 30 * 86400000);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }, []);

  function adjust(key: PlanKey, delta: number) {
    setSeats((prev) => ({ ...prev, [key]: Math.max(PLANS[key].minSeats, (prev[key] || PLANS[key].minSeats) + delta) }));
  }

  async function startTrial() {
    if (!billing) return;
    const priceId = billing.prices[plan]?.priceId;
    if (!priceId) { setError("This plan isn't available right now. Please try another."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const { url } = await createCheckoutSession(
        priceId,
        seats[plan],
        {
          successUrl: `${window.location.origin}/dashboard/settings/billing-success`,
          cancelUrl: `${window.location.origin}/start-trial`,
        },
        { trial: true },
      );
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start checkout. Please try again.");
      setSubmitting(false);
    }
  }

  if (!isReady || (!billing && !isError)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  if (isError || !billing) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="rounded-[14px] border border-border-subtle bg-surface p-8 text-center max-w-md">
          <p className="text-[13px] font-medium text-ink mb-1">Couldn&apos;t load plans</p>
          <p className="text-[12px] text-ink-muted mb-4">Please refresh the page and try again.</p>
          <button onClick={() => location.reload()} className="px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11.5px] font-medium hover:opacity-90 transition-opacity">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const discountPct = billing.discountPct ?? 0;
  const applyDiscount = (amt: number) => (amt * (100 - discountPct)) / 100;
  const selectedSeats = seats[plan];
  const perSeat = (billing.prices[plan]?.amount ?? 0) / 100;
  const monthlyAfterTrial = applyDiscount(perSeat * selectedSeats);

  return (
    <div className="min-h-screen flex flex-col items-center px-5 py-10 sm:py-14">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-signal-green px-3 py-1 text-[11px] font-medium text-signal-green-text mb-4">
            <ShieldCheck size={13} /> 30 days free · no charge today
          </div>
          <h1 className="text-[26px] sm:text-[30px] font-semibold text-ink tracking-[-0.01em]">Start your free trial</h1>
          <p className="text-[13px] text-ink-muted mt-2 max-w-xl mx-auto">
            Pick a plan to unlock Leadey. We&apos;ll save your card but you won&apos;t be charged until{" "}
            <span className="text-ink font-medium">{trialEndLabel}</span> — cancel anytime before then and pay nothing.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["starter", "growth", "scale"] as const).map((key) => {
            const p = PLANS[key];
            const price = billing.prices[key];
            const isSel = plan === key;
            const isPopular = key === "growth";
            const s = seats[key];
            const perSeatPrice = (price?.amount ?? 0) / 100;
            const totalMo = applyDiscount(perSeatPrice * s);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPlan(key)}
                className={cn(
                  "text-left rounded-[14px] border bg-surface flex flex-col overflow-hidden transition-colors",
                  isSel ? "border-accent ring-1 ring-accent" : "border-border-subtle hover:border-border-default",
                )}
              >
                <div className={cn(
                  "py-1.5 text-center text-[9.5px] font-semibold uppercase tracking-wider",
                  isPopular ? "bg-accent/10 text-accent" : "text-transparent",
                )}>
                  {isPopular ? "Most popular" : "·"}
                </div>
                <div className="p-5 pt-3 flex flex-col flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold text-ink capitalize">{key}</h3>
                    <span className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center",
                      isSel ? "border-accent bg-accent" : "border-border-default",
                    )}>
                      {isSel && <Check size={11} className="text-white" strokeWidth={3} />}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted mt-1 min-h-[30px]">{p.blurb}</p>

                  <div className="mt-3 mb-4">
                    {discountPct > 0 && (
                      <span className="text-[15px] font-normal text-ink-faint line-through mr-2 tabular-nums">£{perSeatPrice.toFixed(0)}</span>
                    )}
                    <span className="text-[26px] font-semibold text-ink tabular-nums">{gbp(applyDiscount(perSeatPrice))}</span>
                    <span className="text-[11.5px] text-ink-muted"> /seat per month</span>
                  </div>

                  {/* Seat stepper (only affects the selected plan's total) */}
                  <div
                    className="flex items-center justify-between rounded-[10px] border border-border-subtle bg-section/40 px-3 py-2 mb-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <StepBtn onClick={() => adjust(key, -1)} disabled={s <= p.minSeats}><Minus size={11} /></StepBtn>
                      <span className="text-[13px] font-semibold text-ink w-6 text-center tabular-nums">{s}</span>
                      <StepBtn onClick={() => adjust(key, 1)}><Plus size={11} /></StepBtn>
                      <span className="text-[11px] text-ink-muted">seat{s === 1 ? "" : "s"}</span>
                    </div>
                    <span className="text-[12px] font-medium text-ink tabular-nums">{gbp(totalMo)}/mo</span>
                  </div>

                  <ul className="space-y-1.5 flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-[11px] text-ink-secondary">
                        <Check size={11} className="text-signal-green-text shrink-0 mt-0.5" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </button>
            );
          })}
        </div>

        {/* Summary + CTA */}
        <div className="mt-6 rounded-[14px] border border-border-subtle bg-surface p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="text-[12px] text-ink-muted flex items-center gap-2">
            <CalendarClock size={15} className="text-accent shrink-0" />
            <span>
              Free until <span className="text-ink font-medium">{trialEndLabel}</span>, then{" "}
              <span className="text-ink font-medium tabular-nums">{gbp(monthlyAfterTrial)}/mo</span> for{" "}
              {selectedSeats} <span className="capitalize">{plan}</span> seat{selectedSeats === 1 ? "" : "s"}.
              {discountPct > 0 && <span className="text-signal-green-text font-medium"> {discountPct}% discount applied.</span>}
            </span>
          </div>
          {error && <p className="text-[11.5px] text-signal-red-text font-medium sm:hidden">{error}</p>}
          <button
            onClick={startTrial}
            disabled={submitting}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[20px] bg-ink text-on-ink text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
            Add card &amp; start trial
          </button>
        </div>
        {error && <p className="text-[11.5px] text-signal-red-text font-medium text-center mt-3 hidden sm:block">{error}</p>}

        <p className="text-[11px] text-ink-faint text-center mt-5 flex items-center justify-center gap-1.5">
          <ShieldCheck size={12} /> Secure checkout by Stripe · cancel in a click before your trial ends
        </p>
      </div>
    </div>
  );
}

function StepBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
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
