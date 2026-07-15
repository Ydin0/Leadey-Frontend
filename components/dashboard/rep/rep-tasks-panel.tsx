"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, GitFork, CircleCheck, CalendarDays, CalendarClock, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RepTask } from "@/lib/api/dashboard";
import type { OrgMeeting } from "@/lib/types/calendar";
import { RsvpBadge, DispositionBadge, meetingTime } from "@/components/calendar/meeting-bits";

function timeLabel(dueAt: string | null): string {
  if (!dueAt) return "—";
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function TaskRow({
  task,
  onToggle,
  onOpen,
}: {
  task: RepTask;
  onToggle: (t: RepTask) => void;
  onOpen: (t: RepTask) => void;
}) {
  const overdue = task.group === "overdue" && !task.done;
  return (
    <div
      onClick={() => onOpen(task)}
      className="group flex items-center gap-3 px-2.5 py-2.5 rounded-[10px] hover:bg-section transition-colors cursor-pointer"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(task);
        }}
        className={cn(
          "flex items-center justify-center w-[18px] h-[18px] rounded-full border-[1.5px] shrink-0 transition-colors",
          task.done ? "border-signal-green-text bg-signal-green" : "border-border-default hover:border-ink-muted",
        )}
      >
        {task.done && <Check size={11} strokeWidth={2.5} className="text-signal-green-text" />}
      </button>

      <span
        className={cn(
          "text-[11.5px] w-[58px] shrink-0 tabular-nums font-medium",
          overdue ? "text-signal-red-text" : "text-ink-muted",
        )}
      >
        {timeLabel(task.dueAt)}
      </span>

      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-[13px] font-medium truncate",
            task.done ? "text-ink-faint line-through" : "text-ink",
          )}
        >
          {task.label}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
          <span className="text-[11px] text-ink-muted truncate">
            {task.leadName}
            {task.company ? ` · ${task.company}` : ""}
          </span>
          <span className="text-[11px] text-ink-faint">·</span>
          <span className="flex items-center gap-1 text-[10.5px] text-ink-muted shrink-0">
            <GitFork size={10} />
            <span className="truncate max-w-[120px]">{task.campaignName}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/** One of today's meetings inside the tasks panel — mirrors the TaskRow
 *  layout (time column → title/meta) with meeting-specific accents. */
function MeetingRow({ meeting, now, onOpen }: { meeting: OrgMeeting; now: number; onOpen: (m: OrgMeeting) => void }) {
  const start = meeting.startTime ? new Date(meeting.startTime) : null;
  const past = !!start && now > 0 && start.getTime() < now;
  const soon = !!start && now > 0 && !past && start.getTime() - now < 15 * 60 * 1000;
  const linked = !!(meeting.funnelId && meeting.leadId);
  return (
    <div
      onClick={() => linked && onOpen(meeting)}
      className={cn(
        "group flex items-center gap-3 px-2.5 py-2.5 rounded-[10px] transition-colors",
        linked ? "hover:bg-section cursor-pointer" : "cursor-default",
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center w-[18px] h-[18px] rounded-full shrink-0",
          past ? "bg-section text-ink-faint" : "bg-signal-blue/15 text-signal-blue-text",
        )}
      >
        <CalendarClock size={11} strokeWidth={2} />
      </span>

      <span className={cn("text-[11.5px] w-[58px] shrink-0 tabular-nums font-medium", past ? "text-ink-faint" : "text-ink-muted")}>
        {meetingTime(meeting.startTime)}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn("text-[13px] font-medium truncate", past ? "text-ink-faint line-through" : "text-ink")}>
            {meeting.title || "Meeting"}
          </span>
          {past ? <DispositionBadge disposition={meeting.disposition} /> : <RsvpBadge status={meeting.responseStatus} />}
        </div>
        {(meeting.leadName || meeting.company) && (
          <div className="text-[11px] text-ink-muted truncate mt-0.5">
            {meeting.leadName}
            {meeting.company ? ` · ${meeting.company}` : ""}
          </div>
        )}
      </div>

      {meeting.joinUrl && !past && (
        <a
          href={meeting.joinUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-1 shrink-0 transition-colors",
            soon
              ? "bg-signal-green text-signal-green-text hover:opacity-90"
              : "text-signal-blue-text hover:bg-signal-blue/10",
          )}
        >
          <Video size={11} /> Join
        </a>
      )}
    </div>
  );
}

interface RepTasksPanelProps {
  tasks: RepTask[];
  onToggle: (task: RepTask) => void;
  /** Today's meetings (from the connected calendar / Calendly); optional. */
  meetings?: OrgMeeting[];
}

const GROUPS: { key: RepTask["group"]; label: string; urgent?: boolean }[] = [
  { key: "overdue", label: "Overdue", urgent: true },
  { key: "today", label: "Today" },
];

export function RepTasksPanel({ tasks, onToggle, meetings = [] }: RepTasksPanelProps) {
  const router = useRouter();
  const remaining = tasks.filter((t) => !t.done).length;

  // Minute tick so past/imminent meeting styling stays live (and satisfies the
  // React Compiler's no-impure-render rule for Date.now()).
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0); // async first tick (no setState in effect body)
    const t = setInterval(tick, 60_000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, []);

  function open(t: RepTask) {
    router.push(`/dashboard/funnels/${t.funnelId}/leads/${t.leadId}`);
  }
  function openMeeting(m: OrgMeeting) {
    if (m.funnelId && m.leadId) router.push(`/dashboard/funnels/${m.funnelId}/leads/${m.leadId}`);
  }

  return (
    <section className="bg-surface rounded-[14px] border border-border-subtle p-[18px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[15px] font-semibold text-ink">Today&apos;s tasks</h2>
          <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-section text-ink-muted">
            {remaining} left
          </span>
        </div>
        <button
          onClick={() => router.push("/dashboard/calendar")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary border border-border-subtle text-[11px] font-medium hover:bg-hover transition-colors"
        >
          <CalendarDays size={12} strokeWidth={1.75} /> Calendar
        </button>
      </div>

      {meetings.length > 0 && (
        <div className="mt-3.5">
          <div className="flex items-center gap-2 px-2.5 pb-1">
            <span className="text-[10px] uppercase tracking-wider font-medium text-signal-blue-text">Meetings today</span>
            <span className="text-[10.5px] text-ink-faint">{meetings.length}</span>
          </div>
          <div className="flex flex-col">
            {meetings.map((m) => (
              <MeetingRow key={m.id} meeting={m} now={now} onOpen={openMeeting} />
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 py-9 text-center">
          <span className="flex items-center justify-center w-11 h-11 rounded-full bg-signal-green">
            <CircleCheck size={20} className="text-signal-green-text" strokeWidth={2} />
          </span>
          <div className="text-[13px] font-medium text-ink">All clear</div>
          <div className="text-[12px] text-ink-muted">No tasks due today. Add tasks from a lead&apos;s page.</div>
        </div>
      ) : (
        GROUPS.map((g) => {
          const items = tasks.filter((t) => t.group === g.key);
          if (!items.length) return null;
          return (
            <div key={g.key} className="mt-3.5">
              <div className="flex items-center gap-2 px-2.5 pb-1">
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wider font-medium",
                    g.urgent ? "text-signal-red-text" : "text-ink-muted",
                  )}
                >
                  {g.label}
                </span>
                {g.urgent && <span className="w-1.5 h-1.5 rounded-full bg-signal-red-text" />}
                <span className="text-[10.5px] text-ink-faint">{items.filter((t) => !t.done).length}</span>
              </div>
              <div className="flex flex-col">
                {items.map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={onToggle} onOpen={open} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}
