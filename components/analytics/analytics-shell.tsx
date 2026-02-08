"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Briefcase,
  CalendarClock,
  Filter,
  GitFork,
  Goal,
  Mail,
  Phone,
  Radio,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockAnalytics } from "@/lib/mock-data/analytics";
import type {
  AnalyticsPeriod,
  AnalyticsViewMode,
  ChannelAnalytics,
  FunnelHealthSnapshot,
  GoalTrackingSnapshot,
  SourceEfficiencySnapshot,
  TeamMemberPerformance,
} from "@/lib/types/analytics";

const periodOptions: { key: AnalyticsPeriod; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
];

const viewOptions: { key: AnalyticsViewMode; label: string }[] = [
  { key: "manager", label: "Manager View" },
  { key: "rep", label: "Rep View" },
];

function val(period: AnalyticsPeriod, metrics: { "7d": number; "30d": number; "90d": number }) {
  return metrics[period];
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function riskBadge(level: "healthy" | "watch" | "at_risk") {
  if (level === "healthy") return "bg-signal-green text-signal-green-text";
  if (level === "watch") return "bg-signal-blue text-signal-blue-text";
  return "bg-signal-red text-signal-red-text";
}

function goalPct(goal: GoalTrackingSnapshot) {
  if (goal.target === 0) return 0;
  return Math.min(100, Math.round((goal.actual / goal.target) * 100));
}

function sectionCard(title: string, description?: string) {
  return (
    <>
      <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
      {description && <p className="text-[11px] text-ink-muted mt-0.5">{description}</p>}
    </>
  );
}

function channelIcon(channel: ChannelAnalytics["channel"]) {
  if (channel === "email") return Mail;
  if (channel === "linkedin") return Radio;
  return Phone;
}

function sourceIcon(source: SourceEfficiencySnapshot["source"]) {
  if (source === "signals") return Sparkles;
  if (source === "csv") return BarChart3;
  if (source === "webhook") return TrendingUp;
  return Briefcase;
}

interface KpiCardProps {
  label: string;
  value: string;
  changePct: number;
}

function KpiCard({ label, value, changePct }: KpiCardProps) {
  const up = changePct >= 0;
  const TrendIcon = up ? TrendingUp : TrendingDown;
  return (
    <div className="rounded-[12px] border border-border-subtle bg-surface px-3 py-3">
      <p className="text-[10px] uppercase tracking-wider text-ink-faint">{label}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-[16px] font-semibold text-ink">{value}</p>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5",
            up
              ? "bg-signal-green text-signal-green-text"
              : "bg-signal-red text-signal-red-text"
          )}
        >
          <TrendIcon size={10} strokeWidth={2} />
          {up ? "+" : ""}
          {changePct.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function TeamPerformanceTable({
  period,
  members,
}: {
  period: AnalyticsPeriod;
  members: TeamMemberPerformance[];
}) {
  const ranked = useMemo(
    () =>
      [...members]
        .filter((m) => m.role === "rep" || m.role === "manager")
        .sort((a, b) => val(period, b.meetingsBooked) - val(period, a.meetingsBooked)),
    [members, period]
  );

  return (
    <section className="rounded-[14px] border border-border-subtle bg-surface p-4">
      {sectionCard("Team Performance", "Ranked by meetings booked for selected period.")}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[780px] text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-ink-faint">
              <th className="py-2 font-medium">Member</th>
              <th className="py-2 font-medium">Pipeline</th>
              <th className="py-2 font-medium">Meetings</th>
              <th className="py-2 font-medium">Replies</th>
              <th className="py-2 font-medium">Reply Rate</th>
              <th className="py-2 font-medium">Response SLA</th>
              <th className="py-2 font-medium">Win Rate</th>
              <th className="py-2 font-medium">Credits Used</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {ranked.map((member) => (
              <tr key={member.id} className="text-[12px]">
                <td className="py-2">
                  <div>
                    <p className="font-medium text-ink">{member.name}</p>
                    <p className="text-[11px] text-ink-muted">{member.team}</p>
                  </div>
                </td>
                <td className="py-2 text-ink-secondary">
                  {formatCurrency(val(period, member.pipelineGeneratedUsd))}
                </td>
                <td className="py-2 text-ink-secondary">{val(period, member.meetingsBooked)}</td>
                <td className="py-2 text-ink-secondary">{val(period, member.repliesHandled)}</td>
                <td className="py-2 text-ink-secondary">
                  {val(period, member.replyRatePct).toFixed(1)}%
                </td>
                <td className="py-2 text-ink-secondary">
                  {formatNumber(val(period, member.avgResponseMinutes))} min
                </td>
                <td className="py-2 text-ink-secondary">
                  {val(period, member.winRatePct).toFixed(1)}%
                </td>
                <td className="py-2 text-ink-secondary">{val(period, member.creditsUsed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ChannelPerformanceGrid({
  period,
  channels,
}: {
  period: AnalyticsPeriod;
  channels: ChannelAnalytics[];
}) {
  return (
    <section className="rounded-[14px] border border-border-subtle bg-surface p-4">
      {sectionCard("Channel Performance", "Compare output and conversion by channel.")}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        {channels.map((channel) => {
          const Icon = channelIcon(channel.channel);
          const sent = val(period, channel.sentOrExecuted);
          const replyRate = val(period, channel.replyRatePct);
          const meetingRate = val(period, channel.meetingRatePct);
          return (
            <div
              key={channel.channel}
              className="rounded-[12px] border border-border-subtle bg-section/40 px-3 py-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-full bg-section flex items-center justify-center">
                  <Icon size={13} strokeWidth={1.8} className="text-ink-secondary" />
                </span>
                <p className="text-[12px] font-medium text-ink capitalize">{channel.channel}</p>
              </div>
              <p className="text-[11px] text-ink-secondary">{formatNumber(sent)} actions</p>
              <p className="text-[11px] text-ink-secondary mt-1">
                Reply rate: {replyRate.toFixed(1)}%
              </p>
              <p className="text-[11px] text-ink-secondary">
                Meeting rate: {meetingRate.toFixed(1)}%
              </p>
              <div className="mt-2 h-1.5 rounded bg-section">
                <div
                  className="h-1.5 rounded bg-signal-blue-text"
                  style={{ width: `${Math.min(100, Math.round(replyRate * 4.5))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FunnelHealthTable({
  period,
  funnels,
}: {
  period: AnalyticsPeriod;
  funnels: FunnelHealthSnapshot[];
}) {
  return (
    <section className="rounded-[14px] border border-border-subtle bg-surface p-4">
      {sectionCard("Funnel Health", "Identify high-performing and at-risk funnels quickly.")}
      <div className="mt-3 space-y-2">
        {funnels.map((funnel) => (
          <div
            key={funnel.funnelId}
            className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-2 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-ink truncate">{funnel.funnelName}</p>
              <p className="text-[11px] text-ink-muted">
                Owner: {funnel.owner} · {funnel.status}
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-ink-secondary shrink-0">
              <span>{val(period, funnel.activeLeads)} active</span>
              <span>{val(period, funnel.replyRatePct).toFixed(1)}% reply</span>
              <span>{val(period, funnel.meetingsBooked)} meetings</span>
              <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", riskBadge(funnel.riskLevel))}>
                {funnel.riskLevel.replace("_", " ")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SourceEfficiencyTable({
  period,
  sources,
}: {
  period: AnalyticsPeriod;
  sources: SourceEfficiencySnapshot[];
}) {
  return (
    <section className="rounded-[14px] border border-border-subtle bg-surface p-4">
      {sectionCard("Source Efficiency", "Lead quality and credit efficiency by source.")}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        {sources.map((source) => {
          const Icon = sourceIcon(source.source);
          return (
            <div
              key={source.source}
              className="rounded-[12px] border border-border-subtle bg-section/40 px-3 py-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-full bg-section flex items-center justify-center">
                  <Icon size={13} strokeWidth={1.8} className="text-ink-secondary" />
                </span>
                <p className="text-[12px] font-medium text-ink capitalize">{source.source}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <p className="text-ink-secondary">Leads: {val(period, source.leadsAdded)}</p>
                <p className="text-ink-secondary">
                  Qualified: {val(period, source.qualifiedLeads)}
                </p>
                <p className="text-ink-secondary">
                  Meetings: {val(period, source.meetingsBooked)}
                </p>
                <p className="text-ink-secondary">
                  Qual rate: {val(period, source.qualificationRatePct).toFixed(1)}%
                </p>
              </div>
              <p className="text-[11px] text-ink-muted mt-2">
                {val(period, source.creditsPerQualifiedLead)} credits / qualified lead
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ActivityAndGoals({
  period,
}: {
  period: AnalyticsPeriod;
}) {
  const daily = mockAnalytics.dailyActivity;
  const goals = mockAnalytics.goals;
  const maxValue = Math.max(...daily.map((d) => d.repliesReceived), 1);
  const periodLabel = period === "7d" ? "this week" : period === "30d" ? "this month" : "this quarter";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className="rounded-[14px] border border-border-subtle bg-surface p-4">
        {sectionCard("Activity Trend", "Replies received by day (last 7 days).")}
        <div className="mt-3 flex items-end gap-2 h-28">
          {daily.map((point) => (
            <div key={point.label} className="flex-1 flex flex-col items-center justify-end gap-1">
              <div
                className="w-full rounded-t bg-signal-blue-text/70"
                style={{ height: `${Math.max(8, Math.round((point.repliesReceived / maxValue) * 90))}%` }}
                title={`${point.repliesReceived} replies`}
              />
              <span className="text-[10px] text-ink-faint">{point.label}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-ink-muted mt-2">
          Highest daily replies: {maxValue} ({periodLabel} pattern)
        </p>
      </section>

      <section className="rounded-[14px] border border-border-subtle bg-surface p-4">
        {sectionCard("Goal Tracking", "Progress against performance targets.")}
        <div className="mt-3 space-y-3">
          {goals.map((goal) => {
            const pct = goalPct(goal);
            const actual =
              goal.unit === "usd"
                ? formatCurrency(goal.actual)
                : goal.unit === "pct"
                  ? `${goal.actual}%`
                  : formatNumber(goal.actual);
            const target =
              goal.unit === "usd"
                ? formatCurrency(goal.target)
                : goal.unit === "pct"
                  ? `${goal.target}%`
                  : formatNumber(goal.target);
            return (
              <div key={goal.id}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-ink-secondary">{goal.label}</span>
                  <span className="text-ink-muted">
                    {actual} / {target}
                  </span>
                </div>
                <div className="h-1.5 rounded bg-section">
                  <div
                    className={cn(
                      "h-1.5 rounded",
                      pct >= 100 ? "bg-signal-green-text" : "bg-signal-blue-text"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function InsightsPanel() {
  return (
    <section className="rounded-[14px] border border-border-subtle bg-surface p-4">
      {sectionCard("Actionable Insights", "Priority actions based on current performance signals.")}
      <div className="mt-3 space-y-2">
        {mockAnalytics.insights.map((insight) => (
          <div
            key={insight.id}
            className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-medium text-ink">{insight.title}</p>
              <span
                className={cn(
                  "text-[10px] rounded-full px-2 py-0.5 font-medium",
                  insight.priority === "high"
                    ? "bg-signal-red text-signal-red-text"
                    : insight.priority === "medium"
                      ? "bg-signal-blue text-signal-blue-text"
                      : "bg-signal-slate text-signal-slate-text"
                )}
              >
                {insight.priority}
              </span>
            </div>
            <p className="text-[11px] text-ink-muted mt-1">{insight.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AnalyticsShell() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [viewMode, setViewMode] = useState<AnalyticsViewMode>("manager");

  const current = mockAnalytics.kpis;
  const previousPeriod: AnalyticsPeriod = period === "7d" ? "30d" : period === "30d" ? "90d" : "90d";

  const kpiSummary = [
    {
      label: "Pipeline Generated",
      value: formatCurrency(val(period, current.pipelineGeneratedUsd)),
      change: pctChange(val(period, current.pipelineGeneratedUsd), val(previousPeriod, current.pipelineGeneratedUsd)),
    },
    {
      label: "Meetings Booked",
      value: formatNumber(val(period, current.meetingsBooked)),
      change: pctChange(val(period, current.meetingsBooked), val(previousPeriod, current.meetingsBooked)),
    },
    {
      label: "Reply Rate",
      value: `${val(period, current.replyRatePct).toFixed(1)}%`,
      change: pctChange(val(period, current.replyRatePct), val(previousPeriod, current.replyRatePct)),
    },
    {
      label: "Avg Response Time",
      value: `${formatNumber(val(period, current.avgResponseMinutes))} min`,
      change: -pctChange(val(period, current.avgResponseMinutes), val(previousPeriod, current.avgResponseMinutes)),
    },
    {
      label: "Win Rate",
      value: `${val(period, current.winRatePct).toFixed(1)}%`,
      change: pctChange(val(period, current.winRatePct), val(previousPeriod, current.winRatePct)),
    },
    {
      label: "Credits / Meeting",
      value: formatNumber(val(period, current.creditsPerMeeting)),
      change: -pctChange(val(period, current.creditsPerMeeting), val(previousPeriod, current.creditsPerMeeting)),
    },
  ];

  const repScopedMembers = mockAnalytics.teamPerformance.filter((member) => member.role !== "manager");
  const teamRows = viewMode === "manager" ? mockAnalytics.teamPerformance : repScopedMembers.slice(0, 1);
  const teamLabel = viewMode === "manager" ? mockAnalytics.teamName : "Individual Contributor View";

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-[14px] border border-border-subtle p-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold text-ink">Analytics</h1>
          <p className="text-[12px] text-ink-muted mt-0.5">
            Performance intelligence for {teamLabel}, with channel, source, and funnel breakdowns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-ink-faint font-medium inline-flex items-center gap-1">
            <Filter size={11} strokeWidth={2} />
            Scope
          </span>
          <div className="flex items-center gap-1">
            {viewOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setViewMode(option.key)}
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-medium transition-colors",
                  viewMode === option.key
                    ? "bg-ink text-on-ink"
                    : "bg-section text-ink-muted hover:text-ink-secondary"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {periodOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setPeriod(option.key)}
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-medium transition-colors",
                  period === option.key
                    ? "bg-signal-blue text-signal-blue-text"
                    : "bg-section text-ink-muted hover:text-ink-secondary"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {kpiSummary.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            changePct={kpi.change}
          />
        ))}
      </section>

      {viewMode === "manager" && (
        <TeamPerformanceTable period={period} members={teamRows} />
      )}

      {viewMode === "rep" && (
        <section className="rounded-[14px] border border-border-subtle bg-surface p-4">
          {sectionCard("Rep Snapshot", "Your performance contribution for selected period.")}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-[12px] border border-border-subtle bg-section/40 px-3 py-3">
              <p className="text-[10px] text-ink-faint uppercase tracking-wider">Meetings</p>
              <p className="text-[14px] font-semibold text-ink mt-1">
                {val(period, teamRows[0]?.meetingsBooked ?? { "7d": 0, "30d": 0, "90d": 0 })}
              </p>
            </div>
            <div className="rounded-[12px] border border-border-subtle bg-section/40 px-3 py-3">
              <p className="text-[10px] text-ink-faint uppercase tracking-wider">Reply Rate</p>
              <p className="text-[14px] font-semibold text-ink mt-1">
                {val(period, teamRows[0]?.replyRatePct ?? { "7d": 0, "30d": 0, "90d": 0 }).toFixed(1)}%
              </p>
            </div>
            <div className="rounded-[12px] border border-border-subtle bg-section/40 px-3 py-3">
              <p className="text-[10px] text-ink-faint uppercase tracking-wider">Response SLA</p>
              <p className="text-[14px] font-semibold text-ink mt-1">
                {formatNumber(val(period, teamRows[0]?.avgResponseMinutes ?? { "7d": 0, "30d": 0, "90d": 0 }))} min
              </p>
            </div>
            <div className="rounded-[12px] border border-border-subtle bg-section/40 px-3 py-3">
              <p className="text-[10px] text-ink-faint uppercase tracking-wider">Pipeline</p>
              <p className="text-[14px] font-semibold text-ink mt-1">
                {formatCurrency(val(period, teamRows[0]?.pipelineGeneratedUsd ?? { "7d": 0, "30d": 0, "90d": 0 }))}
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChannelPerformanceGrid period={period} channels={mockAnalytics.channels} />
        <SourceEfficiencyTable period={period} sources={mockAnalytics.sources} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <FunnelHealthTable period={period} funnels={mockAnalytics.funnels} />
        <section className="rounded-[14px] border border-border-subtle bg-surface p-4">
          {sectionCard("Execution Diagnostics", "Ops indicators that influence conversion quality.")}
          <div className="mt-3 space-y-2">
            <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock size={13} strokeWidth={1.8} className="text-ink-muted" />
                <span className="text-[11px] text-ink-secondary">Average response SLA</span>
              </div>
              <span className="text-[12px] font-medium text-ink">
                {formatNumber(val(period, current.avgResponseMinutes))} min
              </span>
            </div>
            <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitFork size={13} strokeWidth={1.8} className="text-ink-muted" />
                <span className="text-[11px] text-ink-secondary">Active funnel count</span>
              </div>
              <span className="text-[12px] font-medium text-ink">
                {mockAnalytics.funnels.filter((f) => f.status === "active").length}
              </span>
            </div>
            <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target size={13} strokeWidth={1.8} className="text-ink-muted" />
                <span className="text-[11px] text-ink-secondary">Goals on track</span>
              </div>
              <span className="text-[12px] font-medium text-ink">
                {mockAnalytics.goals.filter((goal) => goalPct(goal) >= 90).length}/{mockAnalytics.goals.length}
              </span>
            </div>
            <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={13} strokeWidth={1.8} className="text-ink-muted" />
                <span className="text-[11px] text-ink-secondary">Team members contributing</span>
              </div>
              <span className="text-[12px] font-medium text-ink">
                {mockAnalytics.teamPerformance.filter((member) => val(period, member.meetingsBooked) > 0).length}
              </span>
            </div>
          </div>
        </section>
      </div>

      <ActivityAndGoals period={period} />
      <InsightsPanel />

      <section className="rounded-[14px] border border-border-subtle bg-surface p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Goal size={14} strokeWidth={1.8} className="text-ink-muted" />
          <p className="text-[11px] text-ink-secondary">
            Want per-manager drilldown and cohort analysis? Next step is connecting this view to persisted event-level analytics.
          </p>
        </div>
        <button className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink transition-colors">
          View Deeper
          <ArrowUpRight size={12} strokeWidth={1.8} />
        </button>
      </section>
    </div>
  );
}
