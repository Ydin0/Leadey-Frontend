"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PhoneCall } from "lucide-react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getActiveSession } from "@/lib/api/dialer";

/** Power-dialer index page: resume an active session, or instruct the rep
 *  to launch one from a funnel step. */
export default function DialerIndexPage() {
  const router = useRouter();
  const isAuthReady = useAuthReady();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    (async () => {
      try {
        const active = await getActiveSession();
        if (cancelled) return;
        if (active) {
          router.replace(`/dashboard/dialer/${active.id}`);
          return;
        }
      } catch {
        // fall through to empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthReady, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 rounded-full bg-section flex items-center justify-center">
        <PhoneCall size={24} className="text-ink-muted" strokeWidth={1.5} />
      </div>
      <div className="text-center max-w-sm">
        <h2 className="text-[14px] font-semibold text-ink">No active dialer session</h2>
        <p className="text-[12px] text-ink-muted mt-1">
          Open any funnel with a call step and press the green dialer button to
          load a queue and start working through it.
        </p>
      </div>
      <button
        type="button"
        onClick={() => router.push("/dashboard/funnels")}
        className="px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
      >
        Go to Funnels
      </button>
    </div>
  );
}
