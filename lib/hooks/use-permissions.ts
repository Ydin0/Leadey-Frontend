"use client";

import { useState, useEffect } from "react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { apiRequest } from "@/lib/api/client";

interface Permissions {
  role: string;
  isAdmin: boolean;
  isManager: boolean;
  canCreateFunnels: boolean;
  canCreateScrapers: boolean;
  canManageBilling: boolean;
  canManageTeam: boolean;
  canRunScrapers: boolean;
  canEnrich: boolean;
  canCall: boolean;
  canManageTemplates: boolean;
  loaded: boolean;
}

const DEFAULT: Permissions = {
  role: "rep",
  isAdmin: false,
  isManager: false,
  canCreateFunnels: false,
  canCreateScrapers: false,
  canManageBilling: false,
  canManageTeam: false,
  canRunScrapers: true,
  canEnrich: true,
  canCall: true,
  canManageTemplates: false,
  loaded: false,
};

export function usePermissions(): Permissions {
  const isAuthReady = useAuthReady();
  const [perms, setPerms] = useState<Permissions>(DEFAULT);

  useEffect(() => {
    if (!isAuthReady) return;
    apiRequest<{ role: string }>("/team/me")
      .then((data) => {
        const role = data.role;
        const isAdmin = role === "admin" || role === "org:admin";
        const isManager = role === "manager" || isAdmin;

        setPerms({
          role,
          isAdmin,
          isManager,
          canCreateFunnels: isAdmin || isManager,
          canCreateScrapers: isAdmin || isManager,
          canManageBilling: isAdmin,
          canManageTeam: isAdmin,
          canRunScrapers: role !== "viewer",
          canEnrich: role !== "viewer",
          canCall: role !== "viewer",
          canManageTemplates: isAdmin || isManager,
          loaded: true,
        });
      })
      .catch(() => {
        // Default to admin for now if endpoint fails (backwards compat)
        setPerms({ ...DEFAULT, isAdmin: true, isManager: true, canCreateFunnels: true, canCreateScrapers: true, canManageBilling: true, canManageTeam: true, canManageTemplates: true, loaded: true });
      });
  }, [isAuthReady]);

  return perms;
}
