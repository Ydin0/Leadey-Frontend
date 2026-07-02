"use client";

import { useMemo } from "react";
import type { TeamMember } from "@/lib/types/team";
import { useTeamMembersQuery } from "@/lib/queries/use-org-config";

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

/** The org's team members, served from the shared React Query cache — one
 *  request per 5 minutes no matter how many components mount this. */
export function useTeamMembers() {
  const { data, isPending } = useTeamMembersQuery();

  const members = useMemo(
    () => (data?.members ?? []).map(toOption),
    [data?.members],
  );

  const membersById = useMemo(() => {
    const map = new Map<string, TeamMemberOption>();
    for (const m of members) map.set(m.id, m);
    return map;
  }, [members]);

  const resolveMember = (id: string): TeamMemberOption | undefined =>
    membersById.get(id);

  return { members, membersById, resolveMember, loading: isPending };
}
