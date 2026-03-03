"use client";

import { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { useTeamMembers } from "@/hooks/use-team-members";
import type { FunnelMember } from "@/lib/types/funnel";

interface FunnelMembersPanelProps {
  members: FunnelMember[];
  onAddMember?: (teamMemberId: string) => void;
}

const ROLE_LABELS: Record<FunnelMember["role"], string> = {
  owner: "Owner",
  contributor: "Contributor",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<FunnelMember["role"], string> = {
  owner: "bg-signal-blue text-signal-blue-text",
  contributor: "bg-signal-green text-signal-green-text",
  viewer: "bg-signal-slate text-signal-slate-text",
};

export function FunnelMembersPanel({ members, onAddMember }: FunnelMembersPanelProps) {
  const { members: allTeamMembers, resolveMember } = useTeamMembers();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const assignedIds = new Set(members.map((m) => m.teamMemberId));
  const availableMembers = allTeamMembers.filter(
    (tm) => !assignedIds.has(tm.id) && tm.status === "active"
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  return (
    <div className="flex items-center gap-3 bg-surface rounded-[14px] border border-border-subtle px-4 py-2.5">
      <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium shrink-0">
        Members
      </span>

      <div className="flex items-center gap-1.5">
        {members.map((m) => {
          const tm = resolveMember(m.teamMemberId);
          if (!tm) return null;
          return (
            <div key={m.teamMemberId} className="group relative flex items-center">
              <MemberAvatar id={tm.id} name={tm.name} />
              {/* Hover tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-10">
                <div className="bg-ink text-on-ink rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                  <p className="text-[11px] font-medium">{tm.name}</p>
                  <span className={cn("inline-block text-[9px] font-medium rounded-full px-1.5 py-0.5 mt-0.5", ROLE_COLORS[m.role])}>
                    {ROLE_LABELS[m.role]}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Member */}
      {availableMembers.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-[20px] bg-section text-ink-secondary text-[10px] font-medium hover:bg-hover transition-colors border border-border-subtle"
          >
            <Plus size={11} strokeWidth={2} />
            Add
          </button>

          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-surface rounded-[10px] border border-border-subtle shadow-lg z-20 min-w-[180px] py-1">
              {availableMembers.map((tm) => (
                <button
                  key={tm.id}
                  onClick={() => {
                    onAddMember?.(tm.id);
                    setShowDropdown(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-hover/60 transition-colors"
                >
                  <MemberAvatar id={tm.id} name={tm.name} />
                  <div className="min-w-0">
                    <p className="text-[12px] text-ink font-medium truncate">{tm.name}</p>
                    <p className="text-[10px] text-ink-muted truncate">{tm.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
