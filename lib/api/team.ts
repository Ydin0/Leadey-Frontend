import { apiRequest } from "./client";
import type { TeamMember, PendingInvitation, SeatUsage } from "@/lib/types/team";

export async function getTeamMembers(): Promise<{ members: TeamMember[]; seatUsage: SeatUsage }> {
  return apiRequest<{ members: TeamMember[]; seatUsage: SeatUsage }>("/team");
}

/** A department (formerly "pod") — an org-defined grouping of reps. */
export interface Department {
  name: string;
  color: string;
}

export async function getDepartments(): Promise<Department[]> {
  return apiRequest<Department[]>("/team/departments");
}

export async function saveDepartments(departments: Department[]): Promise<Department[]> {
  return apiRequest<Department[]>("/team/departments", {
    method: "PUT",
    body: JSON.stringify({ departments }),
  });
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

/** Real daily activity series per member. Calls, talk time, emails, SMS +
 *  meetings are live and split by inbound/outbound; LinkedIn is 0 for now. */
export interface TeamAnalyticsDay {
  date: string;
  calls: number;
  callsInbound?: number;
  callsOutbound?: number;
  /** Calls a person picked up (talk time > 0, not voicemail). */
  connectedCalls: number;
  /** Calls that reached voicemail. */
  voicemailCalls: number;
  /** Total time on calls that day, in seconds (sum of call_records.duration). */
  talkTime: number;
  talkTimeInbound?: number;
  talkTimeOutbound?: number;
  emails: number;
  emailsInbound?: number;
  emailsOutbound?: number;
  sms: number;
  smsInbound?: number;
  smsOutbound?: number;
  linkedin: number;
  meetings: number;
  /** Meetings booked through the Leadey booking flow, credited to this rep. */
  meetingsBooked?: number;
  /** Sit outcomes on meetings this rep booked (dispositioned attended/no-show). */
  meetingsAttended?: number;
  meetingsNoShow?: number;
  replies: number;
}
export async function getTeamAnalytics(): Promise<{
  members: { id: string; series: TeamAnalyticsDay[] }[];
}> {
  return apiRequest("/team/analytics");
}

export async function saveTeamKpiConfig(
  entry: { key: string } & TeamKpiEntry,
): Promise<TeamKpiConfig> {
  return apiRequest<TeamKpiConfig>("/team/kpi-config", {
    method: "PUT",
    body: JSON.stringify(entry),
  });
}

/** Org-wide Team-analytics stat-card layout (ordered card ids). Empty = the
 *  client falls back to DEFAULT_CARD_IDS. */
export async function getAnalyticsCards(): Promise<string[]> {
  const res = await apiRequest<{ cards: string[] }>("/team/analytics-cards");
  return res.cards;
}

export async function saveAnalyticsCards(cards: string[]): Promise<string[]> {
  const res = await apiRequest<{ cards: string[] }>("/team/analytics-cards", {
    method: "PUT",
    body: JSON.stringify({ cards }),
  });
  return res.cards;
}

/** Org-wide leaderboard column layout ({ order, hidden }); null = client default. */
export interface LeaderboardColumnPrefs { order: string[]; hidden: string[] }
export async function getLeaderboardColumns(): Promise<LeaderboardColumnPrefs | null> {
  const res = await apiRequest<{ prefs: LeaderboardColumnPrefs | null }>("/team/leaderboard-columns");
  return res.prefs;
}
export async function saveLeaderboardColumns(prefs: LeaderboardColumnPrefs): Promise<LeaderboardColumnPrefs> {
  const res = await apiRequest<{ prefs: LeaderboardColumnPrefs }>("/team/leaderboard-columns", {
    method: "PUT",
    body: JSON.stringify(prefs),
  });
  return res.prefs;
}

export async function inviteTeamMember(
  email: string,
  role: string,
  firstName?: string,
  lastName?: string,
): Promise<PendingInvitation> {
  return apiRequest<PendingInvitation>("/team/invite", {
    method: "POST",
    body: JSON.stringify({ email, role, firstName, lastName }),
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

export async function updateMember(
  userId: string,
  updates: { firstName?: string; lastName?: string },
): Promise<{ id: string; firstName: string | null; lastName: string | null }> {
  return apiRequest(`/team/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export interface RemovalSummary {
  tasks: number;
  opportunities: number;
  leads: number;
  phoneNumbers: number;
}

/** Counts of a member's active work, for the Remove-User reassignment modal. */
export async function getRemovalSummary(userId: string): Promise<RemovalSummary> {
  return apiRequest<RemovalSummary>(`/team/${userId}/removal-summary`);
}

/** Target userIds to hand each category of the leaving member's work to.
 *  Omit or leave a key empty to NOT reassign that category. */
export interface ReassignTargets {
  tasks?: string;
  opportunities?: string;
  leads?: string;
  phoneNumbers?: string;
}

export async function removeMember(userId: string, reassign?: ReassignTargets): Promise<void> {
  const body = reassign && Object.values(reassign).some(Boolean) ? { reassign } : undefined;
  await apiRequest(`/team/${userId}`, { method: "DELETE", ...(body ? { body: JSON.stringify(body) } : {}) });
}
