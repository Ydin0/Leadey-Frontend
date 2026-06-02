"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, CheckCircle2, XCircle, X, Square, ExternalLink, Radar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useScraperRuns, type ScraperRunEntry } from "@/components/providers/scraper-runs-provider";

function elapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

export function ScraperRunsWidget() {
  const { runs, stopRun, dismissRun } = useScraperRuns();
  const [now, setNow] = useState(Date.now());

  const hasRunning = runs.some((r) => r.status === "running");
  useEffect(() => {
    if (!hasRunning) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hasRunning]);

  if (runs.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-[320px] max-w-[calc(100vw-2.5rem)]">
      {runs.map((run) => (
        <RunCard
          key={run.assignmentId}
          run={run}
          now={now}
          onStop={() => stopRun(run.assignmentId)}
          onDismiss={() => dismissRun(run.assignmentId)}
        />
      ))}
    </div>
  );
}

function RunCard({
  run, now, onStop, onDismiss,
}: {
  run: ScraperRunEntry;
  now: number;
  onStop: () => void;
  onDismiss: () => void;
}) {
  const running = run.status === "running";
  const done = run.status === "done";
  const failed = run.status === "failed";

  return (
    <div className="bg-surface border border-border-default rounded-[14px] shadow-2xl overflow-hidden animate-in">
      <div className="flex items-start gap-3 p-3">
        {/* Status icon */}
        <div
          className={cn(
            "w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0",
            running && "bg-signal-blue/15",
            done && "bg-signal-green/15",
            failed && "bg-signal-red/15",
          )}
        >
          {running && <Loader2 size={15} className="animate-spin text-signal-blue-text" />}
          {done && <CheckCircle2 size={15} className="text-signal-green-text" />}
          {failed && <XCircle size={15} className="text-signal-red-text" />}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Radar size={11} className="text-ink-muted shrink-0" />
            <span className="text-[12px] font-semibold text-ink truncate">{run.name}</span>
          </div>

          {running && (
            <p className="text-[11px] text-ink-muted mt-0.5">
              Scraping… <span className="text-ink-faint">· {elapsed(now - run.startedAt)}</span>
            </p>
          )}
          {done && (
            <p className="text-[11px] text-signal-green-text mt-0.5">
              Done —{" "}
              <span className="text-ink-secondary">
                {(run.signalsCreated ?? 0).toLocaleString()} signal{run.signalsCreated === 1 ? "" : "s"}
                {run.companiesFound != null && ` · ${run.companiesFound.toLocaleString()} companies`}
              </span>
            </p>
          )}
          {failed && (
            <p className="text-[11px] text-signal-red-text mt-0.5 truncate" title={run.error}>
              {run.error || "Run failed"}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            {running ? (
              <button
                onClick={onStop}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-section border border-border-subtle text-[10px] font-medium text-ink-secondary hover:bg-hover transition-colors"
              >
                <Square size={9} /> Stop
              </button>
            ) : (
              <Link
                href={`/dashboard/scrapers/${run.assignmentId}`}
                onClick={onDismiss}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-ink text-on-ink text-[10px] font-medium hover:bg-ink/90 transition-colors"
              >
                <ExternalLink size={9} /> View results
              </Link>
            )}
          </div>
        </div>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="p-1 rounded-md text-ink-faint hover:text-ink-muted hover:bg-hover transition-colors shrink-0"
          title={running ? "Hide (keeps running)" : "Dismiss"}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
