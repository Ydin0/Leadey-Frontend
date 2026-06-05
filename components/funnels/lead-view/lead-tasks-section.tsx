"use client";

import { useEffect, useState, useCallback } from "react";
import { CircleCheck, Plus, Check, X, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import {
  getLeadTasks,
  createLeadTask,
  updateLeadTask,
  deleteLeadTask,
  type LeadTask,
} from "@/lib/api/lead-tasks";
import { Section, MiniBtn } from "./lead-section";

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
  if (sameDay) return { text: "Today", urgent: true };
  const overdue = due.getTime() < now.getTime();
  return {
    text: due.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    urgent: overdue,
  };
}

export function LeadTasksSection({ funnelId, leadId }: { funnelId: string; leadId: string }) {
  const isAuthReady = useAuthReady();
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [due, setDue] = useState("");
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
        dueAt: due ? new Date(due + "T12:00:00").toISOString() : null,
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
      actions={<MiniBtn icon={Plus} title="Add task" onClick={() => setAdding(true)} />}
    >
      <div className="flex flex-col gap-0.5">
        {tasks.map((task) => {
          const d = dueLabel(task.dueAt);
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
              <span
                className={cn(
                  "flex-1 text-[12px] leading-snug",
                  task.done ? "text-ink-faint line-through" : "text-ink-secondary",
                )}
              >
                {task.label}
              </span>
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
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-ink-faint">
                <Calendar size={12} />
                <input
                  type="date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  className="bg-transparent text-[11px] text-ink-secondary focus:outline-none"
                />
              </div>
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
              onClick={() => setAdding(true)}
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
