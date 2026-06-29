"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Plus, Check, Clock, CalendarClock, Trash2, ArrowUpRight,
  History, Bell, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeamMembers } from "@/hooks/use-team-members";
import { getTasks, createTask, type InboxTask, type TaskGroup } from "@/lib/api/tasks";
import { updateLeadTask, deleteLeadTask, type TaskCategory } from "@/lib/api/lead-tasks";

const CATEGORY_META: Record<TaskCategory, { label: string; cls: string }> = {
  follow_up: { label: "Follow up", cls: "bg-signal-blue/15 text-signal-blue-text" },
  call_back: { label: "Call back", cls: "bg-signal-green/15 text-signal-green-text" },
  email: { label: "Email", cls: "bg-signal-slate/20 text-signal-slate-text" },
  reminder: { label: "Reminder", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  general: { label: "Task", cls: "bg-section text-ink-muted" },
};

const SECTIONS: { key: TaskGroup; label: string; urgent?: boolean }[] = [
  { key: "overdue", label: "Past · overdue", urgent: true },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "done", label: "Completed" },
];

function fmtDue(dueAt: string | null): string {
  if (!dueAt) return "No date";
  const d = new Date(dueAt);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Tasks + Reminders tab. When `categoryFilter` is set (e.g. "reminder") the
 *  list + composer are locked to that category — that's the Reminders tab. */
export function TasksInbox({ categoryFilter }: { categoryFilter?: TaskCategory }) {
  const router = useRouter();
  const { members } = useTeamMembers();
  const [tasks, setTasks] = useState<InboxTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignee, setAssignee] = useState<string>("mine"); // "mine" | "all" | memberId
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<string | null>(null);

  // Composer
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState<TaskCategory>(categoryFilter ?? "follow_up");
  const [newDue, setNewDue] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getTasks({
        assigneeId: assignee as "mine" | "all",
        category: categoryFilter,
        status: "all",
        search: search.trim() || undefined,
      });
      setTasks(rows);
    } catch {
      /* keep previous */
    } finally {
      setLoading(false);
    }
  }, [assignee, categoryFilter, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0); // debounce search
    return () => clearTimeout(t);
  }, [load, search]);

  const grouped = useMemo(() => {
    const g: Record<TaskGroup, InboxTask[]> = { overdue: [], today: [], upcoming: [], done: [] };
    for (const t of tasks) g[t.group].push(t);
    return g;
  }, [tasks]);

  async function toggleDone(t: InboxTask) {
    setBusy(t.id);
    try {
      await updateLeadTask(t.id, { done: !t.done });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function reschedule(t: InboxTask, value: string) {
    setBusy(t.id);
    try {
      await updateLeadTask(t.id, { dueAt: value ? new Date(value).toISOString() : null });
      setRescheduling(null);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function remove(t: InboxTask) {
    setBusy(t.id);
    try {
      await deleteLeadTask(t.id);
      setTasks((prev) => prev.filter((x) => x.id !== t.id));
    } finally {
      setBusy(null);
    }
  }

  async function add() {
    const label = newLabel.trim();
    if (!label) return;
    setAdding(true);
    try {
      await createTask({
        label,
        category: categoryFilter ?? newCategory,
        dueAt: newDue ? new Date(newDue).toISOString() : null,
      });
      setNewLabel("");
      setNewDue("");
      await load();
    } finally {
      setAdding(false);
    }
  }

  const isReminders = categoryFilter === "reminder";

  return (
    <div className="flex-1 flex flex-col rounded-[14px] border border-border-subtle bg-surface overflow-hidden min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap px-3 py-2.5 border-b border-border-subtle shrink-0">
        <AssigneeDropdown
          value={assignee}
          onChange={setAssignee}
          members={members}
          mineLabel={`My ${isReminders ? "reminders" : "tasks"}`}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${isReminders ? "reminders" : "tasks"}…`}
          className="flex-1 min-w-[160px] bg-section border border-border-subtle rounded-[8px] px-3 py-1.5 text-[11.5px] text-ink placeholder:text-ink-faint focus:outline-none"
        />
      </div>

      {/* Composer */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle bg-section/30 shrink-0">
        <Plus size={13} className="text-ink-faint shrink-0" />
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void add(); }}
          placeholder={isReminders ? "Add a reminder…" : "Add a task…"}
          className="flex-1 bg-transparent text-[12px] text-ink placeholder:text-ink-faint focus:outline-none"
        />
        {!categoryFilter && (
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as TaskCategory)}
            className="bg-surface border border-border-subtle rounded-[6px] px-2 py-1 text-[10.5px] text-ink-secondary focus:outline-none"
          >
            {(Object.keys(CATEGORY_META) as TaskCategory[]).map((c) => (
              <option key={c} value={c}>{CATEGORY_META[c].label}</option>
            ))}
          </select>
        )}
        <input
          type="datetime-local"
          value={newDue}
          onChange={(e) => setNewDue(e.target.value)}
          className="bg-surface border border-border-subtle rounded-[6px] px-2 py-1 text-[10.5px] text-ink-secondary focus:outline-none"
        />
        <button
          onClick={() => void add()}
          disabled={adding || !newLabel.trim()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-[16px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {adding ? <Loader2 size={11} className="animate-spin" /> : "Add"}
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && tasks.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={18} className="animate-spin text-ink-muted" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-6">
            {isReminders ? <Bell size={20} className="text-ink-faint" /> : <History size={20} className="text-ink-faint" />}
            <p className="text-[12px] text-ink-muted">
              No {isReminders ? "reminders" : "tasks"} here. Add one above, or set follow-ups from a lead.
            </p>
          </div>
        ) : (
          SECTIONS.map((section) => {
            const items = grouped[section.key];
            if (items.length === 0) return null;
            return (
              <div key={section.key}>
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 sticky top-0 bg-surface/95 backdrop-blur border-b border-border-subtle z-10",
                )}>
                  <span className={cn(
                    "text-[10px] uppercase tracking-wider font-semibold",
                    section.urgent ? "text-signal-red-text" : "text-ink-muted",
                  )}>
                    {section.label}
                  </span>
                  <span className="text-[10px] text-ink-faint">{items.length}</span>
                </div>
                {items.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    busy={busy === t.id}
                    rescheduling={rescheduling === t.id}
                    onToggleDone={() => void toggleDone(t)}
                    onStartReschedule={() => setRescheduling(rescheduling === t.id ? null : t.id)}
                    onReschedule={(v) => void reschedule(t, v)}
                    onOpenLead={
                      t.funnelId && t.leadId
                        ? () => router.push(`/dashboard/funnels/${t.funnelId}/leads/${t.leadId}`)
                        : undefined
                    }
                    onDelete={() => void remove(t)}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function TaskRow({
  task: t, busy, rescheduling, onToggleDone, onStartReschedule, onReschedule, onOpenLead, onDelete,
}: {
  task: InboxTask;
  busy: boolean;
  rescheduling: boolean;
  onToggleDone: () => void;
  onStartReschedule: () => void;
  onReschedule: (value: string) => void;
  onOpenLead?: () => void;
  onDelete: () => void;
}) {
  const cat = CATEGORY_META[t.category] ?? CATEGORY_META.general;
  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 border-b border-border-subtle hover:bg-hover/40 transition-colors">
      <button
        onClick={onToggleDone}
        disabled={busy}
        className={cn(
          "w-[18px] h-[18px] rounded-[6px] border flex items-center justify-center shrink-0 transition-colors",
          t.done ? "bg-signal-green-text border-signal-green-text text-on-ink" : "border-border-default hover:border-ink-muted",
        )}
        title={t.done ? "Mark not done" : "Mark done"}
      >
        {busy ? <Loader2 size={11} className="animate-spin" /> : t.done && <Check size={12} strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("text-[12.5px] truncate", t.done ? "text-ink-faint line-through" : "text-ink")}>{t.label}</span>
          <span className={cn("text-[9px] font-medium uppercase tracking-wide rounded-full px-1.5 py-0.5 shrink-0", cat.cls)}>{cat.label}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-ink-muted">
          {(t.leadName || t.company) && (
            <span className="truncate">{t.leadName}{t.company ? ` · ${t.company}` : ""}</span>
          )}
          {t.assigneeName && <span className="text-ink-faint">· {t.assigneeName}</span>}
        </div>
        {rescheduling && (
          <input
            type="datetime-local"
            autoFocus
            defaultValue={t.dueAt ? toLocalInput(t.dueAt) : ""}
            onChange={(e) => onReschedule(e.target.value)}
            className="mt-1.5 bg-surface border border-border-default rounded-[6px] px-2 py-1 text-[11px] text-ink focus:outline-none"
          />
        )}
      </div>

      <span className={cn(
        "flex items-center gap-1 text-[10.5px] shrink-0 tabular-nums",
        t.group === "overdue" ? "text-signal-red-text" : "text-ink-muted",
      )}>
        <Clock size={11} />
        {fmtDue(t.dueAt)}
      </span>

      {/* Hover actions */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onStartReschedule} title="Reschedule" className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-hover">
          <CalendarClock size={13} />
        </button>
        {onOpenLead && (
          <button onClick={onOpenLead} title="Open lead" className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-hover">
            <ArrowUpRight size={13} />
          </button>
        )}
        <button onClick={onDelete} title="Delete" className="p-1.5 rounded-md text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

/** Leadey-styled assignee picker (My tasks / Everyone / each member). Replaces
 *  the browser-default <select> so the dropdown matches the app's design. */
function AssigneeDropdown({ value, onChange, members, mineLabel }: {
  value: string;
  onChange: (v: string) => void;
  members: { id: string; name: string }[];
  mineLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const options = [
    { value: "mine", label: mineLabel },
    { value: "all", label: "Everyone" },
    ...members.map((m) => ({ value: m.id, label: m.name })),
  ];
  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 bg-section border border-border-subtle rounded-[8px] pl-2.5 pr-2 py-1.5 text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors"
      >
        <span className="max-w-[140px] truncate">{current.label}</span>
        <ChevronDown size={12} className={cn("text-ink-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-30 w-[200px] max-h-[300px] overflow-y-auto bg-surface rounded-[10px] border border-border-subtle shadow-lg py-1">
          {options.map((o) => {
            const sel = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left transition-colors",
                  sel ? "bg-hover text-ink font-medium" : "text-ink-secondary hover:bg-hover",
                )}
              >
                <span className="w-3.5 shrink-0">{sel && <Check size={12} className="text-signal-blue-text" strokeWidth={3} />}</span>
                <span className="truncate">{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** ISO string → value for <input type="datetime-local"> in local time. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
