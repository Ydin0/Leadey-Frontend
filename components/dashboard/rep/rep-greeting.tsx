"use client";

import Link from "next/link";
import { Sparkles, GitFork, Phone } from "lucide-react";

function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

interface RepGreetingProps {
  firstName: string;
  progress: number; // 0..1
  overdueCount: number;
  nextMeeting?: string | null;
}

export function RepGreeting({ firstName, progress, overdueCount }: RepGreetingProps) {
  const pct = Math.round(progress * 100);
  return (
    <div className="flex items-start justify-between gap-5 flex-wrap mb-6">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">
            Good {timeOfDay()}, {firstName}
          </h1>
          <span className="text-[13px] text-ink-muted pt-1.5 whitespace-nowrap">{todayLabel()}</span>
        </div>
        <p className="flex items-center gap-2 text-[13px] text-ink-secondary mt-1.5">
          <Sparkles size={13} className="text-accent shrink-0" />
          You&apos;re <strong className="text-ink font-semibold">{pct}%</strong> to today&apos;s activity goal
          {overdueCount > 0 && (
            <>
              {" — "}
              <span className="text-signal-red-text font-medium">
                {overdueCount} task{overdueCount === 1 ? "" : "s"} overdue
              </span>
            </>
          )}
          .
        </p>
      </div>
      <div className="flex items-center gap-2.5">
        <Link
          href="/dashboard/funnels/new"
          className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[12px] font-medium hover:bg-hover transition-colors"
        >
          <GitFork size={13} />
          New campaign
        </Link>
        <Link
          href="/dashboard/dialer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[12px] font-medium hover:bg-ink/90 transition-colors"
        >
          <Phone size={13} />
          Start call session
        </Link>
      </div>
    </div>
  );
}
