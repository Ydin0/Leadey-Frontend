"use client";

import { Avatar } from "./team-shared";
import { Sparkline, Meter, attColor } from "./charts";
import { DeltaPill } from "./team-shared";
import {
  CH_IDS, attainment, prevRange, sliceRange, sumSlice, bucketed, fmtTalkTime, connectRate, sitRate,
  type ChannelId, type DayRange,
} from "@/lib/team/team-data";
import { useTeamData } from "@/lib/team/team-data-context";

export function TeamLeaderboard({ range, podium, rankBy, onPickRep }: {
  range: DayRange; podium: boolean; rankBy: string; onPickRep: (id: string) => void;
}) {
  const { filteredMembers: members } = useTeamData();

  const pr = prevRange(range);
  const rows = members.map((m) => {
    const a = attainment(m, range);
    const prevTot = sumSlice(sliceRange(m.series, pr)).total;
    const curTot = a.got.total;
    const trend = prevTot ? (curTot - prevTot) / prevTot : 0;
    return { m, a, spark: bucketed(m, range).totals, trend };
  });

  // Sit rate ranks nulls (no dispositioned meetings) last.
  const srSort = (g: typeof rows[number]["a"]["got"]) => sitRate(g) ?? -1;

  rows.sort((x, y) => {
    if (rankBy === "attainment") return y.a.overall - x.a.overall;
    if (rankBy === "volume") return y.a.got.total - x.a.got.total;
    if (rankBy === "talkTime") return y.a.got.talkTime - x.a.got.talkTime;
    if (rankBy === "meetings") return y.a.got.meetings - x.a.got.meetings;
    if (rankBy === "meetingsBooked") return y.a.got.meetingsBooked - x.a.got.meetingsBooked;
    if (rankBy === "sitRate") return srSort(y.a.got) - srSort(x.a.got);
    if (rankBy === "connectRate") return connectRate(y.a.got) - connectRate(x.a.got);
    if (rankBy === "voicemail") return y.a.got.voicemailCalls - x.a.got.voicemailCalls;
    return y.a.got[rankBy as ChannelId] - x.a.got[rankBy as ChannelId];
  });

  const fmtSit = (g: typeof rows[number]["a"]["got"]) => {
    const sr = sitRate(g);
    return sr == null ? "—" : Math.round(sr * 100) + "%";
  };

  const metricVal = (r: typeof rows[number]) => {
    if (rankBy === "attainment") return Math.round(r.a.overall * 100) + "%";
    if (rankBy === "volume") return r.a.got.total.toLocaleString();
    if (rankBy === "talkTime") return fmtTalkTime(r.a.got.talkTime);
    if (rankBy === "meetings") return r.a.got.meetings.toLocaleString();
    if (rankBy === "meetingsBooked") return r.a.got.meetingsBooked.toLocaleString();
    if (rankBy === "sitRate") return fmtSit(r.a.got);
    if (rankBy === "connectRate") return Math.round(connectRate(r.a.got) * 100) + "%";
    if (rankBy === "voicemail") return r.a.got.voicemailCalls.toLocaleString();
    return r.a.got[rankBy as ChannelId].toLocaleString();
  };

  const medalCol = ["#E8C45C", "#C2CBE0", "#C58B5C"];

  return (
    <div className="fade" style={{ display: "grid", gap: 16 }}>
      {/* Rank-by + rep/department filtering now live in the page header. */}
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
              <th style={{ textAlign: "right" }}>Calls</th>
              <th style={{ textAlign: "right" }}>Emails</th>
              <th style={{ textAlign: "right" }}>SMS</th>
              <th style={{ textAlign: "right" }}>LinkedIn</th>
              <th style={{ textAlign: "right" }}>Total</th>
              <th style={{ textAlign: "right" }}>Connect</th>
              <th style={{ textAlign: "right" }}>VM</th>
              <th style={{ textAlign: "right" }}>Opps</th>
              <th style={{ textAlign: "right" }}>Booked</th>
              <th style={{ textAlign: "right" }}>Sit rate</th>
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
                <td style={{ textAlign: "right", color: rankBy === "connectRate" ? "var(--fg1)" : "var(--fg2)", fontWeight: rankBy === "connectRate" ? 600 : 400 }}>{Math.round(connectRate(r.a.got) * 100)}%</td>
                <td style={{ textAlign: "right", color: rankBy === "voicemail" ? "var(--fg1)" : "var(--fg2)", fontWeight: rankBy === "voicemail" ? 600 : 400 }}>{r.a.got.voicemailCalls.toLocaleString()}</td>
                <td style={{ textAlign: "right", color: rankBy === "meetings" ? "var(--fg1)" : "var(--fg2)", fontWeight: rankBy === "meetings" ? 600 : 400 }}>{r.a.got.meetings.toLocaleString()}</td>
                <td style={{ textAlign: "right", color: rankBy === "meetingsBooked" ? "var(--fg1)" : "var(--fg2)", fontWeight: rankBy === "meetingsBooked" ? 600 : 400 }}>{r.a.got.meetingsBooked.toLocaleString()}</td>
                <td style={{ textAlign: "right", fontWeight: rankBy === "sitRate" ? 600 : 400 }}>
                  {(() => {
                    const sr = sitRate(r.a.got);
                    const n = r.a.got.meetingsAttended + r.a.got.meetingsNoShow;
                    if (sr == null) return <span style={{ color: "var(--fg-faint)" }}>—</span>;
                    return (
                      <span style={{ color: attColor(sr) }}>
                        {Math.round(sr * 100)}%
                        <span style={{ color: "var(--fg-faint)", fontWeight: 400, fontSize: 10, marginLeft: 4 }}>({n})</span>
                      </span>
                    );
                  })()}
                </td>
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
