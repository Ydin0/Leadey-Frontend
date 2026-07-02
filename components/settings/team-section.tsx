"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Mail, Loader2, X, ChevronDown, UserPlus, Clock, Trash2, AlertTriangle, Pencil } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { NativeSelect } from "@/components/ui/native-select";
import { Modal, ModalHeader } from "@/components/email/modal";
import { MemberAvatar } from "@/components/shared/member-avatar";
import {
  getTeamMembers,
  inviteTeamMember,
  getPendingInvitations,
  revokeInvitation,
  updateMemberRole,
  updateMember,
  removeMember,
  getDepartments,
  getTeamKpiConfig,
  saveTeamKpiConfig,
  type Department,
} from "@/lib/api/team";
import { DepartmentsManager } from "./departments-manager";
import type { TeamMember, PendingInvitation, SeatUsage } from "@/lib/types/team";

const ROLES = [
  { value: "org:admin", label: "Admin" },
  { value: "org:member", label: "Member" },
];

function roleLabel(role: string): string {
  if (role === "org:admin") return "Admin";
  if (role === "org:member") return "Member";
  return role.replace("org:", "");
}

function memberName(m: TeamMember): string {
  if (m.firstName || m.lastName) return `${m.firstName || ""} ${m.lastName || ""}`.trim();
  return m.email;
}

