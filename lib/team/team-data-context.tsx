"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import {
  getTeamMembers, getPendingInvitations, inviteTeamMember,
  getTeamKpiConfig, saveTeamKpiConfig, type TeamKpiConfig,
} from "@/lib/api/team";
import {
  ROLE_TARGETS, buildSeries, hashFloat, DAYS, TODAY,
  type Member, type Targets, type DayRec, type MemberStatus,
} from "./team-data";

interface TeamDataValue {
  members: Member[];        // includes pending invites (for the roster)
  activeMembers: Member[];  // excludes pending (for analytics/leaderboard)
  seatUsage: { used: number; included: number };
  loading: boolean;
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

const DAY_MS = 86400000;
function zeroSeries(): DayRec[] {
  return Array.from({ length: DAYS }, (_, i) => {
    const date = new Date(TODAY.getTime() - (DAYS - 1 - i) * DAY_MS);
    return { date, ts: date.getTime(), calls: 0, emails: 0, sms: 0, linkedin: 0, meetings: 0, replies: 0, total: 0 };
  });
}

function makeMember(opts: {
  id: string; name: string; email: string; status: MemberStatus; cfg?: TeamKpiConfig[string];
}): Member {
  const role = opts.cfg?.role || "SDR";
  const pod = opts.cfg?.pod || "Enterprise";
  const targets = opts.cfg?.targets || ROLE_TARGETS[role] || ROLE_TARGETS.SDR;
  const member: Member = {
    id: opts.id, name: opts.name, email: opts.email, role, pod,
    perf: opts.status === "pending" ? 0 : hashFloat(opts.email || opts.id, 0.72, 1.24),
    ramp: false, status: opts.status, targets: { ...targets }, series: [],
  };
  member.series = opts.status === "pending" ? zeroSeries() : buildSeries(member);
  return member;
}

export function TeamDataProvider({ children }: { children: React.ReactNode }) {
  const isAuthReady = useAuthReady();
  const [members, setMembers] = useState<Member[]>([]);
  const [seatUsage, setSeatUsage] = useState({ used: 0, included: 1 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [team, invites, cfg] = await Promise.all([
        getTeamMembers(),
        getPendingInvitations().catch(() => []),
        getTeamKpiConfig().catch(() => ({} as TeamKpiConfig)),
      ]);
      const byEmail = (e: string) => cfg[(e || "").toLowerCase()];

      const real = team.members.map((m) =>
        makeMember({
          id: m.id,
          name: [m.firstName, m.lastName].filter(Boolean).join(" ").trim() || m.email,
          email: m.email,
          status: "active",
          cfg: byEmail(m.email),
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
        await inviteTeamMember(data.email.trim(), "org:member");
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

  const activeMembers = members.filter((m) => m.status !== "pending");

  return (
    <Ctx.Provider value={{ members, activeMembers, seatUsage, loading, refresh, addMember, updateTargets }}>
      {children}
    </Ctx.Provider>
  );
}
