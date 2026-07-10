"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { InvoiceView, type InvoiceDocData } from "@/components/billing/invoice-view";
import { getStripePaymentDetail } from "@/lib/api/billing";

/** Customer view of a Stripe payment (calling-credit top-up / one-off charge),
 *  rendered as a branded Leadey receipt — no redirect to Stripe. */
export default function StripePaymentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isAuthReady = useAuthReady();

  const [inv, setInv] = useState<InvoiceDocData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!isAuthReady) return;
    getStripePaymentDetail(params.id)
      .then(setInv)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load payment"));
  }, [isAuthReady, params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="text-[12px] text-signal-red-text py-8 text-center">
        {error} —{" "}
        <button className="underline" onClick={() => router.push("/dashboard/settings?tab=billing")}>
          back to billing
        </button>
      </div>
    );
  }
  if (!inv) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={18} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  return <InvoiceView inv={inv} />;
}