export function TeamSection() {
  const isAuthReady = useAuthReady();
  const { user } = useUser();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [seatUsage, setSeatUsage] = useState<SeatUsage>({ used: 0, included: 1 });
  const [departments, setDepartments] = useState<Department[]>([]);
  // member email (lowercased) → assigned department name
  const [deptByEmail, setDeptByEmail] = useState<Record<string, string>>({});
  const [savingDept, setSavingDept] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteRole, setInviteRole] = useState("org:member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Role change
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [showRoleMenu, setShowRoleMenu] = useState<string | null>(null);

  // Remove
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Edit member
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function openEdit(member: TeamMember) {
    setEditMember(member);
    setEditFirstName(member.firstName || "");
    setEditLastName(member.lastName || "");
    setEditError(null);
  }

  async function handleSaveEdit() {
    if (!editMember) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const updated = await updateMember(editMember.id, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
      });
      setMembers((prev) =>
        prev.map((m) =>
          m.id === editMember.id
            ? { ...m, firstName: updated.firstName, lastName: updated.lastName }
            : m,
        ),
      );
      setEditMember(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSavingEdit(false);
    }
  }

  const loadData = useCallback(async () => {
    try {
      const [teamData, invData, depts, kpi] = await Promise.all([
        getTeamMembers(),
        getPendingInvitations(),
        getDepartments().catch(() => [] as Department[]),
        getTeamKpiConfig().catch(() => ({})),
      ]);
      setMembers(teamData.members);
      setSeatUsage(teamData.seatUsage);
      setInvitations(invData);
      setDepartments(depts);
      const map: Record<string, string> = {};
      for (const [email, cfg] of Object.entries(kpi)) {
        const pod = (cfg as { pod?: string })?.pod;
        if (pod) map[email.toLowerCase()] = pod;
      }
      setDeptByEmail(map);
    } catch (err) {
      console.error("Failed to load team:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleDeptChange(email: string, department: string) {
    const key = email.toLowerCase();
    setSavingDept(key);
    const prev = deptByEmail[key];
    setDeptByEmail((m) => ({ ...m, [key]: department }));
    try {
      await saveTeamKpiConfig({ key: email, pod: department });
    } catch {
      setDeptByEmail((m) => ({ ...m, [key]: prev || "" }));
    } finally {
      setSavingDept(null);
    }
  }

  useEffect(() => {
    if (!isAuthReady) return;
    loadData();
  }, [isAuthReady, loadData]);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);
    try {
      await inviteTeamMember(
        inviteEmail.trim(),
        inviteRole,
        inviteFirstName.trim() || undefined,
        inviteLastName.trim() || undefined,
      );
      setInviteEmail("");
      setInviteFirstName("");
      setInviteLastName("");
      setShowInviteModal(false);
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
      await loadData();
    } catch (err: any) {
      setInviteError(err.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  }

  async function handleRevoke(invId: string) {
    try {
      await revokeInvitation(invId);
      setInvitations((prev) => prev.filter((i) => i.id !== invId));
    } catch (err) {
      console.error("Failed to revoke:", err);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setChangingRole(userId);
    setShowRoleMenu(null);
    try {
      await updateMemberRole(userId, newRole);
      setMembers((prev) => prev.map((m) => m.id === userId ? { ...m, role: newRole } : m));
    } catch (err) {
      console.error("Failed to update role:", err);
    } finally {
      setChangingRole(null);
    }
  }

  async function handleRemove(userId: string) {
    setRemoving(userId);
    setRemoveError(null);
    try {
      await removeMember(userId);
      setMembers((prev) => prev.filter((m) => m.id !== userId));
      setSeatUsage((prev) => ({ ...prev, used: Math.max(0, prev.used - 1) }));
      setConfirmRemove(null);
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemoving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  const seatsFull = seatUsage.used >= seatUsage.included;
  const seatPercent = Math.round((seatUsage.used / seatUsage.included) * 100);

  return (
    <div className="space-y-6">
      {/* Seat Usage */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[14px] font-semibold text-ink">Seat Usage</h3>
          <span className="text-[12px] font-medium text-ink">
            {seatUsage.used} / {seatUsage.included} seats used
          </span>
        </div>
        <div className="h-2 rounded-full bg-section overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", seatsFull ? "bg-signal-red-text" : "bg-signal-blue-text")}
            style={{ width: `${Math.min(100, seatPercent)}%` }}
          />
        </div>
        {seatsFull && (
          <p className="text-[11px] text-signal-red-text mt-2">
            All seats are in use. Upgrade your plan to add more team members.
          </p>
        )}
      </div>

      {/* Invite success banner (the form now lives in a modal) */}
      {inviteSuccess && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[12px] bg-signal-green/10 border border-signal-green-text/20">
          <Mail size={14} className="text-signal-green-text shrink-0" />
          <span className="text-[12px] text-ink-secondary">Invitation sent successfully!</span>
        </div>
      )}

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
          <h3 className="text-[14px] font-semibold text-ink mb-3">Pending Invitations</h3>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 px-3 rounded-[8px] bg-section/50 border border-border-subtle">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-signal-slate/30 flex items-center justify-center">
                    <Clock size={12} className="text-ink-muted" />
                  </div>
                  <div>
                    <span className="text-[12px] text-ink">{inv.emailAddress}</span>
                    <span className="text-[10px] text-ink-faint ml-2">{roleLabel(inv.role)}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(inv.id)}
                  className="text-[10px] text-ink-muted hover:text-signal-red-text transition-colors"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Departments */}
      <DepartmentsManager onSaved={setDepartments} />

      {/* Active Members */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold text-ink">Team Members</h3>
          <button
            onClick={() => { setInviteError(null); setInviteSuccess(false); setShowInviteModal(true); }}
            disabled={seatsFull}
            title={seatsFull ? "All seats are in use — upgrade to add more members" : "Add a team member"}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus size={12} /> Add member
          </button>
        </div>
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-2.5 px-3 rounded-[8px] hover:bg-hover/30 transition-colors">
              <div className="flex items-center gap-3">
                <MemberAvatar id={member.id} name={memberName(member)} size="md" />
                <div>
                  <p className="text-[12px] font-medium text-ink">{memberName(member)}</p>
                  <p className="text-[11px] text-ink-muted">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Department dropdown — NativeSelect renders its own chevron,
                    so no overlay icon here (it doubled up). */}
                {departments.length > 0 && (
                  <NativeSelect
                    value={deptByEmail[(member.email || "").toLowerCase()] || ""}
                    onChange={(e) => handleDeptChange(member.email, e.target.value)}
                    disabled={savingDept === (member.email || "").toLowerCase()}
                    className="w-auto pl-2.5 pr-8 py-1 rounded-[8px] text-[11px] font-medium text-ink-secondary hover:bg-hover"
                    title="Department"
                  >
                    <option value="">No department</option>
                    {departments.map((d) => (
                      <option key={d.name} value={d.name}>{d.name}</option>
                    ))}
                  </NativeSelect>
                )}

                {/* Role dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowRoleMenu(showRoleMenu === member.id ? null : member.id)}
                    disabled={changingRole === member.id}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[11px] font-medium bg-section border border-border-subtle text-ink-secondary hover:bg-hover transition-colors disabled:opacity-50"
                  >
                    {changingRole === member.id ? <Loader2 size={10} className="animate-spin" /> : roleLabel(member.role)}
                    <ChevronDown size={10} />
                  </button>
                  {showRoleMenu === member.id && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-surface rounded-[8px] border border-border-subtle shadow-lg z-20 py-1">
                      {ROLES.map((r) => (
                        <button
                          key={r.value}
                          onClick={() => handleRoleChange(member.id, r.value)}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-[11px] hover:bg-hover transition-colors",
                            member.role === r.value ? "font-medium text-ink" : "text-ink-secondary"
                          )}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Edit */}
                <button
                  onClick={() => openEdit(member)}
                  className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-hover transition-colors"
                  title="Edit member"
                >
                  <Pencil size={12} />
                </button>

                {/* Remove */}
                {member.id === user?.id ? (
                  <span
                    className="p-1.5 rounded-md text-ink-faint/40 cursor-not-allowed"
                    title="You can't remove yourself"
                  >
                    <Trash2 size={12} />
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setRemoveError(null);
                      setConfirmRemove(member);
                    }}
                    className="p-1.5 rounded-md text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10 transition-colors"
                    title="Remove member"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite member modal */}
      {showInviteModal && (
        <Modal onClose={() => (inviting ? null : setShowInviteModal(false))} maxWidth={460}>
          <ModalHeader
            title="Add team member"
            onClose={() => (inviting ? null : setShowInviteModal(false))}
          />
          <div className="p-[18px]">
            <p className="text-[11.5px] text-ink-muted mb-4">
              Add their name and email — they&apos;ll get a sign-in link to join your team.
            </p>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                type="text"
                autoFocus
                value={inviteFirstName}
                onChange={(e) => setInviteFirstName(e.target.value)}
                placeholder="First name"
                className="px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
              />
              <input
                type="text"
                value={inviteLastName}
                onChange={(e) => setInviteLastName(e.target.value)}
                placeholder="Last name"
                className="px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
              />
            </div>

            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null); }}
              placeholder="name@company.com"
              className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default mb-2"
            />

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Role</label>
              <NativeSelect
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </NativeSelect>
            </div>

            {inviteError && (
              <p className="text-[11.5px] text-signal-red-text mt-3">{inviteError}</p>
            )}

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setShowInviteModal(false)}
                disabled={inviting}
                className="px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inviting ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                Send invite
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm remove modal */}
      {confirmRemove && (
        <Modal onClose={() => (removing ? null : setConfirmRemove(null))} maxWidth={440}>
          <ModalHeader
            title="Remove member?"
            onClose={() => (removing ? null : setConfirmRemove(null))}
          />
          <div className="p-[18px]">
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-signal-red/10 text-signal-red-text shrink-0">
                <AlertTriangle size={16} />
              </span>
              <p className="text-[12.5px] text-ink-secondary leading-relaxed">
                <span className="font-medium text-ink">{memberName(confirmRemove)}</span>{" "}
                ({confirmRemove.email}) will be removed from the organization and lose
                access immediately. This can&apos;t be undone.
              </p>
            </div>

            {removeError && (
              <p className="text-[11.5px] text-signal-red-text mt-3">{removeError}</p>
            )}

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setConfirmRemove(null)}
                disabled={!!removing}
                className="px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemove(confirmRemove.id)}
                disabled={!!removing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-signal-red text-signal-red-text text-[11px] font-medium hover:bg-signal-red/80 transition-colors disabled:opacity-50"
              >
                {removing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Remove member
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit member modal */}
      {editMember && (
        <Modal onClose={() => (savingEdit ? null : setEditMember(null))} maxWidth={460}>
          <ModalHeader
            title="Edit member"
            onClose={() => (savingEdit ? null : setEditMember(null))}
          />
          <div className="p-[18px]">
            <p className="text-[11.5px] text-ink-muted mb-4">
              Correct this member&apos;s name. Their email is their sign-in identity and
              can&apos;t be changed here.
            </p>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                type="text"
                autoFocus
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                placeholder="First name"
                className="px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
              />
              <input
                type="text"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                placeholder="Last name"
                className="px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
              />
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-section/50 border border-border-subtle">
              <Mail size={12} className="text-ink-faint shrink-0" />
              <span className="text-[12px] text-ink-muted">{editMember.email}</span>
            </div>

            {editError && (
              <p className="text-[11.5px] text-signal-red-text mt-3">{editError}</p>
            )}

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setEditMember(null)}
                disabled={savingEdit}
                className="px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit || (!editFirstName.trim() && !editLastName.trim())}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingEdit ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />}
                Save changes
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
