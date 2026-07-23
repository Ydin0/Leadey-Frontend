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
  /** The day this record belongs to as a YYYY-MM-DD key (the backend's UTC
   *  bucket date). Range filtering compares on this — never raw timestamps —
   *  so it stays correct regardless of the viewer's timezone. */
  dayKey: string;
  calls: number;
  callsInbound: number;
  callsOutbound: number;
  /** Calls a person picked up (talk time > 0, not voicemail). */
  connectedCalls: number;
  /** Calls that reached voicemail. */
  voicemailCalls: number;
  /** Seconds spent on calls that day (sum of call durations). */
  talkTime: number;
  talkTimeInbound: number;
  talkTimeOutbound: number;
  emails: number;
  emailsInbound: number;
  emailsOutbound: number;
  sms: number;
  smsInbound: number;
  smsOutbound: number;
  linkedin: number;
  meetings: number;
  /** Meetings booked through the Leadey booking flow, credited to this rep
   *  (bucketed by the day booked). */
  meetingsBooked: number;
  /** Of the meetings this rep booked, how many were dispositioned attended /
   *  no-show (bucketed by the day the meeting occurred). Drives sit rate. */
  meetingsAttended: number;
  meetingsNoShow: number;
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
  callsInbound: number;
  callsOutbound: number;
  /** Calls a person picked up (not voicemail). */
  connectedCalls: number;
  /** Calls that reached voicemail. */
  voicemailCalls: number;
  /** Seconds spent on calls (sum of call durations). */
  talkTime: number;
  talkTimeInbound: number;
  talkTimeOutbound: number;
  emails: number;
  emailsInbound: number;
  emailsOutbound: number;
  sms: number;
  smsInbound: number;
  smsOutbound: number;
  linkedin: number;
  meetings: number;
  meetingsBooked: number;
  meetingsAttended: number;
  meetingsNoShow: number;
  replies: number;
  total: number;
}

/** Numeric metric keys on Totals/DayRec that a card can display. */
export type MetricKey =
  | "calls" | "callsInbound" | "callsOutbound"
  | "connectedCalls" | "voicemailCalls"
  | "talkTime" | "talkTimeInbound" | "talkTimeOutbound"
  | "emails" | "emailsInbound" | "emailsOutbound"
  | "sms" | "smsInbound" | "smsOutbound"
  | "linkedin" | "meetings"
  | "meetingsBooked" | "meetingsAttended" | "meetingsNoShow"
  | "replies" | "total";

/** Sit rate = attended / (attended + no-show) over dispositioned meetings the
 *  rep booked. null when nothing has been dispositioned yet (show "—"). */
export function sitRate(t: Pick<Totals, "meetingsAttended" | "meetingsNoShow">): number | null {
  const denom = t.meetingsAttended + t.meetingsNoShow;
  return denom > 0 ? t.meetingsAttended / denom : null;
}

