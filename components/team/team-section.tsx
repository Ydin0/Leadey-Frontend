"use client";

import React from "react";
import { Icon } from "./icon";
import { WindowSeg } from "./team-shared";
import { TeamAnalytics } from "./team-analytics";
import { TeamLeaderboard } from "./team-leaderboard";
import { TeamMembers, MemberModal, type MemberFormData } from "./team-members";
import { TeamRep } from "./team-rep";
import { MEMBERS, addMember, type WindowId } from "@/lib/team/team-data";

type Tab = "analytics" | "leaderboard" | "members";
type Modal = { mode: "add" } | { mode: "edit"; id: string } | null;

export function TeamSection() {
  const [tab, setTab] = React.useState<Tab>("analytics");
  const [win, setWin] = React.useState<WindowId>("week");
  const [repId, setRepId] = React.useState<string | null>(null);
  const [modal, setModal] = React.useState<Modal>(null);
  const [, force] = React.useReducer((x) => x + 1, 0);

  const trendMode: "area" | "bars" = "area";
  const podium = true;

  const TABS: [Tab, string, string][] = [
    ["analytics", "Analytics", "bar-chart-3"],
    ["leaderboard", "Leaderboard", "trophy"],
    ["members", "Members", "users-round"],
  ];
  const showWindow = !repId && tab !== "members";

  function saveMember(data: MemberFormData) {
    if (modal?.mode === "add") {
      addMember(data);
      setModal(null);
      setRepId(null);
      setTab("members");
    } else if (modal?.mode === "edit") {
      const m = MEMBERS.find((x) => x.id === modal.id);
      if (m) Object.assign(m.targets, data.targets);
      setModal(null);
    }
    force();
  }

  return (
    <div className="team-root fade">
      {!repId ? (
        <div className="between" style={{ marginBottom: 4 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>Team</h1>
            <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{MEMBERS.length} reps · activity, KPIs &amp; leaderboard across your team.</p>
          </div>
          <div className="row" style={{ gap: 10 }}>
            {showWindow && <WindowSeg value={win} onChange={setWin} />}
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
              {id === "members" && <span className="badge" style={{ background: "var(--section)", color: "var(--fg-muted)" }}>{MEMBERS.length}</span>}
            </button>
          ))}
        </div>
      )}

      {repId
        ? <TeamRep memberId={repId} win={win} trendMode={trendMode} onEdit={(id) => setModal({ mode: "edit", id })} />
        : tab === "analytics" ? <TeamAnalytics win={win} trendMode={trendMode} onPickRep={setRepId} />
        : tab === "leaderboard" ? <TeamLeaderboard win={win} podium={podium} onPickRep={setRepId} />
        : <TeamMembers onPickRep={setRepId} onEdit={(id) => setModal({ mode: "edit", id })} />}

      {modal && (
        <MemberModal
          mode={modal.mode}
          member={modal.mode === "edit" ? MEMBERS.find((x) => x.id === modal.id) ?? null : null}
          onClose={() => setModal(null)}
          onSave={saveMember}
        />
      )}
    </div>
  );
}
