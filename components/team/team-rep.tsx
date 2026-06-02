"use client";

import { Icon } from "./icon";
import { Avatar, StatusDot, Panel, ChannelLegend } from "./team-shared";
import { TrendChart, Ring, Meter, attColor } from "./charts";
import {
  CH_IDS, CH_MAP, WIN_MAP, attainment, bucketed, workingDays, winSlice,
  type WindowId,
} from "@/lib/team/team-data";
import { useTeamData } from "@/lib/team/team-data-context";

export function TeamRep({ memberId, win, trendMode, onEdit }: {
  memberId: string; win: WindowId; trendMode: "area" | "bars"; onEdit: (id: string) => void;
}) {
  const { activeMembers } = useTeamData();
  const m = activeMembers.find((x) => x.id === memberId);
  if (!m) return null;
  const a = attainment(m, win);
  const chart = bucketed(m, win);
  const tot = a.got;
  const wlabel = WIN_MAP[win].label.toLowerCase();

  const rank = activeMembers.map((x) => ({ id: x.id, v: attainment(x, win).overall })).sort((p, q) => q.v - p.v).findIndex((x) => x.id === m.id) + 1;

  const summary: [string, number, string][] = [
    ["Meetings booked", tot.meetings, "calendar-check"],
    ["Replies", tot.replies, "message-square"],
    ["Avg / working day", Math.round(tot.total / workingDays(winSlice(m.series, win))), "activity"],
    ["Daily KPI total", CH_IDS.reduce((s, ch) => s + m.targets[ch], 0), "target"],
  ];

  return (
    <div className="fade" style={{ display: "grid", gap: 16 }}>
      <div className="between">
        <div className="row" style={{ gap: 14 }}>
          <Avatar name={m.name} pod={m.pod} size={52} />
          <div>
            <div className="row" style={{ gap: 10 }}>
              <span style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" }}>{m.name}</span>
              <StatusDot status={m.status} />
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 3 }}>{m.role} · {m.pod}{m.email ? " · " + m.email : ""}</div>
          </div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <span className="pill pill-soft" style={{ pointerEvents: "none" }}><Icon name="award" size={13} />Rank #{rank} of {activeMembers.length}</span>
          <button className="pill pill-soft" onClick={() => onEdit(m.id)}><Icon name="sliders-horizontal" size={13} />Edit targets</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto repeat(4,1fr)", gap: 16, alignItems: "center" }}>
        <Panel pad={16} style={{ display: "flex", justifyContent: "center" }}>
          <div className="col" style={{ alignItems: "center", gap: 6 }}>
            <Ring pct={a.overall} size={104} thickness={10} color={attColor(a.overall)} label="overall" />
            <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>{tot.total.toLocaleString()} / {a.tgt.total.toLocaleString()}</span>
          </div>
        </Panel>
        {CH_IDS.map((ch) => {
          const c = CH_MAP[ch];
          const pct = a.per[ch];
          return (
            <Panel key={ch} pad={16}>
              <div className="between" style={{ marginBottom: 12 }}>
                <span className="row" style={{ gap: 8, fontSize: 12, color: "var(--fg2)" }}>
                  <span className="row" style={{ width: 26, height: 26, borderRadius: 7, justifyContent: "center", background: c.color + "1f" }}><Icon name={c.icon} size={14} style={{ color: c.color }} /></span>
                  {c.label}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: attColor(pct) }}>{Math.round(pct * 100)}%</span>
              </div>
              <div className="row" style={{ alignItems: "baseline", gap: 6, marginBottom: 10, whiteSpace: "nowrap", flexWrap: "nowrap" }}>
                <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>{tot[ch].toLocaleString()}</span>
                <span style={{ fontSize: 12, color: "var(--fg-faint)" }}>/ {a.tgt[ch].toLocaleString()}</span>
              </div>
              <Meter pct={pct} color={c.color} />
            </Panel>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16 }}>
        <Panel title="Activity over time" sub={`${tot.total.toLocaleString()} touches this ${wlabel}`} right={<ChannelLegend />}>
          <TrendChart chart={chart} mode={trendMode} height={230} />
        </Panel>
        <Panel title="This period">
          <div className="col" style={{ gap: 0 }}>
            {summary.map(([l, v, ic], i) => (
              <div key={l} className="between" style={{ padding: "13px 0", borderTop: i ? "1px solid var(--border-subtle)" : "none" }}>
                <span className="row" style={{ gap: 9, fontSize: 12, color: "var(--fg2)" }}><Icon name={ic} size={15} style={{ color: "var(--fg-muted)" }} />{l}</span>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{v.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
