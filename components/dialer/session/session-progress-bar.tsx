"use client";

import { useDialerContext } from "../context/dialer-context";
import { Pause, Play, X } from "lucide-react";
import { useRouter } from "next/navigation";

export function SessionProgressBar() {
  const router = useRouter();
  const { session, pause, resume, end } = useDialerContext();
  if (!session) return null;
  const pct = session.totalLeads ? Math.round((session.completedLeads / session.totalLeads) * 100) : 0;

  async function handleEnd() {
    await end();
    router.push("/dashboard/funnels");
  }

  return (
    <header className="flex items-center gap-4 px-5 py-3 border-b border-border-subtle bg-surface">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] text-ink-secondary">
            {session.completedLeads} / {session.totalLeads} · {pct}%
          </p>
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">
            {session.status}
          </p>
        </div>
        <div className="w-full h-1.5 bg-section rounded-full overflow-hidden">
          <div
            className="h-full bg-signal-green transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {session.status === "active" ? (
          <button
            type="button"
            onClick={() => void pause()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover"
          >
            <Pause size={11} /> Pause
          </button>
        ) : session.status === "paused" ? (
          <button
            type="button"
            onClick={() => void resume()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] bg-signal-green text-signal-green-text text-[11px] font-medium hover:opacity-90"
          >
            <Play size={11} /> Resume
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleEnd}
          className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] bg-signal-red/10 text-signal-red-text text-[11px] font-medium hover:bg-signal-red/20"
        >
          <X size={11} /> End
        </button>
      </div>
    </header>
  );
}
