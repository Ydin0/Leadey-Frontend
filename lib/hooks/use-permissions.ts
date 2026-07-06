"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { apiRequest } from "@/lib/api/client";
import { qk } from "@/lib/queries/keys";
import {
  builtinRoleDefaults,
  mergePermissions,
  hasPerm as hasPermFn,
  scopeOf as scopeOfFn,
  NO_PERMISSIONS,
  type ResolvedPermissions,
} from "@/lib/types/permissions";

interface MeResponse {
  role?: string;
  appRole?: string;
  isOrgAdmin?: boolean;
  permissions?: ResolvedPermissions | null;
}

export interface Permissions {
  loaded: boolean;
  isOrgAdmin: boolean;
  appRole: string;
  permissions: ResolvedPermissions;
  /** True if the caller has the boolean capability "module.key". */
  has: (key: string) => boolean;
  /** The scope string for a "module.view"-style key ("all"|"assigned"|…). */
  scopeOf: (key: string) => string;
}

/**
 * The caller's effective permissions. Server-side is authoritative; this hook
 * drives UI gating only. Fail CLOSED: on error we resolve to NO_PERMISSIONS
 * (never admin), and consumers should render nothing sensitive until `loaded`.
 * Deploy-safety: if the backend is old and omits `permissions`, synthesize
 * from `role` so the UI degrades to sane defaults rather than locking out.
 */
export function usePermissions(): Permissions {
  const isAuthReady = useAuthReady();
  const { data, isSuccess, isError } = useQuery({
    queryKey: qk.mePermissions,
    queryFn: () => apiRequest<MeResponse>("/team/me"),
    staleTime: 30_000,
    enabled: isAuthReady,
  });

  let permissions: ResolvedPermissions = NO_PERMISSIONS;
  let isOrgAdmin = false;
  let appRole = "member";

  if (data) {
    isOrgAdmin = !!data.isOrgAdmin;
    appRole = data.appRole || "member";
    if (data.permissions) {
      permissions = data.permissions;
    } else if (data.role) {
      // Old backend: derive from the coarse role.
      const key = data.role === "admin" || data.role === "org:admin" ? "admin" : "member";
      permissions = mergePermissions(builtinRoleDefaults(key), null);
    }
  } else if (isError) {
    permissions = NO_PERMISSIONS;
  }

  const has = useCallback((key: string) => hasPermFn(permissions, key), [permissions]);
  const scopeOf = useCallback((key: string) => scopeOfFn(permissions, key), [permissions]);

  return {
    loaded: isSuccess || isError,
    isOrgAdmin,
    appRole,
    permissions,
    has,
    scopeOf,
  };
}
