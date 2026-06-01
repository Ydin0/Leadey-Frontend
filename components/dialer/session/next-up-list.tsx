"use client";

import { useDialerContext } from "../context/dialer-context";

export function NextUpList() {
  const { upcoming } = useDialerContext();
  if (upcoming.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
        Up Next
      </p>
      <ul className="space-y-1">
        {upcoming.map((q) => (
          <li
            key={q.id}
            className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-[6px] bg-section/60"
          >
            <div className="min-w-0">
              <p className="text-[11px] text-ink truncate font-medium">
                {q.lead?.name || "—"}
              </p>
              <p className="text-[10px] text-ink-muted truncate">
                {q.lead?.company} · {q.leadPhone}
              </p>
            </div>
            <span className="text-[9px] text-ink-faint shrink-0">#{q.position + 1}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
