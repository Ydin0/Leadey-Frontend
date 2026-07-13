"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { GitFork } from "lucide-react";
import Link from "next/link";
import { getDashboard, getRepDashboard, type DashboardData, type RepDashboardData, type RepTask } from "@/lib/api/dashboard";
import { listOpportunities, listPipelines } from "@/lib/api/opportunities";
import { listMeetings } from "@/lib/api/calendar";
import type { OrgMeeting } from "@/lib/types/calendar";
import { updateLeadTask } from "@/lib/api/lead-tasks";
import type { Opportunity, Pipeline } from "@/lib/types/opportunity";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { RepGreeting } from "@/components/dashboard/rep/rep-greeting";
import { RepKpiRow, buildKpiSpecs } from "@/components/dashboard/rep/rep-kpi-row";
import { RepTasksPanel } from "@/components/dashboard/rep/rep-tasks-panel";
import { RepQueueCockpit } from "@/components/dashboard/rep/rep-queue-cockpit";
import { RepPipelineGlance } from "@/components/dashboard/rep/rep-pipeline-glance";

function DashboardSkeleton() {
  return (
    <div className="max-w-[1320px] mx-auto animate-pulse">
      <div className="h-8 w-64 bg-surface rounded-lg mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-surface rounded-[14px] border border-border-subtle h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-6">
        <div className="flex flex-col gap-6">
          <div className="bg-surface rounded-[14px] border border-border-subtle h-64" />
          <div className="bg-surface rounded-[14px] border border-border-subtle h-80" />
        </div>
        <div className="bg-surface rounded-[14px] border border-border-subtle h-72" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const isAuthReady = useAuthReady();

  const [rep, setRep] = useState<RepDashboardData | null>(null);
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [meetings, setMeetings] = useState<OrgMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400000 - 1);
      const [repData, dashData, oppData, pipelineData, meetingsData] = await Promise.all([
        getRepDashboard(),
        getDashboard(),
        // The cockpit is the rep's command-center — show THEIR pipeline, not the
        // whole team's.
        listOpportunities({ summary: true, ownerId: user?.id }),
        listPipelines(),
        // Today's meetings from the rep's connected calendar/Calendly —
        // best-effort so a calendar hiccup never blanks the dashboard.
        listMeetings({ from: dayStart, to: dayEnd, scope: "mine" }).catch(() => null),
      ]);
      setRep(repData);
      setDash(dashData);
      setOpps(oppData.data);
      setPipelines(pipelineData);
      setMeetings(meetingsData?.meetings ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthReady) return;
    void fetchData();
  }, [fetchData, isAuthReady]);

  // Optimistic task toggle — persists via the lead-tasks API.
  const toggleTask = useCallback(async (task: RepTask) => {
    const next = !task.done;
    setRep((prev) =>
      prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === task.id ? { ...t, done: next } : t)) } : prev,
    );
    try {
      await updateLeadTask(task.id, { done: next });
    } catch {
      setRep((prev) =>
        prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === task.id ? { ...t, done: task.done } : t)) } : prev,
      );
    }
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error || !rep || !dash) {
    return (
      <div className="bg-surface rounded-[14px] border border-border-subtle p-8 text-center">
        <p className="text-[13px] text-ink-muted">{error || "Failed to load dashboard."}</p>
        <button onClick={() => void fetchData()} className="mt-3 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium">
          Retry
        </button>
      </div>
    );
  }

  // Activity-goal progress = mean attainment across KPIs that have a goal.
  const kpiList = [rep.kpis.tasks, rep.kpis.calls, rep.kpis.emails, rep.kpis.linkedin, rep.kpis.replies];
  const withGoals = kpiList.filter((k) => k.goal > 0);
  const progress =
    withGoals.length > 0
      ? withGoals.reduce((n, k) => n + Math.min(1, k.value / k.goal), 0) / withGoals.length
      : 0;
  const overdueCount = rep.tasks.filter((t) => t.group === "overdue" && !t.done).length;

  const firstName = user?.firstName || user?.username || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "there";

  // Nothing to show at all → onboarding nudge.
  const totallyEmpty =
    rep.tasks.length === 0 &&
    dash.calls.length === 0 &&
    dash.linkedin.length === 0 &&
    opps.length === 0 &&
    dash.email.sentToday === 0 &&
    rep.kpis.calls.value === 0;

  return (
    <div className="max-w-[1320px] mx-auto">
      <RepGreeting firstName={firstName} progress={progress} overdueCount={overdueCount} />

      <RepKpiRow kpis={buildKpiSpecs(rep.kpis)} />

      {totallyEmptyNotice(totallyEmpty)}

      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-6 items-start">
        <div className="flex flex-col gap-6 min-w-0">
          <RepTasksPanel tasks={rep.tasks} onToggle={toggleTask} meetings={meetings} />
          <RepQueueCockpit calls={dash.calls} linkedin={dash.linkedin} email={dash.email} />
        </div>
        <div className="flex flex-col gap-6 min-w-0 lg:sticky lg:top-[84px]">
          <RepPipelineGlance pipelines={pipelines} opps={opps} />
        </div>
      </div>
    </div>
  );
}

function totallyEmptyNotice(empty: boolean) {
  if (!empty) return null;
  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-8 text-center mb-6">
      <div className="w-12 h-12 rounded-xl bg-section flex items-center justify-center mx-auto mb-3">
        <GitFork size={22} strokeWidth={1.5} className="text-ink-muted" />
      </div>
      <h2 className="text-[15px] font-semibold text-ink mb-1.5">Let&apos;s get started</h2>
      <p className="text-[12.5px] text-ink-muted leading-relaxed mb-4 max-w-md mx-auto">
        Create a campaign to start working leads — your tasks, call queue, and pipeline will populate here as you go.
      </p>
      <Link
        href="/dashboard/funnels/new"
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[20px] bg-ink text-on-ink text-[12px] font-medium hover:bg-ink/90 transition-colors"
      >
        <GitFork size={14} strokeWidth={2} />
        Create your first campaign
      </Link>
    </div>
  );
}
