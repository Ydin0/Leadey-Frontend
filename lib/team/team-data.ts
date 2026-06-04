/**
 * Leadey — Team feature analytics helpers.
 *
 * Operates on a real 90-day daily activity series per rep (calls + meetings are
 * live from the backend; email/SMS/LinkedIn arrive with their integrations).
 * Every time window (today / week / month / quarter) and the leaderboard derive
 * from that one series. The series is fetched via GET /api/team/analytics.
 */

export type ChannelId = "calls" | "emails" | "sms" | "linkedin";
export type WindowId = "today" | "week" | "month" | "quarter";
export type MemberStatus = "active" | "away" | "ramping" | "pending";

export interface Channel {
  id: ChannelId;
  label: string;
  short: string;
  icon: string;
  color: string;
  verb: string;
}

export interface Targets {
  calls: number;
  emails: number;
  sms: number;
  linkedin: number;
}

export interface DayRec {
  date: Date;
  ts: number;
  calls: number;
  emails: number;
  sms: number;
  linkedin: number;
  meetings: number;
  replies: number;
  total: number;
}

export interface Member {
  id: string;
  name: string;
  role: string;
  pod: string;
  status: MemberStatus;
  email?: string;
  targets: Targets;
  series: DayRec[];
}

export interface TimeWindow {
  id: WindowId;
  label: string;
  short: string;
  days: number;
  bucket: "hour" | "day" | "week";
}

export interface Totals {
  calls: number;
  emails: number;
  sms: number;
  linkedin: number;
  meetings: number;
  replies: number;
  total: number;
}

export const CHANNELS: Channel[] = [
  { id: "calls", label: "Calls", short: "Calls", icon: "phone", color: "#86EFAC", verb: "dials" },
  { id: "emails", label: "Emails", short: "Email", icon: "mail", color: "#C8CFE6", verb: "emails" },
  { id: "sms", label: "SMS", short: "SMS", icon: "message-square", color: "#97A4D6", verb: "texts" },
  { id: "linkedin", label: "LinkedIn", short: "LI", icon: "linkedin", color: "#6E7BCB", verb: "messages" },
];
export const CH_IDS: ChannelId[] = CHANNELS.map((c) => c.id);
export const CH_MAP: Record<ChannelId, Channel> = Object.fromEntries(
  CHANNELS.map((c) => [c.id, c]),
) as Record<ChannelId, Channel>;

export const ROLE_TARGETS: Record<string, Targets> = {
  SDR: { calls: 60, emails: 80, sms: 25, linkedin: 30 },
  AE: { calls: 30, emails: 45, sms: 12, linkedin: 18 },
  Manager: { calls: 12, emails: 25, sms: 6, linkedin: 12 },
};

export const DAYS = 90;
const DAY_MS = 86400000;

/** Raw daily record from GET /api/team/analytics. */
export interface ApiDayRec {
  date: string;
  calls: number;
  emails: number;
  sms: number;
  linkedin: number;
  meetings: number;
  replies: number;
}

/** Convert a backend series into the DayRec shape the analytics engine uses. */
export function hydrateSeries(api: ApiDayRec[]): DayRec[] {
  return api.map((r) => {
    const total = (r.calls || 0) + (r.emails || 0) + (r.sms || 0) + (r.linkedin || 0);
    const date = new Date(r.date);
    return {
      date,
      ts: date.getTime(),
      calls: r.calls || 0,
      emails: r.emails || 0,
      sms: r.sms || 0,
      linkedin: r.linkedin || 0,
      meetings: r.meetings || 0,
      replies: r.replies || 0,
      total,
    };
  });
}

/** A zero-filled 90-day series anchored to today — used when a member has no
 *  activity rows yet, so windowing/charts still render (as zeros). */
export function emptySeries(): DayRec[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const days: DayRec[] = [];
  for (let i = 0; i < DAYS; i++) {
    const date = new Date(start.getTime() - (DAYS - 1 - i) * DAY_MS);
    days.push({ date, ts: date.getTime(), calls: 0, emails: 0, sms: 0, linkedin: 0, meetings: 0, replies: 0, total: 0 });
  }
  return days;
}

// ── time windows ────────────────────────────────────────────────────────
export const WINDOWS: TimeWindow[] = [
  { id: "today", label: "Today", short: "1D", days: 1, bucket: "day" },
  { id: "week", label: "Week", short: "1W", days: 7, bucket: "day" },
  { id: "month", label: "Month", short: "1M", days: 30, bucket: "day" },
  { id: "quarter", label: "Quarter", short: "1Q", days: 90, bucket: "week" },
];
export const WIN_MAP: Record<WindowId, TimeWindow> = Object.fromEntries(
  WINDOWS.map((w) => [w.id, w]),
) as Record<WindowId, TimeWindow>;

