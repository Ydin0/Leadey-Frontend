"use client";

import React from "react";
import { Avatar } from "./team-shared";
import { Sparkline, Meter, attColor } from "./charts";
import { DeltaPill } from "./team-shared";
import {
  CH_IDS, CH_MAP, attainment, prevSlice, sumSlice, bucketed, fmtTalkTime,
  type ChannelId, type WindowId,
} from "@/lib/team/team-data";
import { useTeamData } from "@/lib/team/team-data-context";

export function TeamLeaderboard({ win, podium, onPickRep }: {
  win: WindowId; podium: boolean; onPickRep: (id: string) => void;
}) {
  const { activeMembers } = useTeamData();
  const [rankBy, setRankBy] = React.useState<string>("attainment");
  const [pod, setPod] = React.useState<string>("all");

  let members = activeMembers;
  if (pod !== "all") members = members.filter((m) => m.pod === pod);

  const rows = members.map((m) => {
    const a = attainment(m, win);
    const prevTot = sumSlice(prevSlice(m.series, win)).total;
    const curTot = a.got.total;
    const trend = prevTot ? (curTot - prevTot) / prevTot : 0;
    return { m, a, spark: bucketed(m, win).totals, trend };
  });

  rows.sort((x, y) => {
    if (rankBy === "attainment") return y.a.overall - x.a.overall;
    if (rankBy === "volume") return y.a.got.total - x.a.got.total;
    if (rankBy === "talkTime") return y.a.got.talkTime - x.a.got.talkTime;
    return y.a.got[rankBy as ChannelId] - x.a.got[rankBy as ChannelId];
  });

  const metricVal = (r: typeof rows[number]) => {
    if (rankBy === "attainment") return Math.round(r.a.overall * 100) + "%";
    if (rankBy === "volume") return r.a.got.total.toLocaleString();
    if (rankBy === "talkTime") return fmtTalkTime(r.a.got.talkTime);
    return r.a.got[rankBy as ChannelId].toLocaleString();
  };

  const rankOpts: [string, string][] = [["attainment", "Attainment %"], ["volume", "Total volume"], ["talkTime", "Talk time"], ...CH_IDS.map((c) => [c, CH_MAP[c].label] as [string, string])];
  const medalCol = ["#E8C45C", "#C2CBE0", "#C58B5C"];

  return (
    <div className="fade" style={{ display: "grid", gap: 16 }}>
      <div className="between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div className="row" style={{ gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>Rank by</span>
          <select className="field" style={{ width: "auto", padding: "7px 10px", fontSize: 12 }} value={rankBy} onChange={(e) => setRankBy(e.target.value)}>
            {rankOpts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="seg">
          {[["all", "All pods"], ["Enterprise", "Enterprise"], ["Mid-Market", "Mid-Market"], ["SMB", "SMB"]].map(([v, l]) => (
            <button key={v} className={"seg-btn" + (pod === v ? " on" : "")} onClick={() => setPod(v)}>{l}</button>
          ))}
        </div>
      </div>

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
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: rankBy === "attainment" ? attColor(r.a.overall) : "var(--fg1)" }}>{metricVal(r)}</div>
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
              <th style={{ textAlign: "right" }}>Calls</th>
              <th style={{ textAlign: "right" }}>Emails</th>
              <th style={{ textAlign: "right" }}>SMS</th>
              <th style={{ textAlign: "right" }}>LinkedIn</th>
              <th style={{ textAlign: "right" }}>Total</th>
              <th style={{ textAlign: "right" }}>Talk time</th>
              <th style={{ width: 150 }}>Attainment</th>
              <th style={{ width: 96 }}>Trend</th>
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
                {CH_IDS.map((ch) => (
                  <td key={ch} style={{ textAlign: "right", color: rankBy === ch ? "var(--fg1)" : "var(--fg2)", fontWeight: rankBy === ch ? 600 : 400 }}>{r.a.got[ch].toLocaleString()}</td>
                ))}
                <td style={{ textAlign: "right", fontWeight: 600 }}>{r.a.got.total.toLocaleString()}</td>
                <td style={{ textAlign: "right", color: rankBy === "talkTime" ? "var(--fg1)" : "var(--fg2)", fontWeight: rankBy === "talkTime" ? 600 : 400 }}>{fmtTalkTime(r.a.got.talkTime)}</td>
                <td>
                  <div className="row" style={{ gap: 9 }}>
                    <div className="grow"><Meter pct={r.a.overall} /></div>
                    <span style={{ width: 36, textAlign: "right", fontSize: 11.5, fontWeight: 600, color: attColor(r.a.overall) }}>{Math.round(r.a.overall * 100)}%</span>
                  </div>
                </td>
                <td>
                  <div className="row" style={{ gap: 7 }}>
                    <Sparkline data={r.spark} color={r.trend >= 0 ? "var(--signal-green-text)" : "var(--signal-red-text)"} width={48} height={20} />
                    <DeltaPill d={r.trend} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
