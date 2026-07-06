"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import {
  getPipelineMembers, addPipelineMember, removePipelineMember,
} from "@/lib/api/opportunities";
import { getTeamMembers } from "@/lib/api/team";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { MemberAvatar } from "@/components/shared/member-avatar";
import type { PipelineMember } from "@/lib/types/opportunity";
import type { TeamMember } from "@/lib/types/team";

function memberName(m: { firstName?: string | null; lastName?: string | null; email: string | null }): string {
  if (m.firstName || m.lastName) return `${m.firstName || ""} ${m.lastName || ""}`.trim();
  return m.email || "Unknown";
}

/** Avatar stack + add/remove control for a pipeline's members. Assigning is
 *  gated on opportunities.managePipelines; everyone can see who's on it. */
export function PipelineMembersPanel({ pipelineId }: { pipelineId: string }) {
  const isAuthReady = useAuthReady();
  const { has } = usePermissions();
  const canManage = has("opportunities.managePipelines");
  const [members, setMembers] = useState<PipelineMember[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthReady || !pipelineId) return;
    setLoading(true);
    Promise.all([getPipelineMembers(pipelineId), getTeamMembers()])
      .then(([pMembers, team]) => {
        setMembers(pMembers);
        setTeamMembers(team.members);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthReady, pipelineId]);

  useEffect(() => {
    if (!showAdd) return;
    function handleClick(e: MouseEvent) {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setShowAdd(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showAdd]);

  const available = teamMembers.filter((tm) => !members.some((m) => m.userId === tm.id));

  async function handleAdd(userId: string) {
    setBusy(true);
    try {
      const created = await addPipelineMember(pipelineId, userId);
      setMembers((prev) => [...prev, created]);
    } catch (err) {
      console.error("Failed to add pipeline member:", err);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(userId: string) {
    setBusy(true);
    try {
      await removePipelineMember(pipelineId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (err) {
      console.error("Failed to remove pipeline member:", err);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;
  // Nothing to show for a non-admin with an empty pipeline.
  if (!canManage && members.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center -space-x-1.5">
        {members.slice(0, 5).map((m) => (
          <div key={m.userId} className="relative group">
            <MemberAvatar id={m.userId} name={memberName(m)} size="sm" className="border-2 border-page" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-ink text-on-ink text-[9px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
              {memberName(m)}
            </div>
          </div>
        ))}
        {members.length > 5 && (
          <div className="w-6 h-6 rounded-full bg-section flex items-center justify-center border-2 border-page text-[9px] font-medium text-ink-muted">
            +{members.length - 5}
          </div>
        )}
      </div>

      {canManage && (
        <div className="relative" ref={addRef}>
          <button
            onClick={() => setShowAdd(!showAdd)}
            title="Assign people to this pipeline"
            className="w-7 h-7 rounded-full bg-section border border-dashed border-border-default flex items-center justify-center text-ink-muted hover:bg-hover hover:text-ink transition-colors"
          >
            <Plus size={12} />
          </button>

          {showAdd && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-surface rounded-[12px] border border-border-subtle shadow-lg z-30 p-3">
              <p className="text-[12px] font-medium text-ink mb-2">Pipeline members</p>
              {/* Current members with a remove control */}
              {members.length > 0 && (
                <div className="space-y-1 mb-2 pb-2 border-b border-border-subtle">
                  {members.map((m) => (
                    <div key={m.userId} className="flex items-center gap-2 px-2 py-1 rounded-[8px]">
                      <MemberAvatar id={m.userId} name={memberName(m)} size="sm" />
                      <p className="text-[11px] font-medium text-ink truncate flex-1">{memberName(m)}</p>
                      <button
                        onClick={() => void handleRemove(m.userId)}
                        disabled={busy}
                        title="Remove from pipeline"
                        className="p-1 rounded-md text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10 disabled:opacity-50"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {available.length === 0 ? (
                  <p className="text-[11px] text-ink-faint py-2 text-center">Everyone is already on this pipeline</p>
                ) : (
                  available.map((tm) => (
                    <button
                      key={tm.id}
                      onClick={() => void handleAdd(tm.id)}
                      disabled={busy}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[8px] hover:bg-hover transition-colors text-left disabled:opacity-50"
                    >
                      <MemberAvatar id={tm.id} name={memberName(tm)} size="sm" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-ink truncate">{memberName(tm)}</p>
                        <p className="text-[9px] text-ink-faint truncate">{tm.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <span className="text-[10px] text-ink-faint">
        {members.length} member{members.length !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
