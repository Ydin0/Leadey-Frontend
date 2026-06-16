"use client";

import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getCredits, type CreditInfo } from "@/lib/api/credits";

interface CreditsContextValue {
  info: CreditInfo | null;
  balance: number;
  loading: boolean;
  /** Re-fetch the balance now (call after a spend/top-up). */
  refresh: () => void;
}

const CreditsContext = createContext<CreditsContextValue | null>(null);

/** Live credit balance, shared by the header pill and the Credits settings tab.
 *  Polls lightly and exposes refresh() so spend-triggering flows can update the
 *  pill immediately. */
export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const isAuthReady = useAuthReady();
  const [info, setInfo] = useState<CreditInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      setInfo(await getCredits());
    } catch (err) {
      console.error("Failed to load credits:", err);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    void refresh();
    const t = setInterval(() => void refresh(), 60000);
    return () => clearInterval(t);
  }, [isAuthReady, refresh]);

  return (
    <CreditsContext.Provider value={{ info, balance: info?.balance ?? 0, loading, refresh: () => void refresh() }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits(): CreditsContextValue {
  const ctx = useContext(CreditsContext);
  if (!ctx) {
    // Safe fallback so components outside the provider (rare) don't crash.
    return { info: null, balance: 0, loading: false, refresh: () => {} };
  }
  return ctx;
}
