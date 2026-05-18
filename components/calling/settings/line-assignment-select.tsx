"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getTeamMembers } from "@/lib/api/team";
import type { TeamMember } from "@/lib/types/team";
import { NativeSelect } from "@/components/ui/native-select";
import { Loader2 } from "lucide-react";

interface LineAssignmentSelectProps {
  currentAssignedTo: string | null;
  currentAssignedToName: string | null;
  onAssign: (memberId: string | null, memberName: string | null) => void;
}

function memberName(m: TeamMember): string {
  const full = [m.firstName, m.lastName].filter(Boolean).join(" ");
  return full || m.email;
}

export function LineAssignmentSelect({
  currentAssignedTo,
  currentAssignedToName,
  onAssign,
}: LineAssignmentSelectProps) {
  const isAuthReady = useAuthReady();
  const { orgId } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!isAuthReady || !orgId) return;
    let cancelled = false;
    setLoading(true);
    getTeamMembers()
      .then((data) => {
        if (cancelled) return;
        setMembers(data.members);
      })
      .catch((err) => {
        console.warn("[line-assignment] /team failed:", err?.message || err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthReady, orgId]);

  function handleChange(memberId: string) {
    if (!memberId) {
      onAssign(null, null);
      setShowConfirm(false);
      return;
    }

    // If already assigned to someone, show confirmation
    if (currentAssignedTo && currentAssignedTo !== memberId) {
      setPendingMemberId(memberId);
      setShowConfirm(true);
      return;
    }

    const m = members.find((x) => x.id === memberId);
    onAssign(memberId, m ? memberName(m) : null);
  }

  function confirmReassign() {
    if (!pendingMemberId) return;
    const m = members.find((x) => x.id === pendingMemberId);
    onAssign(pendingMemberId, m ? memberName(m) : null);
    setShowConfirm(false);
    setPendingMemberId(null);
  }

  function cancelReassign() {
    setShowConfirm(false);
    setPendingMemberId(null);
  }

  const pendingMember = pendingMemberId
    ? members.find((m) => m.id === pendingMemberId)
    : null;

  return (
    <div className="space-y-2">
      <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium">
        Assigned To
      </label>
      {loading ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink-muted">
          <Loader2 size={12} className="animate-spin" />
          Loading team members…
        </div>
      ) : (
        <NativeSelect
          value={currentAssignedTo ?? ""}
          onChange={(e) => handleChange(e.target.value)}
        >
          <option value="">Unassigned (Org-wide)</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {memberName(m)}
            </option>
          ))}
        </NativeSelect>
      )}

      {showConfirm && pendingMember && (
        <div className="rounded-[10px] border border-border-subtle bg-signal-blue/20 px-3 py-2">
          <p className="text-[11px] text-ink mb-2">
            Currently assigned to <strong>{currentAssignedToName}</strong>. Reassign
            to <strong>{memberName(pendingMember)}</strong>?
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={confirmReassign}
              className="px-3 py-1 rounded-[16px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
            >
              Reassign
            </button>
            <button
              type="button"
              onClick={cancelReassign}
              className="px-3 py-1 rounded-[16px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
