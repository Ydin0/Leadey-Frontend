"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { setAuthToken } from "@/lib/api/client";

/**
 * Keeps the API client's Bearer token in sync with the Clerk session.
 * Mount once inside any authenticated layout.
 */
export function AuthTokenSync() {
  const { getToken } = useAuth();

  useEffect(() => {
    let mounted = true;

    async function sync() {
      const token = await getToken();
      if (mounted) setAuthToken(token);
    }

    sync();

    // Refresh every 50 seconds (Clerk tokens last ~60s)
    const interval = setInterval(sync, 50_000);

    return () => {
      mounted = false;
      clearInterval(interval);
      setAuthToken(null);
    };
  }, [getToken]);

  return null;
}
