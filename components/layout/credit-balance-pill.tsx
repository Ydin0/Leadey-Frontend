"use client";

import Link from "next/link";
import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCredits } from "@/components/providers/credits-provider";
import { creditsToUsd } from "@/lib/api/credits";

/** Live credit balance in the header. Click → Credits settings tab (top up,
 *  usage reports). Turns amber/red as the balance runs low. */
export function CreditBalancePill() {
  const { info, balance, loading } = useCredits();
  const centsPerCredit = info?.centsPerCredit ?? 1;

  // Low / empty thresholds — enough for ~a handful of phone enrichments.
  const low = balance > 0 && balance < 100;
  const empty = balance <= 0;

  return (
    <Link
      href="/dashboard/settings?tab=credits"
      title={`${balance.toLocaleString()} credits (${creditsToUsd(balance, centsPerCredit)}) — click to top up`}
      className={cn(
        "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[20px] border text-[11px] font-medium transition-colors",
        empty
          ? "bg-signal-red/10 border-signal-red-text/25 text-signal-red-text hover:bg-signal-red/15"
          : low
            ? "bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/15 dark:text-amber-400"
            : "bg-surface border-border-subtle text-ink-secondary hover:bg-hover hover:text-ink",
      )}
    >
      <Coins size={13} strokeWidth={2} className={cn(!empty && !low && "text-accent")} />
      <span className="tabular-nums">{loading && !info ? "—" : balance.toLocaleString()}</span>
    </Link>
  );
}
