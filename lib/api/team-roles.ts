import { apiRequest } from "./client";
import type { ResolvedPermissions, PermissionMap } from "@/lib/types/permissions";

export interface RoleDescriptor {
  /** Built-in role key ("admin"|"manager"|"member"|"viewer") or custom id. */
  key?: string;
  id?: string;
  name: string;
  description?: string | null;
  permissions: ResolvedPermissions | PermissionMap;
  memberCount: number;
}

export interface RolesPayload {
  builtins: RoleDescriptor[];
  custom: RoleDescriptor[];
}

export async function getOrgRoles(): Promise<RolesPayload> {
  return apiRequest<RolesPayload>("/team/roles");
}

export async function createOrgRole(data: {
  name: string;
  description?: string;
  permissions: PermissionMap;
}): Promise<{ id: string; name: string }> {
  return apiRequest("/team/roles", { method: "POST", body: JSON.stringify(data) });
}

export async function updateOrgRole(
  roleId: string,
  data: { name?: string; description?: string; permissions?: PermissionMap },
): Promise<{ id: string; ok: boolean }> {
  return apiRequest(`/team/roles/${encodeURIComponent(roleId)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteOrgRole(roleId: string): Promise<{ id: string; deleted: boolean; reassignedCount: number }> {
  return apiRequest(`/team/roles/${encodeURIComponent(roleId)}`, { method: "DELETE" });
}

/** Set a member's granular app-role and/or sparse overrides. */
export async function updateMemberPermissions(
  userId: string,
  data: { appRole?: string; overrides?: PermissionMap | null },
): Promise<{ id: string; ok: boolean }> {
  return apiRequest(`/team/${encodeURIComponent(userId)}/permissions`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
