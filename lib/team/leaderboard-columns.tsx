import type { ReactNode } from "react";
import { Sparkline, Meter, attColor } from "@/components/team/charts";
import { DeltaPill } from "@/components/team/team-shared";
import { fmtTalkTime, connectRate, sitRate, avgCallsPerBooking, type Attainment } from "./team-data";

export type LbGroup = "Activity" | "Outcomes" | "Performance";
export const LB_GROUP_ORDER: LbGroup[] = ["Activity", "Outcomes", "Performance"];

/** One row of the leaderboard, precomputed by the table. */
export interface LbRow {
  a: Attainment;
  spark: number[];
  trend: number;
}

export interface LbColumn {
  key: string;
  label: string;
  group: LbGroup;
  defaultVisible: boolean;
  /** The rankBy value this column corresponds to (bolded when active). */
  rankKey?: string;
  /** Cell renderer; `active` = this column is the current rank metric. */
  cell: (r: LbRow, active: boolean) => ReactNode;
}

const num = (n: number) => n.toLocaleString();
/** A right-aligned numeric cell that bolds when it's the active rank metric. */
function metric(value: ReactNode, active: boolean): ReactNode {
  return <span style={{ color: active ? "var(--fg1)" : "var(--fg2)", fontWeight: active ? 600 : 400 }}>{value}</span>;
}

export const LEADERBOARD_COLUMNS: LbColumn[] = [
  { key: "calls", label: "Calls", group: "Activity", defaultVisible: true, rankKey: "calls", cell: (r, a) => metric(num(r.a.got.calls), a) },
  { key: "emails", label: "Emails", group: "Activity", defaultVisible: true, rankKey: "emails", cell: (r, a) => metric(num(r.a.got.emails), a) },
  { key: "sms", label: "SMS", group: "Activity", defaultVisible: true, rankKey: "sms", cell: (r, a) => metric(num(r.a.got.sms), a) },
  { key: "linkedin", label: "LinkedIn", group: "Activity", defaultVisible: true, rankKey: "linkedin", cell: (r, a) => metric(num(r.a.got.linkedin), a) },
  { key: "total", label: "Total", group: "Activity", defaultVisible: true, rankKey: "volume", cell: (r) => <span style={{ fontWeight: 600 }}>{num(r.a.got.total)}</span> },
  { key: "connect", label: "Connect", group: "Performance", defaultVisible: true, rankKey: "connectRate", cell: (r, a) => metric(`${Math.round(connectRate(r.a.got) * 100)}%`, a) },
  { key: "voicemail", label: "VM", group: "Activity", defaultVisible: true, rankKey: "voicemail", cell: (r, a) => metric(num(r.a.got.voicemailCalls), a) },
  { key: "meetings", label: "Opps", group: "Outcomes", defaultVisible: true, rankKey: "meetings", cell: (r, a) => metric(num(r.a.got.meetings), a) },
  { key: "meetingsBooked", label: "Booked", group: "Outcomes", defaultVisible: true, rankKey: "meetingsBooked", cell: (r, a) => metric(num(r.a.got.meetingsBooked), a) },
  { key: "meetingsAttended", label: "Sat", group: "Outcomes", defaultVisible: true, rankKey: "meetingsAttended", cell: (r, a) => metric(num(r.a.got.meetingsAttended), a) },
  {
    key: "sitRate", label: "Sit rate", group: "Outcomes", defaultVisible: true, rankKey: "sitRate",
    cell: (r) => {
      const sr = sitRate(r.a.got);
      const n = r.a.got.meetingsAttended + r.a.got.meetingsNoShow;
      if (sr == null) return <span style={{ color: "var(--fg-faint)" }}>—</span>;
      return <span style={{ color: attColor(sr) }}>{Math.round(sr * 100)}%<span style={{ color: "var(--fg-faint)", fontWeight: 400, fontSize: 10, marginLeft: 4 }}>({n})</span></span>;
    },
  },
  { key: "meetingsNoShow", label: "No-shows", group: "Outcomes", defaultVisible: false, rankKey: "meetingsNoShow", cell: (r, a) => metric(num(r.a.got.meetingsNoShow), a) },
  {
    key: "avgCallsPerBooking", label: "Calls / booking", group: "Outcomes", defaultVisible: false, rankKey: "avgCallsPerBooking",
    cell: (r) => {
      const v = avgCallsPerBooking(r.a.got);
      return v == null ? <span style={{ color: "var(--fg-faint)" }}>—</span> : <span style={{ color: "var(--fg2)" }}>{v.toFixed(1)}</span>;
    },
  },
  { key: "talkTime", label: "Talk time", group: "Activity", defaultVisible: true, rankKey: "talkTime", cell: (r, a) => metric(fmtTalkTime(r.a.got.talkTime), a) },
  {
    key: "attainment", label: "Attainment", group: "Performance", defaultVisible: true, rankKey: "attainment",
    cell: (r) => (
      <div className="row" style={{ gap: 9, minWidth: 130 }}>
        <div className="grow"><Meter pct={r.a.overall} /></div>
        <span style={{ width: 36, textAlign: "right", fontSize: 11.5, fontWeight: 600, color: attColor(r.a.overall) }}>{Math.round(r.a.overall * 100)}%</span>
      </div>
    ),
  },
  {
    key: "trend", label: "Trend", group: "Performance", defaultVisible: true,
    cell: (r) => (
      <div className="row" style={{ gap: 7 }}>
        <Sparkline data={r.spark} color={r.trend >= 0 ? "var(--signal-green-text)" : "var(--signal-red-text)"} width={48} height={20} />
        <DeltaPill d={r.trend} />
      </div>
    ),
  },
];

export interface LbColumnPrefs { order: string[]; hidden: string[] }

/** Merge stored prefs with the catalog → ordered [{col, visible}] (mirrors the
 *  campaigns lead-column resolver). New catalog columns append at defaults. */
export function resolveLbColumns(prefs: LbColumnPrefs | null): { col: LbColumn; visible: boolean }[] {
  const byKey = new Map(LEADERBOARD_COLUMNS.map((c) => [c.key, c]));
  const ordered: LbColumn[] = [];
  const seen = new Set<string>();
  const known = new Set(prefs?.order ?? []);
  if (prefs) for (const k of prefs.order) { const c = byKey.get(k); if (c && !seen.has(k)) { ordered.push(c); seen.add(k); } }
  for (const c of LEADERBOARD_COLUMNS) if (!seen.has(c.key)) { ordered.push(c); seen.add(c.key); }
  const hidden = new Set(prefs?.hidden ?? []);
  return ordered.map((col) => ({
    col,
    visible: !prefs ? col.defaultVisible : known.has(col.key) ? !hidden.has(col.key) : col.defaultVisible,
  }));
}
