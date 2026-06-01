"use client";

import { useDialerContext } from "../context/dialer-context";
import { useDialerKeyboard } from "../context/use-dialer-keyboard";
import { LeadContextPanel } from "./lead-context-panel";
import { CallControlPanel } from "./call-control-panel";
import { DispositionPanel } from "./disposition-panel";
import { NextUpList } from "./next-up-list";
import { SessionProgressBar } from "./session-progress-bar";
import { AwaitingDispositionOverlay } from "./awaiting-disposition-overlay";
import { Loader2 } from "lucide-react";

export function DialerSessionPage() {
  // Bind global keyboard shortcuts for the duration of this page.
  useDialerKeyboard();

  const { session, currentItem, loading } = useDialerContext();

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  if (session.status === "completed" || (!currentItem && session.completedLeads >= session.totalLeads)) {
    return <CompletedView />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-page">
      <SessionProgressBar />
      <div className="grid grid-cols-[320px_1fr_360px] flex-1 min-h-0 relative">
        <AwaitingDispositionOverlay />
        <div className="border-r border-border-subtle bg-surface">
          <LeadContextPanel item={currentItem} />
        </div>
        <div className="bg-page">
          <CallControlPanel />
        </div>
        <div className="border-l border-border-subtle bg-surface flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <DispositionPanel />
          </div>
          <div className="px-5 py-4 border-t border-border-subtle">
            <NextUpList />
          </div>
        </div>
      </div>
    </div>
  );
}

function CompletedView() {
  const { session } = useDialerContext();
  if (!session) return null;
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
      <h1 className="text-[18px] font-semibold text-ink">Session complete</h1>
      <p className="text-[12px] text-ink-muted text-center max-w-sm">
        Worked through {session.completedLeads} of {session.totalLeads} contacts.
        Funnel actions have been applied based on dispositions.
      </p>
      {Object.keys(session.dispositions || {}).length > 0 && (
        <div className="bg-surface rounded-[14px] border border-border-subtle px-6 py-4 min-w-[260px]">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
            Dispositions
          </p>
          <ul className="space-y-1">
            {Object.entries(session.dispositions).map(([slug, count]) => (
              <li key={slug} className="flex justify-between text-[12px]">
                <span className="text-ink-muted">{slug}</span>
                <span className="text-ink font-medium">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
