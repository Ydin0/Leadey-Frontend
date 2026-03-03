"use client";

import { mockSettings } from "@/lib/mock-data/settings";

interface StepAssignMemberProps {
  assignedTo: string | null;
  friendlyName: string;
  onAssign: (memberId: string | null) => void;
  onFriendlyNameChange: (name: string) => void;
}

export function StepAssignMember({
  assignedTo,
  friendlyName,
  onAssign,
  onFriendlyNameChange,
}: StepAssignMemberProps) {
  const activeMembers = mockSettings.teamMembers.filter(
    (m) => m.status === "active" || m.status === "invited"
  );

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
          placeholder="e.g., Sales Main, UK Office"
          className="w-full px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
        />
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
          Assign To
        </label>
        <select
          value={assignedTo ?? ""}
          onChange={(e) => onAssign(e.target.value || null)}
          className="w-full px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
        >
          <option value="">Keep as Org-wide</option>
          {activeMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.email})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
