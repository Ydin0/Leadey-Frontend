"use client";

import React from "react";
import { Icon } from "./icon";
import { WindowSeg } from "./team-shared";
import { TeamAnalytics } from "./team-analytics";
import { TeamLeaderboard } from "./team-leaderboard";
import { TeamMembers, MemberModal, type MemberFormData } from "./team-members";
import { TeamRep } from "./team-rep";
import { DateRangePicker } from "./date-range-picker";
import { TeamFilterControl } from "./team-filter-control";
import { NativeSelect } from "@/components/ui/native-select";
import { TeamDataProvider, useTeamData } from "@/lib/team/team-data-context";
import { Loader2 } from "lucide-react";
import { WIN_MAP, windowRange, fmtRange, DAYS, CH_IDS, CH_MAP, type WindowId, type DayRange } from "@/lib/team/team-data";

/** Leaderboard rank-by metric options (lives in the header now, so it's shared). */
const RANK_OPTS: [string, string][] = [
  ["attainment", "Attainment %"], ["volume", "Total volume"], ["connectRate", "Connect rate"],
  ["meetings", "Opportunities"], ["talkTime", "Talk time"], ["voicemail", "Voicemails"],
  ...CH_IDS.map((c) => [c, CH_MAP[c].label] as [string, string]),
];

const DAY_MS = 86400000;

type Tab = "analytics" | "leaderboard" | "members";
type Modal = { mode: "add" } | { mode: "edit"; id: string } | null;

function TeamSectionInner() {
  const { members, seatUsage, loading, addMember, updateTargets } = useTeamData();
  const [tab, setTab] = React.useState<Tab>("analytics");
  const [win, setWin] = React.useState<WindowId>("week");
  // Custom calendar selection — overrides the preset window when set.
  const [customRange, setCustomRange] = React.useState<DayRange | null>(null);
  // Leaderboard rank metric — lifted here so it sits in the header pill row.
  const [rankBy, setRankBy] = React.useState<string>("attainment");
  const [repId, setRepId] = React.useState<string | null>(null);
  const [modal, setModal] = React.useState<Modal>(null);

  const trendMode: "area" | "bars" = "area";
  const podium = true;
  const seatsFull = seatUsage.used >= seatUsage.included;

  // Effective range + label driving every analytics view: the custom calendar
  // range when chosen, otherwise the active preset (1D/1W/1M/1Q).
  const range: DayRange = customRange ?? windowRange(win);
  const rangeLabel = customRange ? fmtRange(customRange) : WIN_MAP[win].label.toLowerCase();

  // Calendar bounds: any day in the last rolling year, up to today.
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const minDate = new Date(today.getTime() - (DAYS - 1) * DAY_MS);

  const pickPreset = (w: WindowId) => { setCustomRange(null); setWin(w); };

  const dateControls = (
    <div className="row" style={{ gap: 8 }}>
      <WindowSeg value={customRange ? null : win} onChange={pickPreset} />
      <DateRangePicker value={customRange} onChange={setCustomRange} minDate={minDate} maxDate={today} />
    </div>
  );

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
            {showWindow && dateControls}
            {showWindow && <TeamFilterControl />}
            {tab === "leaderboard" && (
              <div className="row" style={{ gap: 6 }}>
                <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>Rank</span>
                <NativeSelect
                  value={rankBy}
                  onChange={(e) => setRankBy(e.target.value)}
                  className="!w-auto !rounded-full !py-1.5 !pl-3.5 !pr-8 !text-[11px]"
                >
                  {RANK_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </NativeSelect>
              </div>
            )}
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
          {dateControls}
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
        <TeamRep memberId={repId} range={range} rangeLabel={rangeLabel} trendMode={trendMode} onEdit={(id) => setModal({ mode: "edit", id })} />
      ) : tab === "analytics" ? (
        <TeamAnalytics range={range} rangeLabel={rangeLabel} trendMode={trendMode} onPickRep={setRepId} />
      ) : tab === "leaderboard" ? (
        <TeamLeaderboard range={range} podium={podium} rankBy={rankBy} onPickRep={setRepId} />
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
