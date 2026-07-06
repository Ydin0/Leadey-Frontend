"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getTasks, type InboxTask } from "@/lib/api/tasks";
import { updateLeadTask, deleteLeadTask } from "@/lib/api/lead-tasks";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { qk } from "@/lib/queries/keys";

const POLL_MS = 30_000;
const SOUND_SRC = "/task-due.wav";

interface DueTasksValue {
  /** Open, dated tasks assigned to me whose due time has passed — soonest first. */
  dueTasks: InboxTask[];
  /** The task currently focused in the banner. */
  current: InboxTask | null;
  index: number;
  next: () => void;
  prev: () => void;
  /** A brand-new due task to flash top-right (with sound); cleared after showing. */
  alert: InboxTask | null;
  dismissAlert: () => void;
  complete: (task: InboxTask) => Promise<void>;
  remove: (task: InboxTask) => Promise<void>;
  open: (task: InboxTask) => void;
}

const Ctx = createContext<DueTasksValue | null>(null);

export function useDueTasks(): DueTasksValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDueTasks must be used within DueTasksProvider");
  return v;
}

export function DueTasksProvider({ children }: { children: React.ReactNode }) {
  const isAuthReady = useAuthReady();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: tasks } = useQuery({
    queryKey: qk.myOpenTasks,
    queryFn: () => getTasks({ status: "open", assigneeId: "mine" }),
    enabled: isAuthReady,
    // Poll while the tab is visible; React Query pauses interval when hidden.
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: POLL_MS,
  });

  // Open, dated, past-due tasks (soonest-due first). "Due" = has a due time
  // that has passed; undated tasks never trigger a reminder.
  const dueTasks = useMemo(() => {
    const now = Date.now();
    return (tasks ?? [])
      .filter((t) => !t.done && t.dueAt && new Date(t.dueAt).getTime() <= now)
      .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime());
  }, [tasks]);

  // Banner focus index — clamps as the list changes (completing the current
  // task drops it; the banner then focuses the next outstanding one).
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex((i) => (dueTasks.length === 0 ? 0 : Math.min(i, dueTasks.length - 1)));
  }, [dueTasks.length]);

  // Detect tasks that have NEWLY become due since the app loaded, to fire the
  // sound + top-right flash exactly once each. On first successful poll we seed
  // the "seen" set silently so a page load doesn't blast the chime for every
  // already-overdue task.
  const seenRef = useRef<Set<string> | null>(null);
  const [alertQueue, setAlertQueue] = useState<InboxTask[]>([]);
  useEffect(() => {
    if (!tasks) return;
    const dueIds = dueTasks.map((t) => t.id);
    if (seenRef.current === null) {
      seenRef.current = new Set(dueIds); // silent seed on first poll
      return;
    }
    const fresh = dueTasks.filter((t) => !seenRef.current!.has(t.id));
    for (const t of dueTasks) seenRef.current.add(t.id);
    // Drop ids no longer due so a task can re-alert if it's reopened later.
    seenRef.current = new Set([...seenRef.current].filter((id) => dueIds.includes(id)));
    if (fresh.length > 0) setAlertQueue((q) => [...q, ...fresh]);
  }, [tasks, dueTasks]);

  // Play the chime when a fresh alert arrives. Browsers block autoplay before
  // any user gesture — we swallow that rejection silently.
  const alert = alertQueue[0] ?? null;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!alert) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(SOUND_SRC);
      audioRef.current.volume = 0.5;
    }
    audioRef.current.currentTime = 0;
    void audioRef.current.play().catch(() => {});
    // Auto-dismiss the top-right flash after 8s (the banner keeps persisting).
    const t = setTimeout(() => setAlertQueue((q) => q.slice(1)), 8000);
    return () => clearTimeout(t);
  }, [alert]);

  const dismissAlert = useCallback(() => setAlertQueue((q) => q.slice(1)), []);
  const next = useCallback(() => setIndex((i) => (dueTasks.length ? (i + 1) % dueTasks.length : 0)), [dueTasks.length]);
  const prev = useCallback(() => setIndex((i) => (dueTasks.length ? (i - 1 + dueTasks.length) % dueTasks.length : 0)), [dueTasks.length]);

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: qk.myOpenTasks }), [qc]);

  const complete = useCallback(async (task: InboxTask) => {
    // Optimistically drop it so the banner advances immediately.
    qc.setQueryData<InboxTask[]>(qk.myOpenTasks, (prev) => (prev ?? []).filter((t) => t.id !== task.id));
    try { await updateLeadTask(task.id, { done: true }); } finally { void refresh(); }
  }, [qc, refresh]);

  const remove = useCallback(async (task: InboxTask) => {
    qc.setQueryData<InboxTask[]>(qk.myOpenTasks, (prev) => (prev ?? []).filter((t) => t.id !== task.id));
    try { await deleteLeadTask(task.id); } finally { void refresh(); }
  }, [qc, refresh]);

  const open = useCallback((task: InboxTask) => {
    if (task.leadId && task.funnelId) router.push(`/dashboard/leads/${task.leadId}?c=${task.funnelId}&from=leads`);
  }, [router]);

  const value = useMemo<DueTasksValue>(() => ({
    dueTasks,
    current: dueTasks[index] ?? dueTasks[0] ?? null,
    index: Math.min(index, Math.max(0, dueTasks.length - 1)),
    next, prev, alert, dismissAlert, complete, remove, open,
  }), [dueTasks, index, next, prev, alert, dismissAlert, complete, remove, open]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