/** Average number of calls made per meeting booked. null when no bookings yet. */
export function avgCallsPerBooking(t: Pick<Totals, "calls" | "meetingsBooked">): number | null {
  return t.meetingsBooked > 0 ? t.calls / t.meetingsBooked : null;
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

/** Default departments (formerly "pods") — seeded for orgs that haven't
 *  customised theirs yet, and used as a client-side fallback. */
export const DEFAULT_DEPARTMENTS: { name: string; color: string }[] = [
  { name: "Enterprise", color: "#97A4D6" },
  { name: "Mid-Market", color: "#86EFAC" },
  { name: "SMB", color: "#6E7BCB" },
];

const DEPT_FALLBACK_COLORS = [
  "#97A4D6", "#86EFAC", "#6E7BCB", "#E0A878", "#C58FD6", "#5FB6C9", "#E08FA8", "#6FBEA8",
];

/** Resolve a department name to its colour from the org's list, with a stable
 *  deterministic fallback for names not in the list (e.g. just-renamed). */
export function departmentColor(
  name: string,
  departments: { name: string; color: string }[],
): string {
  const found = departments.find((d) => d.name === name);
  if (found) return found.color;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return DEPT_FALLBACK_COLORS[Math.abs(hash) % DEPT_FALLBACK_COLORS.length];
}

export const ROLE_TARGETS: Record<string, Targets> = {
  SDR: { calls: 60, emails: 80, sms: 25, linkedin: 30 },
  AE: { calls: 30, emails: 45, sms: 12, linkedin: 18 },
  Manager: { calls: 12, emails: 25, sms: 6, linkedin: 12 },
};

// We fetch a full rolling year so the calendar can select any single date or
// custom range within the last 12 months without a refetch. Presets (1D/1W/
// 1M/1Q) just slice the tail of this same series.
export const DAYS = 365;
const DAY_MS = 86400000;

/** Raw daily record from GET /api/team/analytics. */
export interface ApiDayRec {
  date: string;
  calls: number;
  callsInbound?: number;
  callsOutbound?: number;
  connectedCalls?: number;
  voicemailCalls?: number;
  talkTime: number;
  talkTimeInbound?: number;
  talkTimeOutbound?: number;
  emails: number;
  emailsInbound?: number;
  emailsOutbound?: number;
  sms: number;
  smsInbound?: number;
  smsOutbound?: number;
  linkedin: number;
  meetings: number;
  meetingsBooked?: number;
  meetingsAttended?: number;
  meetingsNoShow?: number;
  replies: number;
}

/** A YYYY-MM-DD key from a date's LOCAL calendar components — used for range
 *  bounds so "the day the user picked" matches the backend's date buckets. */
export function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Convert a backend series into the DayRec shape the analytics engine uses. */
export function hydrateSeries(api: ApiDayRec[]): DayRec[] {
  return api.map((r) => {
    const total = (r.calls || 0) + (r.emails || 0) + (r.sms || 0) + (r.linkedin || 0);
    const date = new Date(r.date);
    return {
      date,
      ts: date.getTime(),
      dayKey: r.date.slice(0, 10), // backend ISO is UTC-midnight → its date part
      calls: r.calls || 0,
      callsInbound: r.callsInbound || 0,
      callsOutbound: r.callsOutbound || 0,
      connectedCalls: r.connectedCalls || 0,
      voicemailCalls: r.voicemailCalls || 0,
      talkTime: r.talkTime || 0,
      talkTimeInbound: r.talkTimeInbound || 0,
      talkTimeOutbound: r.talkTimeOutbound || 0,
      emails: r.emails || 0,
      emailsInbound: r.emailsInbound || 0,
      emailsOutbound: r.emailsOutbound || 0,
      sms: r.sms || 0,
      smsInbound: r.smsInbound || 0,
      smsOutbound: r.smsOutbound || 0,
      linkedin: r.linkedin || 0,
      meetings: r.meetings || 0,
      meetingsBooked: r.meetingsBooked || 0,
      meetingsAttended: r.meetingsAttended || 0,
      meetingsNoShow: r.meetingsNoShow || 0,
      replies: r.replies || 0,
      total,
    };
  });
}

/** A zero-filled series spanning the fetch window, anchored to today — used
 *  when a member has no activity rows yet, so windowing/charts still render. */
export function emptySeries(): DayRec[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const days: DayRec[] = [];
  for (let i = 0; i < DAYS; i++) {
    const date = new Date(start.getTime() - (DAYS - 1 - i) * DAY_MS);
    days.push({ date, ts: date.getTime(), dayKey: localDayKey(date), calls: 0, callsInbound: 0, callsOutbound: 0, connectedCalls: 0, voicemailCalls: 0, talkTime: 0, talkTimeInbound: 0, talkTimeOutbound: 0, emails: 0, emailsInbound: 0, emailsOutbound: 0, sms: 0, smsInbound: 0, smsOutbound: 0, linkedin: 0, meetings: 0, meetingsBooked: 0, meetingsAttended: 0, meetingsNoShow: 0, replies: 0, total: 0 });
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

// ── date ranges ─────────────────────────────────────────────────────────
// The engine works on an explicit [start, end] day range (inclusive, local
// midnight). Presets resolve to a today-anchored range; the calendar supplies
// an arbitrary one. Everything downstream (slices, targets, buckets, deltas)
// derives from the range, so a single day and a custom period work uniformly.
export interface DayRange {
  start: Date; // inclusive, local midnight
  end: Date;   // inclusive, local midnight
}

/** Today-anchored range for a preset window (e.g. "week" → last 7 days). */
export function windowRange(winId: WindowId): DayRange {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - (WIN_MAP[winId].days - 1) * DAY_MS);
  return { start, end };
}

/** Normalise an arbitrary pair of dates into an ordered, midnight-aligned range. */
export function makeRange(a: Date, b: Date): DayRange {
  const x = new Date(a); x.setHours(0, 0, 0, 0);
  const y = new Date(b); y.setHours(0, 0, 0, 0);
  return x.getTime() <= y.getTime() ? { start: x, end: y } : { start: y, end: x };
}

/** Inclusive day count in a range. */
export function rangeDays(r: DayRange): number {
  return Math.round((r.end.getTime() - r.start.getTime()) / DAY_MS) + 1;
}

/** The equal-length period immediately before the range (for delta comparisons). */
export function prevRange(r: DayRange): DayRange {
  const len = rangeDays(r);
  const end = new Date(r.start.getTime() - DAY_MS);
  const start = new Date(end.getTime() - (len - 1) * DAY_MS);
  return { start, end };
}

/** Bucket granularity for charts — daily for short ranges, weekly past ~6 weeks. */
export function bucketMode(r: DayRange): "day" | "week" {
  return rangeDays(r) > 45 ? "week" : "day";
}

/** The days of a series that fall within the range (inclusive). Compares on
 *  YYYY-MM-DD calendar keys (not timestamps) so the viewer's timezone never
 *  shifts a day out of the selected window — e.g. "Today" / a single picked
 *  date matches the backend's UTC day bucket regardless of offset. */
export function sliceRange(series: DayRec[], r: DayRange): DayRec[] {
  const lo = localDayKey(r.start);
  const hi = localDayKey(r.end);
  return series.filter((d) => d.dayKey >= lo && d.dayKey <= hi);
}

/** Human label for a range, e.g. "12 Jun" (single day) or "1–15 Jun". */
export function fmtRange(r: DayRange): string {
  const sameDay = r.start.getTime() === r.end.getTime();
  const d = (x: Date, withMonth = true) =>
    x.toLocaleDateString("en-GB", withMonth ? { day: "numeric", month: "short" } : { day: "numeric" });
  if (sameDay) return d(r.start);
  const sameMonth = r.start.getMonth() === r.end.getMonth() && r.start.getFullYear() === r.end.getFullYear();
  const sameYear = r.start.getFullYear() === r.end.getFullYear();
  if (sameMonth) return `${d(r.start, false)}–${d(r.end)}`;
  return sameYear ? `${d(r.start)} – ${d(r.end)}` : `${r.start.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })} – ${r.end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}`;
}

export function workingDays(slice: DayRec[]): number {
  return slice.filter((d) => { const x = d.date.getDay(); return x !== 0 && x !== 6; }).length || 1;
}

export function sumSlice(slice: DayRec[]): Totals {
  const out: Totals = { calls: 0, callsInbound: 0, callsOutbound: 0, connectedCalls: 0, voicemailCalls: 0, talkTime: 0, talkTimeInbound: 0, talkTimeOutbound: 0, emails: 0, emailsInbound: 0, emailsOutbound: 0, sms: 0, smsInbound: 0, smsOutbound: 0, linkedin: 0, meetings: 0, meetingsBooked: 0, meetingsAttended: 0, meetingsNoShow: 0, replies: 0, total: 0 };
  slice.forEach((d) => { (Object.keys(out) as (keyof Totals)[]).forEach((k) => { out[k] += d[k] || 0; }); });
  return out;
}

export function targetFor(member: Member, range: DayRange): Totals {
  const wd = Math.max(1, workingDays(sliceRange(member.series, range)));
  const t = { calls: 0, callsInbound: 0, callsOutbound: 0, connectedCalls: 0, voicemailCalls: 0, talkTime: 0, talkTimeInbound: 0, talkTimeOutbound: 0, emails: 0, emailsInbound: 0, emailsOutbound: 0, sms: 0, smsInbound: 0, smsOutbound: 0, linkedin: 0, meetings: 0, meetingsBooked: 0, meetingsAttended: 0, meetingsNoShow: 0, replies: 0, total: 0 } as Totals;
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
export function attainment(member: Member, range: DayRange): Attainment {
  const got = sumSlice(sliceRange(member.series, range));
  const tgt = targetFor(member, range);
  const per = {} as Record<ChannelId, number>;
  CH_IDS.forEach((ch) => { per[ch] = tgt[ch] ? got[ch] / tgt[ch] : 0; });
  return { overall: tgt.total ? got.total / tgt.total : 0, per, got, tgt };
}

export interface Bucketed {
  labels: string[];
  series: Record<ChannelId, number[]>;
  totals: number[];
  /** Talk time (seconds) per bucket — parallels totals, for talk-time sparklines. */
  talk: number[];
  /** Opportunities created per bucket — for the opportunities sparkline. */
  meetings: number[];
  /** Connected (human pickup) calls per bucket. */
  connected: number[];
  /** Voicemail-bound calls per bucket. */
  voicemail: number[];
}
export function bucketed(members: Member | Member[], range: DayRange): Bucketed {
  const list = Array.isArray(members) ? members : [members];

  const slices = list.map((m) => sliceRange(m.series, range));
  const n = slices[0]?.length ?? 0;
  if (bucketMode(range) === "week") {
    const groups: [number, number][] = [];
    for (let i = 0; i < n; i += 7) groups.push([i, Math.min(n, i + 7)]);
    const labels = groups.map((_, i) => "W" + (i + 1));
    const series = {} as Record<ChannelId, number[]>;
    CH_IDS.forEach((ch) => (series[ch] = groups.map(() => 0)));
    const talk = groups.map(() => 0);
    const meetings = groups.map(() => 0);
    const connected = groups.map(() => 0);
    const voicemail = groups.map(() => 0);
    groups.forEach(([a, b], gi) => slices.forEach((s) => { for (let i = a; i < b; i++) { CH_IDS.forEach((ch) => (series[ch][gi] += s[i][ch] || 0)); talk[gi] += s[i].talkTime || 0; meetings[gi] += s[i].meetings || 0; connected[gi] += s[i].connectedCalls || 0; voicemail[gi] += s[i].voicemailCalls || 0; } }));
    const totals = labels.map((_, i) => CH_IDS.reduce((a, ch) => a + series[ch][i], 0));
    return { labels, series, totals, talk, meetings, connected, voicemail };
  }

  const ref = slices[0] ?? [];
  const labels = ref.map((d) => d.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  const series = {} as Record<ChannelId, number[]>;
  CH_IDS.forEach((ch) => (series[ch] = ref.map(() => 0)));
  const talk = ref.map(() => 0);
  const meetings = ref.map(() => 0);
  const connected = ref.map(() => 0);
  const voicemail = ref.map(() => 0);
  slices.forEach((s) => s.forEach((d, i) => { CH_IDS.forEach((ch) => (series[ch][i] += d[ch] || 0)); talk[i] += d.talkTime || 0; meetings[i] += d.meetings || 0; connected[i] += d.connectedCalls || 0; voicemail[i] += d.voicemailCalls || 0; }));
  const totals = labels.map((_, i) => CH_IDS.reduce((a, ch) => a + series[ch][i], 0));
  return { labels, series, totals, talk, meetings, connected, voicemail };
}

export interface TeamTotals {
  cur: Totals;
  prev: Totals;
  delta: Record<keyof Totals, number>;
}
export function teamTotals(members: Member[], range: DayRange): TeamTotals {
  const cur: Totals = { calls: 0, callsInbound: 0, callsOutbound: 0, connectedCalls: 0, voicemailCalls: 0, talkTime: 0, talkTimeInbound: 0, talkTimeOutbound: 0, emails: 0, emailsInbound: 0, emailsOutbound: 0, sms: 0, smsInbound: 0, smsOutbound: 0, linkedin: 0, meetings: 0, meetingsBooked: 0, meetingsAttended: 0, meetingsNoShow: 0, replies: 0, total: 0 };
  const prev: Totals = { ...cur };
  const pr = prevRange(range);
  members.forEach((m) => {
    const c = sumSlice(sliceRange(m.series, range));
    const p = sumSlice(sliceRange(m.series, pr));
    (Object.keys(cur) as (keyof Totals)[]).forEach((k) => { cur[k] += c[k]; prev[k] += p[k]; });
  });
  const delta = {} as Record<keyof Totals, number>;
  (Object.keys(cur) as (keyof Totals)[]).forEach((k) => { delta[k] = prev[k] ? (cur[k] - prev[k]) / prev[k] : 0; });
  return { cur, prev, delta };
}

export function sparkFor(members: Member[], range: DayRange, ch: ChannelId): number[] {
  return bucketed(members, range).series[ch];
}

/** Per-bucket sparkline for ANY numeric metric key (powers the customizable
 *  stat cards). Reuses the same day/week bucketing as bucketed(). */
export function sparkForMetric(members: Member[], range: DayRange, key: MetricKey): number[] {
  const slices = members.map((m) => sliceRange(m.series, range));
  const n = slices[0]?.length ?? 0;
  if (bucketMode(range) === "week") {
    const groups: [number, number][] = [];
    for (let i = 0; i < n; i += 7) groups.push([i, Math.min(n, i + 7)]);
    return groups.map(([a, b]) => {
      let sum = 0;
      slices.forEach((s) => { for (let i = a; i < b; i++) sum += s[i]?.[key] || 0; });
      return sum;
    });
  }
  const ref = slices[0] ?? [];
  return ref.map((_, i) => slices.reduce((acc, s) => acc + (s[i]?.[key] || 0), 0));
}

/** Per-bucket opportunities-created series for the opportunities sparkline. */
export function meetingsSparkFor(members: Member[], range: DayRange): number[] {
  return bucketed(members, range).meetings;
}

/** Per-bucket talk-time series (seconds) for the talk-time stat-card sparkline. */
export function talkSparkFor(members: Member[], range: DayRange): number[] {
  return bucketed(members, range).talk;
}

/** Connect rate = share of dials where a person actually picked up (excludes
 *  voicemail and unanswered). Returned as a 0..1 fraction. */
export function connectRate(t: Totals): number {
  return t.calls > 0 ? t.connectedCalls / t.calls : 0;
}

/** Per-bucket connect-rate series (%) for the connect-rate stat-card sparkline. */
export function connectRateSparkFor(members: Member[], range: DayRange): number[] {
  const b = bucketed(members, range);
  return b.connected.map((c, i) => (b.totals[i] ? Math.round((c / Math.max(1, sumCalls(b, i))) * 100) : 0));
}

/** Total dials in a bucket (the calls channel only, not all touches). */
function sumCalls(b: Bucketed, i: number): number {
  return b.series.calls?.[i] ?? 0;
}

/** Per-bucket voicemail-count series for the voicemail stat-card sparkline. */
export function voicemailSparkFor(members: Member[], range: DayRange): number[] {
  return bucketed(members, range).voicemail;
}

/** Format a talk-time duration (seconds) compactly: "2h 14m" / "47m" / "38s". */
export function fmtTalkTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds || 0));
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  if (s >= 60) return `${Math.floor(s / 60)}m`;
  return `${s}s`;
}

export function initialsOf(name: string): string {
  return name.split(/[\s@.]/).filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}
