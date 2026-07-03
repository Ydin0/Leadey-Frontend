"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { CircleCheck, Plus, Check, X, ChevronDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateTimePicker } from "@/components/shared/date-time-picker";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { getTeamMembers } from "@/lib/api/team";
import type { TeamMember } from "@/lib/types/team";
import {
  getLeadTasks,
  createLeadTask,
  updateLeadTask,
  deleteLeadTask,
  type LeadTask,
} from "@/lib/api/lead-tasks";
import { Section, MiniBtn } from "./lead-section";
import { MemberAvatar } from "@/components/shared/member-avatar";

/** Short, human due label. Returns "Today" (urgent) for tasks due today. */
function dueLabel(dueAt: string | null): { text: string; urgent: boolean } | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;
  const now = new Date();
  const sameDay =
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate();
  // Show the time when one was set (non-midnight) so timed tasks read clearly.
  const hasTime = due.getHours() !== 0 || due.getMinutes() !== 0;
  const timeStr = hasTime
    ? due.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : "";
  if (sameDay) return { text: timeStr ? `Today ${timeStr}` : "Today", urgent: true };
  const overdue = due.getTime() < now.getTime();
  const dateStr = due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return {
    text: timeStr ? `${dateStr}, ${timeStr}` : dateStr,
    urgent: overdue,
  };
}

function memberName(m: TeamMember): string {
  return [m.firstName, m.lastName].filter(Boolean).join(" ").trim() || m.email;
}

/** Compact member picker (admins only) used in the add-task form. */
function AssigneePicker({
  members,
  value,
  currentUserId,
  onChange,
}: {
  members: TeamMember[];
  value: string | null;
  currentUserId: string | null;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const selected = members.find((m) => m.id === value);
  const label = selected ? (selected.id === currentUserId ? "Me" : memberName(selected)) : "Assign…";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface border border-border-subtle text-[11px] text-ink-secondary hover:bg-hover transition-colors"
      >
        <User size={11} className="text-ink-muted" />
        <span className="max-w-[90px] truncate">{label}</span>
        <ChevronDown size={10} className="text-ink-faint" />
      </button>
      {open && (
        <div className="absolute left-0 bottom-full mb-1 z-50 min-w-[180px] max-h-[220px] overflow-y-auto bg-surface rounded-[10px] border border-border-subtle shadow-lg py-1">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                onChange(m.id);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-[11px] hover:bg-hover transition-colors flex items-center gap-2",
                m.id === value ? "text-ink font-medium" : "text-ink-secondary",
              )}
            >
              <MemberAvatar id={m.id} name={memberName(m)} className="w-5 h-5 text-[8px]" />
              <span className="truncate">
                {memberName(m)}
                {m.id === currentUserId ? " (me)" : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function LeadTasksSection({ funnelId, leadId }: { funnelId: string; leadId: string }) {
  const isAuthReady = useAuthReady();
  const { userId } = useAuth();
  const { isManager } = usePermissions();

  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [due, setDue] = useState("");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setTasks(await getLeadTasks(funnelId, leadId));
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  }, [funnelId, leadId]);

  useEffect(() => {
    if (!isAuthReady) return;
    void load();
  }, [isAuthReady, load]);

  // Admins/managers can assign to anyone → load the roster for the picker.
  useEffect(() => {
    if (!isAuthReady || !isManager) return;
    getTeamMembers()
      .then((res) => setMembers(res.members))
      .catch(() => setMembers([]));
  }, [isAuthReady, isManager]);

  function startAdding() {
    setAssignee(userId ?? null);
    setAdding(true);
  }

  async function toggle(task: LeadTask) {
    const next = !task.done;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: next } : t)));
    try {
      await updateLeadTask(task.id, { done: next });
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: task.done } : t)));
    }
  }

  async function remove(task: LeadTask) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await deleteLeadTask(task.id);
    } catch {
      void load();
    }
  }

  async function add() {
    if (!label.trim()) {
      setAdding(false);
      return;
    }
    setSaving(true);
    try {
      const created = await createLeadTask(funnelId, leadId, {
        label: label.trim(),
        dueAt: due ? new Date(due).toISOString() : null,
        // Members can only self-assign; admins pick anyone.
        assigneeId: isManager ? assignee : userId,
      });
      setTasks((prev) => [...prev, created]);
      setLabel("");
      setDue("");
      setAdding(false);
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setSaving(false);
    }
  }

  const openCount = tasks.filter((t) => !t.done).length;

  return (
    <Section
      icon={CircleCheck}
      title="Tasks"
      count={openCount}
      actions={<MiniBtn icon={Plus} title="Add task" onClick={startAdding} />}
    >
      <div className="flex flex-col gap-0.5">
        {tasks.map((task) => {
          const d = dueLabel(task.dueAt);
          const assigneeLabel =
            task.assigneeId && task.assigneeId === userId ? "Me" : task.assigneeName || null;
          return (
            <div
              key={task.id}
              className="group flex items-center gap-2.5 py-1.5 px-1 rounded-lg hover:bg-hover/50 transition-colors"
            >
              <button
                type="button"
                onClick={() => toggle(task)}
                className={cn(
                  "flex items-center justify-center w-4 h-4 rounded-full border-[1.5px] shrink-0 transition-colors",
                  task.done
                    ? "border-signal-green-text bg-signal-green"
                    : "border-border-default hover:border-ink-muted",
                )}
              >
                {task.done && <Check size={10} strokeWidth={2.5} className="text-signal-green-text" />}
              </button>
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "block text-[12px] leading-snug truncate",
                    task.done ? "text-ink-faint line-through" : "text-ink-secondary",
                  )}
                >
                  {task.label}
                </span>
                {assigneeLabel && (
                  <span className="flex items-center gap-1 text-[10px] text-ink-faint mt-0.5">
                    <User size={9} />
                    {assigneeLabel}
                  </span>
                )}
              </div>
              {d && (
                <span
                  className={cn(
                    "text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0 bg-section",
                    d.urgent && !task.done ? "text-signal-red-text" : "text-ink-muted",
                  )}
                >
                  {d.text}
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(task)}
                className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-signal-red-text transition-all shrink-0"
                title="Delete task"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}

        {adding ? (
          <div className="flex flex-col gap-2 mt-1 p-2 rounded-lg border border-border-subtle bg-section/40">
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void add();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="Add a task…"
              className="w-full bg-transparent text-[12px] text-ink placeholder:text-ink-faint focus:outline-none"
            />
            <div className="flex items-center gap-2 flex-wrap">
              {/* Leadey-styled picker — never the browser-default calendar. */}
              <DateTimePicker
                value={due || null}
                onChange={(iso) => setDue(iso ?? "")}
                placeholder="Due date"
              />
              {isManager && members.length > 0 && (
                <AssigneePicker
                  members={members}
                  value={assignee}
                  currentUserId={userId ?? null}
                  onChange={setAssignee}
                />
              )}
              <div className="flex-1" />
              <button
                onClick={() => setAdding(false)}
                className="px-2.5 py-1 rounded-full text-[11px] text-ink-muted hover:bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={() => void add()}
                disabled={saving || !label.trim()}
                className="px-3 py-1 rounded-full bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        ) : (
          tasks.length === 0 && (
            <button
              onClick={startAdding}
              className="flex items-center gap-2 py-1.5 px-1 text-[11.5px] text-ink-muted hover:text-ink-secondary transition-colors"
            >
              <Plus size={12} />
              Add a task…
            </button>
          )
        )}
      </div>
    </Section>
  );
}