export function winSlice(series: DayRec[], winId: WindowId): DayRec[] {
  const w = WIN_MAP[winId];
  return series.slice(DAYS - w.days, DAYS);
}
export function prevSlice(series: DayRec[], winId: WindowId): DayRec[] {
  const w = WIN_MAP[winId];
  const end = DAYS - w.days;
  return series.slice(Math.max(0, end - w.days), end);
}
export function workingDays(slice: DayRec[]): number {
  return slice.filter((d) => { const x = d.date.getDay(); return x !== 0 && x !== 6; }).length || 1;
}

export function sumSlice(slice: DayRec[]): Totals {
  const out: Totals = { calls: 0, emails: 0, sms: 0, linkedin: 0, meetings: 0, replies: 0, total: 0 };
  slice.forEach((d) => { (Object.keys(out) as (keyof Totals)[]).forEach((k) => { out[k] += d[k] || 0; }); });
  return out;
}

export function targetFor(member: Member, winId: WindowId): Totals {
  const wd = winId === "today" ? 1 : workingDays(winSlice(member.series, winId));
  const t = { calls: 0, emails: 0, sms: 0, linkedin: 0, meetings: 0, replies: 0, total: 0 } as Totals;
  CH_IDS.forEach((ch) => { t[ch] = member.targets[ch] * wd; });
  t.total = CH_IDS.reduce((a, ch) => a + t[ch], 0);
  return t;
}

export interface Attainment {
  overall: number;
  per: Record<ChannelId, number>;
  got: Totals;
  tgt: Totals;
}
export function attainment(member: Member, winId: WindowId): Attainment {
  const got = sumSlice(winSlice(member.series, winId));
  const tgt = targetFor(member, winId);
  const per = {} as Record<ChannelId, number>;
  CH_IDS.forEach((ch) => { per[ch] = tgt[ch] ? got[ch] / tgt[ch] : 0; });
  return { overall: tgt.total ? got.total / tgt.total : 0, per, got, tgt };
}

export interface Bucketed {
  labels: string[];
  series: Record<ChannelId, number[]>;
  totals: number[];
}
export function bucketed(members: Member | Member[], winId: WindowId): Bucketed {
  const w = WIN_MAP[winId];
  const list = Array.isArray(members) ? members : [members];

  const slices = list.map((m) => winSlice(m.series, winId));
  const n = slices[0].length;
  if (w.bucket === "week") {
    const groups: [number, number][] = [];
    for (let i = 0; i < n; i += 7) groups.push([i, Math.min(n, i + 7)]);
    const labels = groups.map((_, i) => "W" + (i + 1));
    const series = {} as Record<ChannelId, number[]>;
    CH_IDS.forEach((ch) => (series[ch] = groups.map(() => 0)));
    groups.forEach(([a, b], gi) => slices.forEach((s) => { for (let i = a; i < b; i++) CH_IDS.forEach((ch) => (series[ch][gi] += s[i][ch] || 0)); }));
    const totals = labels.map((_, i) => CH_IDS.reduce((a, ch) => a + series[ch][i], 0));
    return { labels, series, totals };
  }

  const ref = slices[0];
  const labels = ref.map((d) => d.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  const series = {} as Record<ChannelId, number[]>;
  CH_IDS.forEach((ch) => (series[ch] = ref.map(() => 0)));
  slices.forEach((s) => s.forEach((d, i) => CH_IDS.forEach((ch) => (series[ch][i] += d[ch] || 0))));
  const totals = labels.map((_, i) => CH_IDS.reduce((a, ch) => a + series[ch][i], 0));
  return { labels, series, totals };
}

export interface TeamTotals {
  cur: Totals;
  prev: Totals;
  delta: Record<keyof Totals, number>;
}
export function teamTotals(members: Member[], winId: WindowId): TeamTotals {
  const cur: Totals = { calls: 0, emails: 0, sms: 0, linkedin: 0, meetings: 0, replies: 0, total: 0 };
  const prev: Totals = { ...cur };
  members.forEach((m) => {
    const c = sumSlice(winSlice(m.series, winId));
    const p = sumSlice(prevSlice(m.series, winId));
    (Object.keys(cur) as (keyof Totals)[]).forEach((k) => { cur[k] += c[k]; prev[k] += p[k]; });
  });
  const delta = {} as Record<keyof Totals, number>;
  (Object.keys(cur) as (keyof Totals)[]).forEach((k) => { delta[k] = prev[k] ? (cur[k] - prev[k]) / prev[k] : 0; });
  return { cur, prev, delta };
}

export function sparkFor(members: Member[], winId: WindowId, ch: ChannelId): number[] {
  return bucketed(members, winId).series[ch];
}

export function initialsOf(name: string): string {
  return name.split(/[\s@.]/).filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}
