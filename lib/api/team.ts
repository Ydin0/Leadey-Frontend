import { apiRequest } from "./client";
import type { TeamMember, PendingInvitation, SeatUsage } from "@/lib/types/team";

export async function getTeamMembers(): Promise<{ members: TeamMember[]; seatUsage: SeatUsage }> {
  return apiRequest<{ members: TeamMember[]; seatUsage: SeatUsage }>("/team");
}

/** Per-member sales role / pod / daily KPI targets, keyed by lowercased email. */
export interface TeamKpiEntry {
  role?: string;
  pod?: string;
  targets?: { calls: number; emails: number; sms: number; linkedin: number };
}
export type TeamKpiConfig = Record<string, TeamKpiEntry>;

export async function getTeamKpiConfig(): Promise<TeamKpiConfig> {
  return apiRequest<TeamKpiConfig>("/team/kpi-config");
}

export async function saveTeamKpiConfig(
  entry: { key: string } & TeamKpiEntry,
): Promise<TeamKpiConfig> {
  return apiRequest<TeamKpiConfig>("/team/kpi-config", {
    method: "PUT",
    body: JSON.stringify(entry),
  });
}

export async function inviteTeamMember(
  email: string,
  role: string,
): Promise<PendingInvitation> {
  return apiRequest<PendingInvitation>("/team/invite", {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export async function getPendingInvitations(): Promise<PendingInvitation[]> {
  return apiRequest<PendingInvitation[]>("/team/invitations");
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  await apiRequest(`/team/invitations/${invitationId}`, { method: "DELETE" });
}

export async function updateMemberRole(userId: string, role: string): Promise<{ id: string; role: string }> {
  return apiRequest<{ id: string; role: string }>(`/team/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function removeMember(userId: string): Promise<void> {
  await apiRequest(`/team/${userId}`, { method: "DELETE" });
}
