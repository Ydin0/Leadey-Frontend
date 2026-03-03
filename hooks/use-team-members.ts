"use client";

import { useMemo } from "react";
import { mockSettings } from "@/lib/mock-data/settings";
import type { TeamMemberSettings } from "@/lib/types/settings";

export function useTeamMembers() {
  const members = mockSettings.teamMembers;

  const membersById = useMemo(() => {
    const map = new Map<string, TeamMemberSettings>();
    for (const m of members) {
      map.set(m.id, m);
    }
    return map;
  }, [members]);

  const resolveMember = (id: string): TeamMemberSettings | undefined =>
    membersById.get(id);

  return { members, membersById, resolveMember };
}
