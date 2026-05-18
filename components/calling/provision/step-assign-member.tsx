"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getTeamMembers } from "@/lib/api/team";
import type { TeamMember } from "@/lib/types/team";
import { NativeSelect } from "@/components/ui/native-select";

interface StepAssignMemberProps {
  assignedTo: string | null;
  friendlyName: string;
  onAssign: (memberId: string | null) => void;
  onFriendlyNameChange: (name: string) => void;
}

function memberLabel(m: TeamMember): string {
  const full = [m.firstName, m.lastName].filter(Boolean).join(" ");
  return `${full || m.email} (${m.email})`;
}

export function StepAssignMember({
  assignedTo,
  friendlyName,
  onAssign,
  onFriendlyNameChange,
}: StepAssignMemberProps) {
  const isAuthReady = useAuthReady();
  const { orgId } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady || !orgId) return;
    let cancelled = false;
    setLoading(true);
    getTeamMembers()
      .then((data) => {
        if (!cancelled) setMembers(data.members);
      })
      .catch((err) => {
        console.warn("[step-assign-member] /team failed:", err?.message || err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthReady, orgId]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[14px] font-semibold text-ink">Assign to Team Member</h3>
        <p className="text-[12px] text-ink-muted mt-0.5">
          Optionally assign this number to a team member, or keep it as an org-wide line.
        </p>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
          Friendly Name
        </label>
        <input
          type="text"
          value={friendlyName}
          onChange={(e) => onFriendlyNameChange(e.target.value)}
          placeholder="e.g. Sales Main, UK Office"
          className="w-full px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
        />
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
          Assign To
        </label>
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink-muted">
            <Loader2 size={12} className="animate-spin" />
            Loading team members…
          </div>
        ) : (
          <NativeSelect
            value={assignedTo ?? ""}
            onChange={(e) => onAssign(e.target.value || null)}
          >
            <option value="">Keep as Org-wide</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {memberLabel(m)}
              </option>
            ))}
          </NativeSelect>
        )}
      </div>
    </div>
  );
}
