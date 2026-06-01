"use client";

import { useState } from "react";
import { useDialerContext } from "../context/dialer-context";
import { cn } from "@/lib/utils";

const BUCKET_STYLES: Record<string, string> = {
  contacted: "bg-signal-green/10 hover:bg-signal-green/20 text-signal-green-text",
  not_contacted: "bg-signal-blue/10 hover:bg-signal-blue/20 text-signal-blue-text",
  negative: "bg-signal-red/10 hover:bg-signal-red/20 text-signal-red-text",
};

export function DispositionPanel() {
  const dialer = useDialerContext();
  const [notes, setNotes] = useState("");

  const grouped = {
    contacted: dialer.dispositions.filter((d) => d.outcomeBucket === "contacted"),
    not_contacted: dialer.dispositions.filter((d) => d.outcomeBucket === "not_contacted"),
    negative: dialer.dispositions.filter((d) => d.outcomeBucket === "negative"),
  };

  async function handleClick(slug: string) {
    await dialer.advance(slug, notes.trim() || undefined);
    setNotes("");
  }

  return (
    <aside className="flex flex-col h-full overflow-y-auto px-5 py-5 space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-ink">Disposition</h3>
        {dialer.awaitingDisposition && (
          <span className="text-[10px] uppercase tracking-wider text-signal-blue-text font-medium">
            Pick one to continue
          </span>
        )}
      </header>

      {(["contacted", "not_contacted", "negative"] as const).map((bucket) => (
        <DispoBucket key={bucket} bucket={bucket}>
          {grouped[bucket].map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => handleClick(d.slug)}
              disabled={!dialer.awaitingDisposition && !dialer.currentItem}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-[8px] text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                BUCKET_STYLES[bucket] || "bg-section",
              )}
            >
              <span>{d.label}</span>
              {d.hotkey && (
                <span className="text-[10px] font-mono opacity-60">
                  {d.hotkey}
                </span>
              )}
            </button>
          ))}
        </DispoBucket>
      ))}

      <div>
        <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1 block">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Add context for this call — saved with the disposition…"
          className="w-full px-3 py-2 rounded-[8px] bg-surface border border-border-subtle text-[12px] text-ink resize-none outline-none focus:border-border-default placeholder:text-ink-faint"
        />
      </div>

      <SessionStats />
    </aside>
  );
}

function DispoBucket({
  bucket,
  children,
}: {
  bucket: "contacted" | "not_contacted" | "negative";
  children: React.ReactNode;
}) {
  const label =
    bucket === "contacted" ? "Contacted" : bucket === "not_contacted" ? "Not contacted" : "Negative";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
        {label}
      </p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function SessionStats() {
  const { session } = useDialerContext();
  if (!session) return null;
  const counts = session.dispositions || {};
  const entries = Object.entries(counts);
  return (
    <div className="mt-2 pt-3 border-t border-border-subtle">
      <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
        Session
      </p>
      <p className="text-[11px] text-ink-secondary mb-2">
        {session.completedLeads} / {session.totalLeads} completed
      </p>
      {entries.length > 0 && (
        <ul className="space-y-1">
          {entries.map(([slug, count]) => (
            <li key={slug} className="flex items-center justify-between text-[11px]">
              <span className="text-ink-muted">{slug}</span>
              <span className="text-ink">{count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
