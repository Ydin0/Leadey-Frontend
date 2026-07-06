"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Shield, Trash2, X } from "lucide-react";
import { Modal, ModalHeader } from "@/components/email/modal";
import { qk } from "@/lib/queries/keys";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import {
  getOrgRoles,
  createOrgRole,
  updateOrgRole,
  deleteOrgRole,
  updateMemberPermissions,
  type RoleDescriptor,
} from "@/lib/api/team-roles";
import {
  BUILTIN_ROLES,
  builtinRoleDefaults,
  mergePermissions,
  BUILTIN_ROLE_KEYS,
  BUILTIN_ROLE_LABELS,
  type PermissionMap,
  type ResolvedPermissions,
} from "@/lib/types/permissions";
import { PermissionMatrix } from "./permission-matrix";
import type { TeamMember } from "@/lib/types/team";

function useRoles() {
  const isAuthReady = useAuthReady();
  return useQuery({ queryKey: qk.orgRoles, queryFn: getOrgRoles, enabled: isAuthReady, staleTime: 60_000 });
}

/** Resolve a role key/id → its base permission map (built-in or custom). */
function baseForRole(appRole: string, roles?: { custom: RoleDescriptor[] }): ResolvedPermissions {
  if (appRole.startsWith("role_")) {
    const custom = roles?.custom.find((r) => r.id === appRole);
    return mergePermissions(BUILTIN_ROLES.member, (custom?.permissions ?? {}) as PermissionMap);
  }
  return builtinRoleDefaults(appRole);
}

