"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth, useOrganizationList } from "@clerk/nextjs";
import { setAuthToken } from "@/lib/api/client";

const AuthReadyContext = createContext(false);

/** Returns true once the API client has a valid Bearer token. */
export function useAuthReady() {
  return useContext(AuthReadyContext);
}

/**
 * Keeps the API client's Bearer token in sync with the Clerk session.
 * Also ensures an active organization is selected (required by backend).
 * Exposes `useAuthReady()` for children to gate API calls.
 */
export function AuthTokenSync({ children }: { children: React.ReactNode }) {
  const { getToken, orgId } = useAuth();
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const [isReady, setIsReady] = useState(false);

  // If no active org, auto-select the first one
  useEffect(() => {
    if (orgId) return;
    if (!userMemberships?.data?.length) return;
    if (!setActive) return;

    const firstOrg = userMemberships.data[0].organization;
    setActive({ organization: firstOrg.id });
  }, [orgId, userMemberships?.data, setActive]);

  useEffect(() => {
    let mounted = true;

    async function sync() {
      const token = await getToken();
      if (mounted) {
        setAuthToken(token);
        setIsReady(true);
      }
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

  return (
    <AuthReadyContext.Provider value={isReady}>
      {children}
    </AuthReadyContext.Provider>
  );
}
