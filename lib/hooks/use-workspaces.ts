"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth, useOrganizationList } from "@clerk/nextjs";

export interface Workspace {
  id: string;
  name: string;
  imageUrl: string | null;
  /** Clerk role for this user in the org, e.g. "org:admin" / "org:member". */
  role: string;
  membersCount: number | null;
  isActive: boolean;
}

/** Shared workspace state + switch logic, reused by the avatar-menu switcher and
 *  the first-login chooser. Switching activates the org in Clerk (which re-bakes
 *  the org_id into the session JWT — AuthTokenSync then re-mints our backend
 *  token automatically) and HARD-navigates to the dashboard so no per-org client
 *  state (funnel cache, credits/dialer/scraper providers) bleeds across orgs. */
export function useWorkspaces() {
  const { orgId } = useAuth();
  const { userMemberships, setActive, createOrganization, isLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  // Clerk caches the membership list, so a workspace the user was just removed
  // from can linger in the switcher. Revalidate when the tab regains focus so a
  // revoked workspace drops off (the backend already denies its data via the
  // org-membership guard — this keeps the UI honest too).
  const revalidateRef = useRef<(() => void) | undefined>(undefined);
  revalidateRef.current = userMemberships?.revalidate;
  useEffect(() => {
    const onFocus = () => revalidateRef.current?.();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const workspaces = useMemo<Workspace[]>(() => {
    const data = userMemberships?.data ?? [];
    return data
      .map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        // Only surface a real uploaded logo — otherwise OrgAvatar draws the
        // gradient initials tile.
        imageUrl: m.organization.hasImage ? m.organization.imageUrl : null,
        role: m.role,
        membersCount: (m.organization.membersCount as number | undefined) ?? null,
        isActive: m.organization.id === orgId,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [userMemberships?.data, orgId]);

  async function switchTo(targetOrgId: string) {
    if (!setActive || switchingTo) return;
    if (targetOrgId === orgId) return;
    setSwitchingTo(targetOrgId);
    try {
      await setActive({ organization: targetOrgId });
      // Full reload guarantees a clean reset of all per-org client state.
      window.location.assign("/dashboard");
    } catch {
      setSwitchingTo(null);
    }
  }

  /** Create a new workspace, make it active, and land on its settings so the
   *  owner can finish setup (logo, country, billing). Throws on failure so the
   *  caller can surface it. */
  async function createWorkspace(name: string) {
    if (!createOrganization || !setActive) throw new Error("Not ready");
    const org = await createOrganization({ name });
    await setActive({ organization: org.id });
    window.location.assign("/dashboard/settings?tab=organization");
  }

  return { workspaces, activeOrgId: orgId ?? null, isLoaded, switchTo, switchingTo, createWorkspace };
}

/** Friendly label for a Clerk role string. */
export function roleLabel(role: string): string {
  if (role === "org:admin" || role === "admin") return "Admin";
  if (role === "org:member" || role === "member") return "Member";
  return role.replace(/^org:/, "");
}
