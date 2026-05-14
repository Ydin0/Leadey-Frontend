"use client";

import { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getFunnelMembers, addFunnelMember, updateFunnelMemberRole, removeFunnelMember,
  type FunnelMemberData,
} from "@/lib/api/funnels";
import { getTeamMembers } from "@/lib/api/team";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import type { TeamMember } from "@/lib/types/team";

interface FunnelMembersPanelProps {
  funnelId: string;
}

const FUNNEL_ROLES = [
  { value: "owner", label: "Owner", color: "bg-signal-blue text-signal-blue-text" },
  { value: "contributor", label: "Contributor", color: "bg-signal-green text-signal-green-text" },
  { value: "viewer", label: "Viewer", color: "bg-signal-slate text-signal-slate-text" },
];

function memberName(m: FunnelMemberData | TeamMember): string {
  const first = "firstName" in m ? m.firstName : null;
  const last = "lastName" in m ? m.lastName : null;
  if (first || last) return `${first || ""} ${last || ""}`.trim();
  return m.email;
}

export function FunnelMembersPanel({ funnelId }: FunnelMembersPanelProps) {
  const isAuthReady = useAuthReady();
  const [members, setMembers] = useState<FunnelMemberData[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addRole, setAddRole] = useState("contributor");
  const [adding, setAdding] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthReady) return;
    Promise.all([
      getFunnelMembers(funnelId),
      getTeamMembers(),
    ]).then(([fMembers, team]) => {
      setMembers(fMembers);
      setTeamMembers(team.members);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthReady, funnelId]);

  useEffect(() => {
    if (!showAdd) return;
    function handleClick(e: MouseEvent) {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setShowAdd(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showAdd]);

  const availableMembers = teamMembers.filter(
    (tm) => !members.some((m) => m.userId === tm.id)
  );

  async function handleAdd(userId: string) {
    setAdding(true);
    try {
      const newMember = await addFunnelMember(funnelId, userId, addRole);
      setMembers((prev) => [...prev, newMember]);
      setShowAdd(false);
    } catch (err) {
      console.error("Failed to add member:", err);
    } finally {
      setAdding(false);
    }
  }

  if (loading) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Member avatars */}
      <div className="flex items-center -space-x-1.5">
        {members.slice(0, 5).map((m) => (
          <div key={m.userId} className="relative group">
            <div className="w-7 h-7 rounded-full bg-signal-blue/10 flex items-center justify-center border-2 border-surface text-[10px] font-semibold text-signal-blue-text">
              {(m.firstName?.[0] || m.email[0]).toUpperCase()}
            </div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-ink text-on-ink text-[9px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
              {memberName(m)} &middot; {m.role}
            </div>
          </div>
        ))}
        {members.length > 5 && (
          <div className="w-7 h-7 rounded-full bg-section flex items-center justify-center border-2 border-surface text-[9px] font-medium text-ink-muted">
            +{members.length - 5}
          </div>
        )}
      </div>

      {/* Add button */}
      <div className="relative" ref={addRef}>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-7 h-7 rounded-full bg-section border border-dashed border-border-default flex items-center justify-center text-ink-muted hover:bg-hover hover:text-ink transition-colors"
        >
          <Plus size={12} />
        </button>

        {showAdd && (
          <div className="absolute top-full right-0 mt-2 w-72 bg-surface rounded-[12px] border border-border-subtle shadow-lg z-30 p-3">
            <p className="text-[12px] font-medium text-ink mb-2">Add to funnel</p>
            <div className="flex items-center gap-1 mb-3">
              {FUNNEL_ROLES.filter((r) => r.value !== "owner").map((r) => (
                <button
                  key={r.value}
                  onClick={() => setAddRole(r.value)}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors",
                    addRole === r.value ? r.color : "bg-section text-ink-muted"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {availableMembers.length === 0 && (
                <p className="text-[11px] text-ink-faint py-2 text-center">All team members are already in this funnel</p>
              )}
              {availableMembers.map((tm) => (
                <button
                  key={tm.id}
                  onClick={() => handleAdd(tm.id)}
                  disabled={adding}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[8px] hover:bg-hover transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-6 h-6 rounded-full bg-signal-blue/10 flex items-center justify-center text-[9px] font-semibold text-signal-blue-text shrink-0">
                    {(tm.firstName?.[0] || tm.email[0]).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-ink truncate">{memberName(tm)}</p>
                    <p className="text-[9px] text-ink-faint truncate">{tm.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <span className="text-[10px] text-ink-faint">
        {members.length} member{members.length !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
