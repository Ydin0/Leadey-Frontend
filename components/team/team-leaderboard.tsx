"use client";

import { useEffect, useState } from "react";
import { Avatar } from "./team-shared";
import { attColor } from "./charts";
import { Icon } from "./icon";
import { usePermissions } from "@/lib/hooks/use-permissions";
import {
  attainment, prevRange, sliceRange, sumSlice, bucketed, fmtTalkTime, connectRate, sitRate,
  type ChannelId, type DayRange,
} from "@/lib/team/team-data";
import { useTeamData } from "@/lib/team/team-data-context";
import { resolveLbColumns, type LbColumnPrefs } from "@/lib/team/leaderboard-columns";
import { LeaderboardColumnsDrawer } from "./leaderboard-columns-drawer";

export function TeamLeaderboard({ range, podium, rankBy, onPickRep }: {
  range: DayRange; podium: boolean; rankBy: string; onPickRep: (id: string) => void;
}) {
  const { filteredMembers: members, leaderboardColumns, saveLeaderboardColumns } = useTeamData();
  const { has } = usePermissions();
  const canManage = has("settings.manageTeam");

  // Column layout: a local draft (live-editable in the drawer) synced from the
  // org-wide saved layout; Save persists it for everyone.
  const [draft, setDraft] = useState<LbColumnPrefs | null>(leaderboardColumns);
  const [colsOpen, setColsOpen] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);
  useEffect(() => { setDraft(leaderboardColumns); }, [leaderboardColumns]);

  const resolved = resolveLbColumns(draft);
  const visibleCols = resolved.filter((r) => r.visible).map((r) => r.col);

  const pr = prevRange(range);
  const rows = members.map((m) => {
    const a = attainment(m, range);
    const prevTot = sumSlice(sliceRange(m.series, pr)).total;
    const curTot = a.got.total;
    const trend = prevTot ? (curTot - prevTot) / prevTot : 0;
    return { m, a, spark: bucketed(m, range).totals, trend };
  });

  const srSort = (g: typeof rows[number]["a"]["got"]) => sitRate(g) ?? -1;
  rows.sort((x, y) => {
    if (rankBy === "attainment") return y.a.overall - x.a.overall;
    if (rankBy === "volume") return y.a.got.total - x.a.got.total;
    if (rankBy === "talkTime") return y.a.got.talkTime - x.a.got.talkTime;
    if (rankBy === "meetings") return y.a.got.meetings - x.a.got.meetings;
    if (rankBy === "meetingsBooked") return y.a.got.meetingsBooked - x.a.got.meetingsBooked;
    if (rankBy === "meetingsNoShow") return y.a.got.meetingsNoShow - x.a.got.meetingsNoShow;
    if (rankBy === "sitRate") return srSort(y.a.got) - srSort(x.a.got);
    if (rankBy === "avgCallsPerBooking") {
      // Fewer calls per booking ranks higher; no bookings sinks to the bottom.
      const av = (g: typeof rows[number]["a"]["got"]) => (g.meetingsBooked > 0 ? g.calls / g.meetingsBooked : Infinity);
      return av(x.a.got) - av(y.a.got);
    }
    if (rankBy === "connectRate") return connectRate(y.a.got) - connectRate(x.a.got);
    if (rankBy === "voicemail") return y.a.got.voicemailCalls - x.a.got.voicemailCalls;
    return y.a.got[rankBy as ChannelId] - x.a.got[rankBy as ChannelId];
  });

  const fmtSit = (g: typeof rows[number]["a"]["got"]) => { const sr = sitRate(g); return sr == null ? "—" : Math.round(sr * 100) + "%"; };
  const metricVal = (r: typeof rows[number]) => {
    if (rankBy === "attainment") return Math.round(r.a.overall * 100) + "%";
    if (rankBy === "volume") return r.a.got.total.toLocaleString();
    if (rankBy === "talkTime") return fmtTalkTime(r.a.got.talkTime);
    if (rankBy === "meetings") return r.a.got.meetings.toLocaleString();
    if (rankBy === "meetingsBooked") return r.a.got.meetingsBooked.toLocaleString();
    if (rankBy === "meetingsNoShow") return r.a.got.meetingsNoShow.toLocaleString();
    if (rankBy === "sitRate") return fmtSit(r.a.got);
    if (rankBy === "avgCallsPerBooking") return r.a.got.meetingsBooked > 0 ? (r.a.got.calls / r.a.got.meetingsBooked).toFixed(1) : "—";
    if (rankBy === "connectRate") return Math.round(connectRate(r.a.got) * 100) + "%";
    if (rankBy === "voicemail") return r.a.got.voicemailCalls.toLocaleString();
    return r.a.got[rankBy as ChannelId].toLocaleString();
  };

  const medalCol = ["#E8C45C", "#C2CBE0", "#C58B5C"];

  return (
    <div className="fade" style={{ display: "grid", gap: 16 }}>
      {canManage && (
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="seg-btn row" style={{ gap: 6, fontSize: 11 }} onClick={() => { setSavedFlag(false); setColsOpen(true); }}>
            <Icon name="sliders-horizontal" size={12} /> Columns
          </button>
        </div>
      )}

      {podium && rows.length >= 3 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, alignItems: "end" }}>
          {[1, 0, 2].map((idx) => {
            const r = rows[idx];
            const h = idx === 0 ? 150 : 124;
            return (
              <div key={r.m.id} className="card-brand" onClick={() => onPickRep(r.m.id)}
                style={{ padding: 18, height: h, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 9, cursor: "pointer", position: "relative", textAlign: "center" }}>
                <span className="medal" style={{ position: "absolute", top: 12, left: 12, background: medalCol[idx] + "26", color: medalCol[idx], border: `1px solid ${medalCol[idx]}55` }}>{idx + 1}</span>
                <Avatar name={r.m.name} pod={r.m.pod} size={idx === 0 ? 52 : 44} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{r.m.name}</div>
                  <div style={{ fontSize: 10, color: "var(--fg-muted)", marginTop: 1 }}>{r.m.role} · {r.m.pod}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: rankBy === "attainment" ? attColor(r.a.overall) : rankBy === "sitRate" && sitRate(r.a.got) != null ? attColor(sitRate(r.a.got)!) : "var(--fg1)" }}>{metricVal(r)}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        <table className="tt">
          <thead>
            <tr>
              <th style={{ width: 50, textAlign: "center" }}>#</th>
              <th>Rep</th>
              {visibleCols.map((col) => (
                <th key={col.key} style={{ textAlign: col.key === "attainment" || col.key === "trend" ? "left" : "right", ...(col.key === "attainment" ? { width: 150 } : col.key === "trend" ? { width: 96 } : {}) }}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.m.id} className="click" onClick={() => onPickRep(r.m.id)}>
                <td style={{ textAlign: "center" }}>
                  {i < 3
                    ? <span className="medal" style={{ margin: "0 auto", background: medalCol[i] + "26", color: medalCol[i], border: `1px solid ${medalCol[i]}55` }}>{i + 1}</span>
                    : <span style={{ color: "var(--fg-faint)", fontWeight: 600 }}>{i + 1}</span>}
                </td>
                <td>
                  <div className="row" style={{ gap: 11 }}>
                    <Avatar name={r.m.name} pod={r.m.pod} size={32} />
                    <div>
                      <div className="row" style={{ gap: 7 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap" }}>{r.m.name}</span>
                        {r.m.status === "away" && <span style={{ fontSize: 9, color: "var(--fg-faint)" }}>Away</span>}
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--fg-muted)", marginTop: 1 }}>{r.m.role} · {r.m.pod}</div>
                    </div>
                  </div>
                </td>
                {visibleCols.map((col) => (
                  <td key={col.key} style={{ textAlign: col.key === "attainment" || col.key === "trend" ? "left" : "right" }}>
                    {col.cell(r, col.rankKey === rankBy)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LeaderboardColumnsDrawer
        open={colsOpen}
        onClose={() => setColsOpen(false)}
        resolved={resolved}
        onChange={(order, hidden) => { setDraft({ order, hidden }); setSavedFlag(false); }}
        onReset={() => { setDraft(null); setSavedFlag(false); }}
        canSave={canManage}
        saved={savedFlag}
        onSave={async () => {
          const order = resolved.map((r) => r.col.key);
          const hidden = resolved.filter((r) => !r.visible).map((r) => r.col.key);
          await saveLeaderboardColumns({ order, hidden });
          setSavedFlag(true);
        }}
      />
    </div>
  );
}