// ── Per-member permissions editor ──────────────────────────────────
export function MemberPermissionsModal({
  member,
  onClose,
  onSaved,
}: {
  member: TeamMember;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: roles } = useRoles();
  const isAdminMember = member.role === "org:admin";
  const [appRole, setAppRole] = useState(member.appRole || "member");
  // Effective values shown = role base merged with current overrides.
  const [overrides, setOverrides] = useState<PermissionMap>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = useMemo(() => baseForRole(appRole, roles), [appRole, roles]);
  const effective = useMemo(() => mergePermissions(base, overrides), [base, overrides]);

  function setKey(key: string, value: boolean | string) {
    setOverrides((prev) => {
      const next = { ...prev };
      // If setting back to the role's base value, drop the override.
      if (base[key] === value) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateMemberPermissions(member.id, {
        appRole,
        overrides: Object.keys(overrides).length > 0 ? overrides : null,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save permissions");
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth={560}>
      <ModalHeader
        title="Permissions"
        subtitle={member.firstName || member.lastName ? `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() : member.email}
        onClose={onClose}
      />
      <div className="p-5 max-h-[70vh] overflow-y-auto">
        {isAdminMember ? (
          <div className="flex items-start gap-2 rounded-[10px] bg-signal-blue/10 border border-signal-blue-text/20 px-3 py-2.5 mb-4">
            <Shield size={14} className="text-signal-blue-text shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-ink-secondary leading-snug">
              This member is an <strong>Admin</strong> (organization owner) and always has full access.
              Change their role to Member first to apply granular permissions.
            </p>
          </div>
        ) : (
          <>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Role</label>
            <select
              value={appRole}
              onChange={(e) => { setAppRole(e.target.value); setOverrides({}); }}
              className="w-full px-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[13px] text-ink mb-4"
            >
              <optgroup label="Built-in">
                {BUILTIN_ROLE_KEYS.filter((k) => k !== "admin").map((k) => (
                  <option key={k} value={k}>{BUILTIN_ROLE_LABELS[k]}</option>
                ))}
              </optgroup>
              {roles && roles.custom.length > 0 && (
                <optgroup label="Custom">
                  {roles.custom.map((r) => <option key={r.id} value={r.id!}>{r.name}</option>)}
                </optgroup>
              )}
            </select>
            <p className="text-[11px] text-ink-muted mb-3">
              Fine-tune below — anything you change from the role default is saved as a personal override
              (marked <span className="text-signal-amber-text font-medium">Custom</span>).
            </p>
            <PermissionMatrix values={effective} baseline={base} onChange={setKey} />
          </>
        )}
        {error && <p className="text-[11px] text-signal-red-text mt-3">{error}</p>}
      </div>
      {!isAdminMember && (
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-subtle">
          <button onClick={onClose} className="px-4 py-2 rounded-full bg-section text-ink-secondary text-[12px] font-medium hover:bg-hover">Cancel</button>
          <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-on-ink text-[12px] font-medium hover:opacity-90 disabled:opacity-40">
            {saving && <Loader2 size={13} className="animate-spin" />} Save permissions
          </button>
        </div>
      )}
    </Modal>
  );
}

// ── Custom roles management card ────────────────────────────────────
export function RolesCard() {
  const { data: roles, isLoading } = useRoles();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<RoleDescriptor | "new" | null>(null);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: qk.orgRoles });
    void qc.invalidateQueries({ queryKey: qk.mePermissions });
  };

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[14px] font-semibold text-ink">Roles</h3>
          <p className="text-[11px] text-ink-muted mt-0.5">Presets you can assign to members. Create custom roles for your own permission sets.</p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90"
        >
          <Plus size={12} /> New role
        </button>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-[12px] text-ink-muted py-3"><Loader2 size={13} className="animate-spin" /> Loading roles…</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {roles?.builtins.map((r) => (
            <RoleRow key={r.key} role={r} builtin onView={() => setEditing(r)} />
          ))}
          {roles?.custom.map((r) => (
            <RoleRow key={r.id} role={r} onView={() => setEditing(r)} onDeleted={refresh} />
          ))}
        </div>
      )}
      {editing && (
        <RoleEditorModal
          role={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function RoleRow({ role, builtin, onView, onDeleted }: {
  role: RoleDescriptor; builtin?: boolean; onView: () => void; onDeleted?: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  async function del() {
    setDeleting(true);
    try { await deleteOrgRole(role.id!); onDeleted?.(); } finally { setDeleting(false); setConfirm(false); }
  }
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-[8px] bg-section/40 border border-border-subtle">
      <div className="flex items-center gap-2 min-w-0">
        <Shield size={13} className={builtin ? "text-ink-muted" : "text-accent"} />
        <span className="text-[12px] font-medium text-ink truncate">{role.name}</span>
        {builtin && <span className="text-[9px] font-medium rounded-full px-1.5 py-px bg-section text-ink-muted uppercase tracking-wide">Built-in</span>}
        <span className="text-[10.5px] text-ink-faint">{role.memberCount} member{role.memberCount === 1 ? "" : "s"}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={onView} className="px-2.5 py-1 rounded-full text-[11px] font-medium text-ink-secondary hover:bg-hover">
          {builtin ? "View" : "Edit"}
        </button>
        {!builtin && (
          confirm ? (
            <span className="flex items-center gap-1">
              <button onClick={() => void del()} disabled={deleting} className="px-2 py-0.5 rounded-full bg-signal-red-text text-on-ink text-[10px] font-medium disabled:opacity-50">
                {deleting ? <Loader2 size={9} className="animate-spin" /> : "Delete"}
              </button>
              <button onClick={() => setConfirm(false)} className="text-ink-muted"><X size={12} /></button>
            </span>
          ) : (
            <button onClick={() => setConfirm(true)} title="Delete role" className="p-1 rounded-md text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10">
              <Trash2 size={12} />
            </button>
          )
        )}
      </div>
    </div>
  );
}

function RoleEditorModal({ role, onClose, onSaved }: {
  role: RoleDescriptor | null; onClose: () => void; onSaved: () => void;
}) {
  const builtin = !!role?.key;
  const [name, setName] = useState(role?.name ?? "");
  const [values, setValues] = useState<ResolvedPermissions>(
    () => mergePermissions(BUILTIN_ROLES.member, (role?.permissions ?? {}) as PermissionMap),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      if (role?.id) await updateOrgRole(role.id, { name: name.trim(), permissions: values });
      else await createOrgRole({ name: name.trim(), permissions: values });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save role");
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth={560}>
      <ModalHeader title={builtin ? `${role?.name} (built-in)` : role ? "Edit role" : "New role"} onClose={onClose} />
      <div className="p-5 max-h-[70vh] overflow-y-auto">
        {!builtin && (
          <>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Role name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="e.g. SDR, Team Lead"
              className="w-full px-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[13px] text-ink mb-4"
            />
          </>
        )}
        {builtin && <p className="text-[11px] text-ink-muted mb-4">Built-in roles can&apos;t be edited — this is a read-only preview. Create a custom role to define your own.</p>}
        <PermissionMatrix values={values} disabled={builtin} onChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))} />
        {error && <p className="text-[11px] text-signal-red-text mt-3">{error}</p>}
      </div>
      {!builtin && (
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-subtle">
          <button onClick={onClose} className="px-4 py-2 rounded-full bg-section text-ink-secondary text-[12px] font-medium hover:bg-hover">Cancel</button>
          <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-on-ink text-[12px] font-medium hover:opacity-90 disabled:opacity-40">
            {saving && <Loader2 size={13} className="animate-spin" />} Save role
          </button>
        </div>
      )}
    </Modal>
  );
}
