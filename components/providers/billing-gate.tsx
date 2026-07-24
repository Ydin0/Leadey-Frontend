"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getBillingInfo } from "@/lib/api/billing";

/**
 * Signup payment wall gate. New orgs are created with `cardSetupRequired` and no
 * subscription; until they add a card + start a trial (via /start-trial) the
 * backend returns `needsPaymentSetup: true`. This gate holds the dashboard
 * behind that check and redirects such orgs to the wall. It fails OPEN — if the
 * billing endpoint errors we render the app rather than lock anyone out.
 *
 * Placed inside AuthTokenSync (so the token is ready) and OUTSIDE the org data
 * providers (so we don't spin up credits/dialer fetches for a walled org).
 */
export function BillingGate({ children }: { children: React.ReactNode }) {
  const isReady = useAuthReady();
  const router = useRouter();

  const { data, isError } = useQuery({
    queryKey: ["billing", "payment-gate"],
    queryFn: getBillingInfo,
    enabled: isReady,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data?.needsPaymentSetup) router.replace("/start-trial");
  }, [data?.needsPaymentSetup, router]);

  // Fail open: never trap a user in a loader if billing can't be read.
  if (isError) return <>{children}</>;
  // Hold until we know the billing state (first load only — cached after).
  if (!isReady || !data || data.needsPaymentSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <Loader2 size={22} className="animate-spin text-ink-muted" />
      </div>
    );
  }
  return <>{children}</>;
}
