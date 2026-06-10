import { apiRequest } from "./client";

export interface HiringRole {
  id: string;
  funnelId: string;
  leadId: string;
  title: string;
  description: string;
  salaryRange: string;
  location: string;
  postedAgo: string;
  seniority: string;
  url: string;
  createdAt: string;
}

export type HiringRoleInput = Partial<Omit<HiringRole, "id" | "funnelId" | "leadId" | "createdAt">> & {
  title: string;
};

export async function getHiringRoles(funnelId: string, leadId: string): Promise<HiringRole[]> {
  return apiRequest<HiringRole[]>(`/funnels/${funnelId}/leads/${leadId}/hiring-roles`);
}

export async function createHiringRole(
  funnelId: string,
  leadId: string,
  data: HiringRoleInput,
): Promise<HiringRole> {
  return apiRequest<HiringRole>(`/funnels/${funnelId}/leads/${leadId}/hiring-roles`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateHiringRole(
  id: string,
  data: Partial<HiringRoleInput>,
): Promise<HiringRole> {
  return apiRequest<HiringRole>(`/hiring-roles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteHiringRole(id: string): Promise<void> {
  await apiRequest(`/hiring-roles/${id}`, { method: "DELETE" });
}
