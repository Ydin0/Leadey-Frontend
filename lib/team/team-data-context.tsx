"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import {
  getTeamMembers, getPendingInvitations, inviteTeamMember,
  getTeamKpiConfig, saveTeamKpiConfig, getTeamAnalytics, getDepartments,
  getAnalyticsCards, saveAnalyticsCards,
  type TeamKpiConfig, type TeamAnalyticsDay, type Department,
} from "@/lib/api/team";
import {
  ROLE_TARGETS, hydrateSeries, emptySeries, DEFAULT_DEPARTMENTS,
  type Member, type Targets, type DayRec, type MemberStatus,
} from "./team-data";
import { DEFAULT_CARD_IDS, sanitizeCardIds } from "./metric-catalog";

interface TeamDataValue {
  members: Member[];        // includes pending invites (for the roster)
  activeMembers: Member[];  // excludes pending (for analytics/leaderboard)
  seatUsage: { used: number; included: number };
  departments: Department[];
  loading: boolean;
  /** Org-wide analytics stat-card layout (ordered card ids). */
  cardIds: string[];
  /** Persist a new org-wide card layout (managers/admins). */
  saveCards: (ids: string[]) => Promise<void>;
  refresh: () => Promise<void>;
  addMember: (data: { name: string; email: string; role: string; pod: string; targets: Targets }) => Promise<{ ok: boolean; error?: string }>;
  updateTargets: (emailKey: string, targets: Targets) => Promise<void>;
}

const Ctx = createContext<TeamDataValue | null>(null);

export function useTeamData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTeamData must be used within TeamDataProvider");
  return ctx;
}

function makeMember(opts: {
  id: string; name: string; email: string; status: MemberStatus; cfg?: TeamKpiConfig[string]; series: DayRec[];
}): Member {
  const role = opts.cfg?.role || "SDR";
  const pod = opts.cfg?.pod || "Enterprise";
  const targets = opts.cfg?.targets || ROLE_TARGETS[role] || ROLE_TARGETS.SDR;
  return {
    id: opts.id, name: opts.name, email: opts.email, role, pod,
    status: opts.status, targets: { ...targets }, series: opts.series,
  };
}

export function TeamDataProvider({ children }: { children: React.ReactNode }) {
  const isAuthReady = useAuthReady();
  const [members, setMembers] = useState<Member[]>([]);
  const [seatUsage, setSeatUsage] = useState({ used: 0, included: 1 });
  const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPARTMENTS);
  const [cardIds, setCardIds] = useState<string[]>(DEFAULT_CARD_IDS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [team, invites, cfg, analytics, depts, cards] = await Promise.all([
        getTeamMembers(),
        getPendingInvitations().catch(() => []),
        getTeamKpiConfig().catch(() => ({} as TeamKpiConfig)),
        getTeamAnalytics().catch(() => ({ members: [] as { id: string; series: TeamAnalyticsDay[] }[] })),
        getDepartments().catch(() => DEFAULT_DEPARTMENTS),
        getAnalyticsCards().catch(() => [] as string[]),
      ]);
      setDepartments(depts.length ? depts : DEFAULT_DEPARTMENTS);
      const clean = sanitizeCardIds(cards);
      setCardIds(clean.length ? clean : DEFAULT_CARD_IDS);
      const byEmail = (e: string) => cfg[(e || "").toLowerCase()];
      // Real activity series keyed by member id.
      const seriesById = new Map(analytics.members.map((a) => [a.id, hydrateSeries(a.series)]));

      const real = team.members.map((m) =>
        makeMember({
          id: m.id,
          name: [m.firstName, m.lastName].filter(Boolean).join(" ").trim() || m.email,
          email: m.email,
          status: "active",
          cfg: byEmail(m.email),
          series: seriesById.get(m.id) ?? emptySeries(),
        }),
      );
      const memberEmails = new Set(team.members.map((m) => m.email.toLowerCase()));
      const pending = invites
        .filter((inv) => !memberEmails.has((inv.emailAddress || "").toLowerCase()))
        .map((inv) =>
          makeMember({
            id: "pending_" + inv.id,
            name: inv.emailAddress,
            email: inv.emailAddress,
            status: "pending",
            cfg: byEmail(inv.emailAddress),
            series: emptySeries(),
          }),
        );

      setMembers([...real, ...pending]);
      setSeatUsage(team.seatUsage);
    } catch {
      // leave previous state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    void refresh();
  }, [isAuthReady, refresh]);

  const addMember = useCallback(
    async (data: { name: string; email: string; role: string; pod: string; targets: Targets }) => {
      if (!data.email.trim()) return { ok: false, error: "A work email is required to invite." };
      try {
        const [firstName, ...rest] = (data.name || "").trim().split(/\s+/).filter(Boolean);
        await inviteTeamMember(data.email.trim(), "org:member", firstName || undefined, rest.join(" ") || undefined);
        await saveTeamKpiConfig({ key: data.email.trim(), role: data.role, pod: data.pod, targets: data.targets });
        await refresh();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Failed to invite member." };
      }
    },
    [refresh],
  );

  const updateTargets = useCallback(
    async (emailKey: string, targets: Targets) => {
      // Optimistic local update.
      setMembers((prev) => prev.map((m) => ((m.email || "").toLowerCase() === emailKey.toLowerCase() ? { ...m, targets } : m)));
      await saveTeamKpiConfig({ key: emailKey, targets }).catch(() => {});
    },
    [],
  );

  const saveCards = useCallback(async (ids: string[]) => {
    const clean = sanitizeCardIds(ids);
    setCardIds(clean.length ? clean : DEFAULT_CARD_IDS); // optimistic
    await saveAnalyticsCards(clean).catch(() => {});
  }, []);

  const activeMembers = members.filter((m) => m.status !== "pending");

  return (
    <Ctx.Provider value={{ members, activeMembers, seatUsage, departments, loading, cardIds, saveCards, refresh, addMember, updateTargets }}>
      {children}
    </Ctx.Provider>
  );
}
