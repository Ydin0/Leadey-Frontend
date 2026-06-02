"use client";

import React from "react";
import { Icon } from "./icon";
import { WindowSeg } from "./team-shared";
import { TeamAnalytics } from "./team-analytics";
import { TeamLeaderboard } from "./team-leaderboard";
import { TeamMembers, MemberModal, type MemberFormData } from "./team-members";
import { TeamRep } from "./team-rep";
import { TeamDataProvider, useTeamData } from "@/lib/team/team-data-context";
import { Loader2 } from "lucide-react";
import type { WindowId } from "@/lib/team/team-data";

type Tab = "analytics" | "leaderboard" | "members";
type Modal = { mode: "add" } | { mode: "edit"; id: string } | null;

function TeamSectionInner() {
  const { members, seatUsage, loading, addMember, updateTargets } = useTeamData();
  const [tab, setTab] = React.useState<Tab>("analytics");
  const [win, setWin] = React.useState<WindowId>("week");
  const [repId, setRepId] = React.useState<string | null>(null);
  const [modal, setModal] = React.useState<Modal>(null);

  const trendMode: "area" | "bars" = "area";
  const podium = true;
  const seatsFull = seatUsage.used >= seatUsage.included;

  const TABS: [Tab, string, string][] = [
    ["analytics", "Analytics", "bar-chart-3"],
    ["leaderboard", "Leaderboard", "trophy"],
    ["members", "Members", "users-round"],
  ];
  const showWindow = !repId && tab !== "members";

  async function handleSave(data: MemberFormData): Promise<{ ok: boolean; error?: string }> {
    if (modal?.mode === "add") {
      const res = await addMember(data);
      if (res.ok) { setRepId(null); setTab("members"); }
      return res;
    }
    if (modal?.mode === "edit") {
      const m = members.find((x) => x.id === modal.id);
      if (m?.email) await updateTargets(m.email, data.targets);
      return { ok: true };
    }
    return { ok: true };
  }

  return (
    <div className="team-root fade">
      {!repId ? (
        <div className="between" style={{ marginBottom: 4 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>Team</h1>
            <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{members.length} {members.length === 1 ? "rep" : "reps"} · activity, KPIs &amp; leaderboard across your team.</p>
          </div>
          <div className="row" style={{ gap: 10 }}>
            {showWindow && <WindowSeg value={win} onChange={setWin} />}
            <span className="pill pill-soft" style={{ pointerEvents: "none", color: seatsFull ? "var(--signal-red-text)" : "var(--fg2)" }}>
              <Icon name="users-round" size={12} />{seatUsage.used}/{seatUsage.included} seats
            </span>
            <button className="pill pill-primary" onClick={() => setModal({ mode: "add" })}><Icon name="user-plus" size={13} />Add member</button>
          </div>
        </div>
      ) : (
        <div className="between" style={{ marginBottom: 18 }}>
          <button className="row" onClick={() => setRepId(null)} style={{ gap: 7, fontSize: 12, color: "var(--fg-muted)", whiteSpace: "nowrap" }}>
            <Icon name="arrow-left" size={14} />Back to {tab === "members" ? "members" : tab === "leaderboard" ? "leaderboard" : "analytics"}
          </button>
          <WindowSeg value={win} onChange={setWin} />
        </div>
      )}

      {!repId && (
        <div className="row" style={{ gap: 22, borderBottom: "1px solid var(--border-subtle)", marginBottom: 20 }}>
          {TABS.map(([id, label, icon]) => (
            <button key={id} className={"tab row" + (tab === id ? " on" : "")} style={{ gap: 7 }} onClick={() => setTab(id)}>
              <Icon name={icon} size={14} />{label}
              {id === "members" && <span className="badge" style={{ background: "var(--section)", color: "var(--fg-muted)" }}>{members.length}</span>}
            </button>
          ))}
        </div>
      )}

      {loading && members.length === 0 ? (
        <div className="row" style={{ justifyContent: "center", padding: 64 }}>
          <Loader2 size={20} className="animate-spin" style={{ color: "var(--fg-muted)" }} />
        </div>
      ) : repId ? (
        <TeamRep memberId={repId} win={win} trendMode={trendMode} onEdit={(id) => setModal({ mode: "edit", id })} />
      ) : tab === "analytics" ? (
        <TeamAnalytics win={win} trendMode={trendMode} onPickRep={setRepId} />
      ) : tab === "leaderboard" ? (
        <TeamLeaderboard win={win} podium={podium} onPickRep={setRepId} />
      ) : (
        <TeamMembers onPickRep={setRepId} onEdit={(id) => setModal({ mode: "edit", id })} />
      )}

      {modal && (
        <MemberModal
          mode={modal.mode}
          member={modal.mode === "edit" ? members.find((x) => x.id === modal.id) ?? null : null}
          seatUsage={seatUsage}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export function TeamSection() {
  return (
    <TeamDataProvider>
      <TeamSectionInner />
    </TeamDataProvider>
  );
}
