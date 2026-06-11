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
  const { userMemberships, setActive, isLoaded: orgListLoaded } =
    useOrganizationList({
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

  // The active org is "settled" once Clerk has picked one, OR the membership
  // list has finished loading and the user genuinely belongs to no org. We
  // must not mark auth ready before this — otherwise the first token has no
  // org claim and every org-scoped backend call 404s until a manual refresh.
  const hasMemberships = (userMemberships?.data?.length ?? 0) > 0;
  const orgSettled = !!orgId || (orgListLoaded && !hasMemberships);

  useEffect(() => {
    let mounted = true;
    let retry: ReturnType<typeof setTimeout> | null = null;

    async function sync() {
      // Re-fetch the token whenever orgId changes — Clerk bakes the active
      // org into the JWT claim, so the cached pre-org token would 403/404 our
      // org-scoped backend endpoints (/funnels, /billing, /team, etc.).
      try {
        const token = await getToken({ skipCache: true });
        if (!mounted) return;
        setAuthToken(token);
        // Only signal "ready" once we actually have a token AND the active org
        // is resolved. Until then keep waiting/retrying so gated pages don't
        // fire requests with a no-org token and get stuck on a 404.
        if (token && orgSettled) {
          setIsReady(true);
        } else {
          // Transient (token not minted yet / org still selecting) — retry
          // shortly so first-load clears in ~1s instead of waiting a full
          // interval. The orgId/orgSettled change also re-runs this effect.
          retry = setTimeout(() => void sync(), 800);
        }
      } catch {
        if (!mounted) return;
        // getToken can reject during session bootstrap — never leave auth
        // permanently un-ready; retry shortly.
        retry = setTimeout(() => void sync(), 800);
      }
    }

    void sync();

    // Refresh every 50 seconds (Clerk tokens last ~60s)
    const interval = setInterval(() => void sync(), 50_000);

    return () => {
      mounted = false;
      if (retry) clearTimeout(retry);
      clearInterval(interval);
    };
  }, [getToken, orgId, orgSettled]);

  return (
    <AuthReadyContext.Provider value={isReady}>
      {children}
    </AuthReadyContext.Provider>
  );
}
