"use client";

import { CircleCheck, Phone, Mail, Linkedin, Reply, Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiSpec {
  id: string;
  label: string;
  icon: LucideIcon;
  /** medallion bg + icon color (Tailwind classes). */
  tint: string;
  fg: string;
  /** progress-bar fill color (Tailwind bg class). */
  bar: string;
  value: number;
  goal: number;
}

function KpiCard({ k }: { k: KpiSpec }) {
  const pct = k.goal ? Math.min(1, k.value / k.goal) : 0;
  const hit = k.goal > 0 && k.value >= k.goal;
  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-4 transition-colors hover:border-border-default">
      <div className="flex items-center justify-between mb-3.5">
        <span className={cn("flex items-center justify-center w-8 h-8 rounded-[9px]", k.tint)}>
          <k.icon size={16} className={k.fg} />
        </span>
        {hit ? (
          <span className="flex items-center gap-1 text-[10.5px] font-semibold text-signal-green-text">
            <Check size={11} strokeWidth={2.5} />
            Goal
          </span>
        ) : (
          <span className="text-[10.5px] text-ink-faint">{Math.round(pct * 100)}%</span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[26px] font-semibold tracking-[-0.02em] leading-none text-ink">{k.value}</span>
        <span className="text-[13px] text-ink-faint">/ {k.goal}</span>
      </div>
      <div className="text-[12px] text-ink-muted mt-1.5">{k.label}</div>
      <div className="h-[5px] rounded-[3px] bg-section mt-3 overflow-hidden">
        <div
          className={cn("h-full rounded-[3px] transition-[width] duration-500", k.bar)}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}

export function RepKpiRow({ kpis }: { kpis: KpiSpec[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
      {kpis.map((k) => (
        <KpiCard key={k.id} k={k} />
      ))}
    </div>
  );
}

/** The five standard rep KPIs, given the live values + goals. */
export function buildKpiSpecs(kpis: {
  tasks: { value: number; goal: number };
  calls: { value: number; goal: number };
  emails: { value: number; goal: number };
  linkedin: { value: number; goal: number };
  replies: { value: number; goal: number };
}): KpiSpec[] {
  return [
    { id: "tasks", label: "Tasks done", icon: CircleCheck, tint: "bg-signal-slate", fg: "text-accent", bar: "bg-accent", ...kpis.tasks },
    { id: "calls", label: "Calls", icon: Phone, tint: "bg-signal-green", fg: "text-signal-green-text", bar: "bg-signal-green-text", ...kpis.calls },
    { id: "emails", label: "Emails", icon: Mail, tint: "bg-signal-blue", fg: "text-signal-blue-text", bar: "bg-signal-blue-text", ...kpis.emails },
    { id: "linkedin", label: "LinkedIn", icon: Linkedin, tint: "bg-signal-slate", fg: "text-linkedin", bar: "bg-linkedin", ...kpis.linkedin },
    { id: "replies", label: "Replies", icon: Reply, tint: "bg-signal-green", fg: "text-signal-green-text", bar: "bg-signal-green-text", ...kpis.replies },
  ];
}
