"use client";

import { useEffect, useMemo, useState } from "react";
import { getTeamMembers } from "@/lib/api/team";
import type { TeamMember } from "@/lib/types/team";
import { useAuthReady } from "@/components/providers/auth-token-sync";

/** Normalised member shape consumed by the UI (filters, pickers).
 *  Derived from the backend {@link TeamMember} so callers always have a
 *  display-ready `name` regardless of how the name fields are populated. */
export interface TeamMemberOption {
  id: string;
  name: string;
  email: string;
  role: string;
  imageUrl: string | null;
}

function toOption(m: TeamMember): TeamMemberOption {
  const name = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
  return {
    id: m.id,
    name: name || m.email,
    email: m.email,
    role: m.role,
    imageUrl: m.imageUrl,
  };
}

/** Fetches the org's real team members from the backend (`GET /api/team`).
 *  Returns the live list plus lookup helpers; the list is empty until the
 *  request resolves. */
export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const isAuthReady = useAuthReady();

  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;

    async function load() {
      try {
        const { members: fetched } = await getTeamMembers();
        if (cancelled) return;
        setMembers(fetched.map(toOption));
      } catch {
        // Leave the list empty on failure — callers degrade gracefully.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthReady]);

  const membersById = useMemo(() => {
    const map = new Map<string, TeamMemberOption>();
    for (const m of members) {
      map.set(m.id, m);
    }
    return map;
  }, [members]);

  const resolveMember = (id: string): TeamMemberOption | undefined =>
    membersById.get(id);

  return { members, membersById, resolveMember, loading };
}
