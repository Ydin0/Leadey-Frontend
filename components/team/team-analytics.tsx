"use client";

import { Icon } from "./icon";
import { StatCard, MetricCard, Panel, ChannelLegend, Avatar, DeltaPill, POD_COLOR } from "./team-shared";
import { TrendChart, Donut, Ring, Meter, attColor } from "./charts";
import {
  CH_IDS, CH_MAP, teamTotals, bucketed, attainment, sparkFor, talkSparkFor, meetingsSparkFor, fmtTalkTime,
  type DayRange,
} from "@/lib/team/team-data";
import { useTeamData } from "@/lib/team/team-data-context";

// Talk time gets its own accent (warm amber) so it reads as a duration metric
// distinct from the green "Calls" channel it derives from.
const TALK_COLOR = "#E0A878";
// Opportunities created — the headline conversion metric (signal green).
const OPP_COLOR = "#6FBEA8";

export function TeamAnalytics({ range, rangeLabel, trendMode, onPickRep }: {
  range: DayRange; rangeLabel: string; trendMode: "area" | "bars"; onPickRep: (id: string) => void;
}) {
  const { activeMembers: members } = useTeamData();
  if (members.length === 0) {
    return (
      <div className="card fade" style={{ padding: 48, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--fg-muted)" }}>No active reps yet. Invite your team to see activity here.</p>
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

  const pods = ["Enterprise", "Mid-Market", "SMB"];
  const podRows = pods.map((p) => {
    const ms = members.filter((m) => m.pod === p);
    const c = ms.reduce((acc, m) => { const a = attainment(m, range); acc.got += a.got.total; acc.tgt += a.tgt.total; acc.vol += a.got.total; return acc; }, { got: 0, tgt: 0, vol: 0 });
    return { pod: p, count: ms.length, pct: c.tgt ? c.got / c.tgt : 0, vol: c.vol };
  });

  const ranked = members.map((m) => ({ m, a: attainment(m, range) })).sort((x, y) => y.a.overall - x.a.overall);

  return (
    <div className="fade" style={{ display: "grid", gap: 16 }}>
      <div className="row" style={{ gap: 7, fontSize: 11, color: "var(--fg-faint)" }}>
        <Icon name="activity" size={12} />
        Calls, talk time &amp; opportunities are tracked live. Email, SMS &amp; LinkedIn populate once their integrations are connected.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 14 }}>
        {CH_IDS.map((ch) => (
          <StatCard key={ch} ch={ch} total={tot.cur[ch]} delta={tot.delta[ch]} spark={sparkFor(members, range, ch)} />
        ))}
        <MetricCard
          label="Talk time"
          icon="clock"
          color={TALK_COLOR}
          value={fmtTalkTime(tot.cur.talkTime)}
          delta={tot.delta.talkTime}
          spark={talkSparkFor(members, range)}
        />
        <MetricCard
          label="Opportunities"
          icon="briefcase"
          color={OPP_COLOR}
          value={tot.cur.meetings.toLocaleString()}
          delta={tot.delta.meetings}
          spark={meetingsSparkFor(members, range)}
        />
      </div>

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
            {([["Talk time", fmtTalkTime(tot.cur.talkTime), tot.delta.talkTime, "clock"],
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

        <Panel title="By pod">
          <div className="col" style={{ gap: 13, marginTop: 2 }}>
            {podRows.map((r) => (
              <div key={r.pod}>
                <div className="between" style={{ marginBottom: 6 }}>
                  <span className="row" style={{ gap: 7, fontSize: 12, color: "var(--fg2)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: POD_COLOR[r.pod] }}></span>{r.pod}
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
