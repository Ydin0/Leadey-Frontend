"use client";

import { useState } from "react";
import { mockSettings } from "@/lib/mock-data/settings";

interface LineAssignmentSelectProps {
  currentAssignedTo: string | null;
  currentAssignedToName: string | null;
  onAssign: (memberId: string | null, memberName: string | null) => void;
}

export function LineAssignmentSelect({
  currentAssignedTo,
  currentAssignedToName,
  onAssign,
}: LineAssignmentSelectProps) {
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const activeMembers = mockSettings.teamMembers.filter(
    (m) => m.status === "active" || m.status === "invited"
  );

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

    const member = activeMembers.find((m) => m.id === memberId);
    onAssign(memberId, member?.name ?? null);
  }

  function confirmReassign() {
    if (!pendingMemberId) return;
    const member = activeMembers.find((m) => m.id === pendingMemberId);
    onAssign(pendingMemberId, member?.name ?? null);
    setShowConfirm(false);
    setPendingMemberId(null);
  }

  function cancelReassign() {
    setShowConfirm(false);
    setPendingMemberId(null);
  }

  const pendingMember = pendingMemberId
    ? activeMembers.find((m) => m.id === pendingMemberId)
    : null;

  return (
    <div className="space-y-2">
      <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium">
        Assigned To
      </label>
      <select
        value={currentAssignedTo ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
      >
        <option value="">Unassigned (Org-wide)</option>
        {activeMembers.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      {showConfirm && (
        <div className="rounded-[10px] border border-border-subtle bg-signal-blue/20 px-3 py-2">
          <p className="text-[11px] text-ink mb-2">
            Currently assigned to <strong>{currentAssignedToName}</strong>. Reassign to{" "}
            <strong>{pendingMember?.name}</strong>?
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
