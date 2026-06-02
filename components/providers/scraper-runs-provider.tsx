"use client";

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from "react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import {
  triggerScraperRun, updateSavedSearch, getScraperRuns, getScraperAssignments,
  type ScraperRunRow,
} from "@/lib/api/scrapers";

export type ScraperRunStatus = "running" | "done" | "failed";

export interface ScraperRunEntry {
  assignmentId: string;
  name: string;
  status: ScraperRunStatus;
  startedAt: number;
  finishedAt?: number;
  signalsCreated?: number;
  companiesFound?: number;
  error?: string;
}

interface ScraperRunsContextValue {
  runs: ScraperRunEntry[];
  startRun: (assignmentId: string, name: string, opts?: { maxSignalsPerRun?: number }) => void;
  isRunning: (assignmentId: string) => boolean;
  stopRun: (assignmentId: string) => void;
  dismissRun: (assignmentId: string) => void;
}

const Ctx = createContext<ScraperRunsContextValue | null>(null);

export function useScraperRuns() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useScraperRuns must be used within ScraperRunsProvider");
  return ctx;
}

function latestByAssignment(rows: ScraperRunRow[]): Map<string, ScraperRunRow> {
  // rows arrive newest-first; keep the first seen per assignment.
  const map = new Map<string, ScraperRunRow>();
  for (const r of rows) {
    if (!map.has(r.assignmentId)) map.set(r.assignmentId, r);
  }
  return map;
}

export function ScraperRunsProvider({ children }: { children: React.ReactNode }) {
  const isAuthReady = useAuthReady();
  const [runs, setRuns] = useState<ScraperRunEntry[]>([]);
  const abortMap = useRef<Map<string, AbortController>>(new Map());
  const namesRef = useRef<Map<string, string>>(new Map());
  const dismissedRef = useRef<Set<string>>(new Set());

  const upsert = useCallback(
    (entry: Partial<ScraperRunEntry> & { assignmentId: string }) => {
      setRuns((prev) => {
        const i = prev.findIndex((r) => r.assignmentId === entry.assignmentId);
        if (i === -1) {
          return [
            {
              name: "Scraper", status: "running", startedAt: Date.now(),
              ...entry,
            } as ScraperRunEntry,
            ...prev,
          ];
        }
        const next = [...prev];
        next[i] = { ...next[i], ...entry };
        return next;
      });
    },
    [],
  );

  const isRunning = useCallback(
    (id: string) => runs.some((r) => r.assignmentId === id && r.status === "running"),
    [runs],
  );

  const startRun = useCallback(
    (assignmentId: string, name: string, opts?: { maxSignalsPerRun?: number }) => {
      // Already running — ignore.
      if (abortMap.current.has(assignmentId)) return;
      dismissedRef.current.delete(assignmentId);
      namesRef.current.set(assignmentId, name);
      upsert({ assignmentId, name, status: "running", startedAt: Date.now(), finishedAt: undefined, error: undefined });

      const controller = new AbortController();
      abortMap.current.set(assignmentId, controller);

      (async () => {
        try {
          if (opts?.maxSignalsPerRun != null) {
            await updateSavedSearch(assignmentId, { maxSignalsPerRun: opts.maxSignalsPerRun });
          }
          const res = await triggerScraperRun(assignmentId, controller.signal);
          if (dismissedRef.current.has(assignmentId)) return;
          upsert({
            assignmentId, status: "done", finishedAt: Date.now(),
            signalsCreated: res.signalsCreated, companiesFound: res.companiesFound,
          });
        } catch (err) {
          if (controller.signal.aborted || dismissedRef.current.has(assignmentId)) return;
          upsert({
            assignmentId, status: "failed", finishedAt: Date.now(),
            error: err instanceof Error ? err.message : "Run failed",
          });
        } finally {
          abortMap.current.delete(assignmentId);
        }
      })();
    },
    [upsert],
  );

  const stopRun = useCallback((id: string) => {
    abortMap.current.get(id)?.abort();
    abortMap.current.delete(id);
    dismissedRef.current.add(id);
    setRuns((prev) => prev.filter((r) => r.assignmentId !== id));
  }, []);

  const dismissRun = useCallback((id: string) => {
    dismissedRef.current.add(id);
    setRuns((prev) => prev.filter((r) => r.assignmentId !== id));
  }, []);

  // On mount: load assignment names + detect any already-running runs (e.g.
  // a run still finishing on the server after a full page reload).
  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    (async () => {
      try {
        const assignments = await getScraperAssignments();
        if (cancelled) return;
        for (const a of assignments) {
          namesRef.current.set(a.id, a.searchName || a.scraperName || "Scraper");
        }
        const rows = await getScraperRuns();
        if (cancelled) return;
        for (const r of latestByAssignment(rows).values()) {
          if ((r.status === "running" || r.status === "pending") && !dismissedRef.current.has(r.assignmentId)) {
            upsert({
              assignmentId: r.assignmentId,
              name: namesRef.current.get(r.assignmentId) || "Scraper",
              status: "running",
              startedAt: r.startedAt ? +new Date(r.startedAt) : Date.now(),
            });
          }
        }
      } catch { /* non-critical */ }
    })();
    return () => { cancelled = true; };
  }, [isAuthReady, upsert]);

  // Poll run status while anything is running (handles reload + server-side
  // completion of runs we aren't directly awaiting).
  const hasRunning = runs.some((r) => r.status === "running");
  useEffect(() => {
    if (!isAuthReady || !hasRunning) return;
    const interval = setInterval(async () => {
      try {
        const rows = await getScraperRuns();
        const latest = latestByAssignment(rows);
        setRuns((prev) =>
          prev.map((entry) => {
            if (entry.status !== "running" || dismissedRef.current.has(entry.assignmentId)) return entry;
            const r = latest.get(entry.assignmentId);
            if (!r) return entry;
            if (r.status === "succeeded") {
              return { ...entry, status: "done", finishedAt: Date.now(), signalsCreated: r.signalsCreated };
            }
            if (r.status === "failed") {
              return { ...entry, status: "failed", finishedAt: Date.now(), error: r.error || "Run failed" };
            }
            return entry;
          }),
        );
      } catch { /* keep polling */ }
    }, 7000);
    return () => clearInterval(interval);
  }, [isAuthReady, hasRunning]);

  return (
    <Ctx.Provider value={{ runs, startRun, isRunning, stopRun, dismissRun }}>
      {children}
    </Ctx.Provider>
  );
}
