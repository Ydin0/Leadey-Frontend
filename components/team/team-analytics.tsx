"use client";

import { useState } from "react";
import { Icon } from "./icon";
import { MetricCard, Panel, ChannelLegend, Avatar, DeltaPill } from "./team-shared";
import { TrendChart, Donut, Ring, Meter, attColor } from "./charts";
import {
  CH_IDS, CH_MAP, teamTotals, bucketed, attainment, sparkForMetric, fmtTalkTime,
  connectRate, connectRateSparkFor, departmentColor, sitRate,
  type DayRange, type Member, type TeamTotals,
} from "@/lib/team/team-data";
import { useTeamData } from "@/lib/team/team-data-context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { CATALOG_BY_ID, type MetricCardDef } from "@/lib/team/metric-catalog";
import { AnalyticsCardsDrawer } from "./analytics-cards-drawer";

/** Resolve a catalog card to display props for the given totals + range. */
function cardView(def: MetricCardDef, tot: TeamTotals, members: Member[], range: DayRange) {
  if (def.kind === "percent") {
    const cur = connectRate(tot.cur), prev = connectRate(tot.prev);
    return { value: `${Math.round(cur * 100)}%`, delta: prev ? (cur - prev) / prev : 0, spark: connectRateSparkFor(members, range) };
  }
  if (def.kind === "sitrate") {
    const cur = sitRate(tot.cur), prev = sitRate(tot.prev);
    return {
      value: cur == null ? "—" : `${Math.round(cur * 100)}%`,
      delta: cur != null && prev != null && prev > 0 ? (cur - prev) / prev : 0,
      spark: sparkForMetric(members, range, "meetingsAttended"),
    };
  }
  const key = def.metricKey!;
  const raw = tot.cur[key];
  return {
    value: def.kind === "duration" ? fmtTalkTime(raw) : raw.toLocaleString(),
    delta: tot.delta[key],
    spark: sparkForMetric(members, range, key),
  };
}

// Talk time accent (warm amber) — used by the Top performers row below.
const TALK_COLOR = "#E0A878";

export function TeamAnalytics({ range, rangeLabel, trendMode, onPickRep }: {
  range: DayRange; rangeLabel: string; trendMode: "area" | "bars"; onPickRep: (id: string) => void;
}) {
  const { filteredMembers: members, activeMembers, departments, cardIds, saveCards } = useTeamData();
  const { has } = usePermissions();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const canEdit = has("settings.manageTeam");
  if (members.length === 0) {
    return (
      <div className="card fade" style={{ padding: 48, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--fg-muted)" }}>
          {activeMembers.length === 0
            ? "No active reps yet. Invite your team to see activity here."
            : "No reps match the current filter. Adjust or clear it to see activity."}
        </p>
      </div>
    );
  }
  const tot = teamTotals(members, range);
  const chart = bucketed(members, range);

  const att = members.reduce((acc, m) => {
    const a = attainment(m, range);
    acc.got += a.got.total; acc.tgt += a.tgt.total; return acc;
  }, { got: 0, tgt: 0 });
  const overallPct = att.tgt ? att.got / att.tgt : 0;
  const onTrack = members.filter((m) => attainment(m, range).overall >= 0.85).length;

  const mixParts = CH_IDS.map((ch) => ({ label: CH_MAP[ch].label, value: tot.cur[ch], color: CH_MAP[ch].color }));
  const mixTotal = mixParts.reduce((a, p) => a + p.value, 0);

  const podRows = departments.map((d) => {
    const ms = members.filter((m) => m.pod === d.name);
    const c = ms.reduce((acc, m) => { const a = attainment(m, range); acc.got += a.got.total; acc.tgt += a.tgt.total; acc.vol += a.got.total; return acc; }, { got: 0, tgt: 0, vol: 0 });
    return { pod: d.name, count: ms.length, pct: c.tgt ? c.got / c.tgt : 0, vol: c.vol };
  });

  const ranked = members.map((m) => ({ m, a: attainment(m, range) })).sort((x, y) => y.a.overall - x.a.overall);

  const cards = cardIds.map((id) => CATALOG_BY_ID[id]).filter(Boolean) as MetricCardDef[];

  return (
    <div className="fade" style={{ display: "grid", gap: 16 }}>
      <div className="between" style={{ gap: 7 }}>
        <div className="row" style={{ gap: 7, fontSize: 11, color: "var(--fg-faint)" }}>
          <Icon name="activity" size={12} />
          Calls, talk time, emails &amp; SMS are tracked live, split by inbound / outbound.
        </div>
        {canEdit && (
          <button className="seg-btn row" style={{ gap: 6, fontSize: 11 }} onClick={() => setCustomizeOpen(true)}>
            <Icon name="sliders-horizontal" size={12} /> Customize
          </button>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>
        {cards.map((def) => {
          const v = cardView(def, tot, members, range);
          return <MetricCard key={def.id} label={def.label} icon={def.icon} color={def.color} value={v.value} delta={v.delta} spark={v.spark} />;
        })}
      </div>

      {canEdit && (
        <AnalyticsCardsDrawer open={customizeOpen} onClose={() => setCustomizeOpen(false)} selected={cardIds} onSave={saveCards} />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16 }}>
        <Panel title="Activity over time" sub={`${tot.cur.total.toLocaleString()} total touches · ${rangeLabel}`} right={<ChannelLegend />}>
          <TrendChart chart={chart} mode={trendMode} height={236} />
        </Panel>

        <Panel title="Channel mix">
          <div className="row" style={{ justifyContent: "center", marginTop: 4, marginBottom: 8 }}>
            <Donut parts={mixParts} size={150} thickness={18} centerLabel={mixTotal >= 1000 ? (mixTotal / 1000).toFixed(1) + "k" : mixTotal} centerSub="touches" />
          </div>
          <div className="col" style={{ gap: 9, marginTop: 6 }}>
            {mixParts.map((p) => (
              <div key={p.label} className="between" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                <span className="row" style={{ gap: 7, color: "var(--fg2)" }}><span style={{ width: 9, height: 9, borderRadius: 3, background: p.color }}></span>{p.label}</span>
                <span style={{ color: "var(--fg-muted)" }}>{p.value.toLocaleString()}<span style={{ color: "var(--fg-faint)", marginLeft: 6 }}>{mixTotal ? Math.round((p.value / mixTotal) * 100) : 0}%</span></span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: 16 }}>
        <Panel title="Team attainment">
          <div className="row" style={{ gap: 16 }}>
            <Ring pct={overallPct} size={92} thickness={9} color={attColor(overallPct)} />
            <div className="col" style={{ gap: 10, justifyContent: "center" }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1, color: attColor(overallPct) }}>{Math.round(overallPct * 100)}%</div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 3 }}>of KPI target</div>
              </div>
              <div className="row" style={{ gap: 6, fontSize: 11, color: "var(--fg2)" }}>
                <Icon name="check-circle-2" size={13} style={{ color: "var(--signal-green-text)" }} />
                {onTrack}/{members.length} reps on track
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Outcomes">
          <div className="col" style={{ gap: 16, marginTop: 2 }}>
            {([["Meetings booked", tot.cur.meetingsBooked.toLocaleString(), tot.delta.meetingsBooked, "calendar-check"],
              ["Sit rate", (() => { const sr = sitRate(tot.cur); const n = tot.cur.meetingsAttended + tot.cur.meetingsNoShow; return sr == null ? "—" : `${Math.round(sr * 100)}% · ${n}`; })(), (() => { const c = sitRate(tot.cur), p = sitRate(tot.prev); return c != null && p != null && p > 0 ? (c - p) / p : 0; })(), "user-check"],
              ["Opportunities created", tot.cur.meetings.toLocaleString(), tot.delta.meetings, "briefcase"],
              ["Replies", tot.cur.replies.toLocaleString(), tot.delta.replies, "message-square"]] as const).map(([l, v, d, ic]) => (
              <div key={l} className="between">
                <span className="row" style={{ gap: 9, color: "var(--fg2)", fontSize: 12 }}>
                  <Icon name={ic} size={15} style={{ color: "var(--fg-muted)" }} />{l}
                </span>
                <span className="row" style={{ gap: 10 }}>
                  <span style={{ fontSize: 20, fontWeight: 600 }}>{v}</span>
                  <DeltaPill d={d} />
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="By department">
          <div className="col" style={{ gap: 13, marginTop: 2 }}>
            {podRows.map((r) => (
              <div key={r.pod}>
                <div className="between" style={{ marginBottom: 6 }}>
                  <span className="row" style={{ gap: 7, fontSize: 12, color: "var(--fg2)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: departmentColor(r.pod, departments) }}></span>{r.pod}
                    <span style={{ color: "var(--fg-faint)", fontSize: 11 }}>· {r.count}</span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: attColor(r.pct) }}>{Math.round(r.pct * 100)}%</span>
                </div>
                <Meter pct={r.pct} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Top performers" sub="Ranked by KPI attainment">
        <div className="col" style={{ gap: 2 }}>
          {ranked.slice(0, 5).map((r, i) => (
            <div key={r.m.id} className="between" onClick={() => onPickRep(r.m.id)}
              style={{ padding: "9px 8px", borderRadius: 8, cursor: "pointer", transition: "background .12s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <div className="row" style={{ gap: 12 }}>
                <span style={{ width: 18, textAlign: "center", fontSize: 12, fontWeight: 700, color: i < 3 ? "var(--accent)" : "var(--fg-faint)" }}>{i + 1}</span>
                <Avatar name={r.m.name} pod={r.m.pod} size={28} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{r.m.name}</div>
                  <div style={{ fontSize: 10, color: "var(--fg-muted)" }}>{r.m.role} · {r.m.pod}</div>
                </div>
              </div>
              <div className="row" style={{ gap: 16 }}>
                <span className="row" style={{ gap: 5, fontSize: 11, color: "var(--fg-muted)" }} title="Talk time">
                  <Icon name="clock" size={12} style={{ color: TALK_COLOR }} />{fmtTalkTime(r.a.got.talkTime)}
                </span>
                <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>{r.a.got.total.toLocaleString()} touches</span>
                <div style={{ width: 90 }}><Meter pct={r.a.overall} /></div>
                <span style={{ width: 40, textAlign: "right", fontSize: 12, fontWeight: 600, color: attColor(r.a.overall) }}>{Math.round(r.a.overall * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
