"use client";

import { useCallContext } from "@/components/calling/call-context";

export function LineSelector() {
  const { phoneLines, selectedLineId, setSelectedLineId } = useCallContext();
  const activeLines = phoneLines.filter((l) => l.status === "active");

  if (activeLines.length === 0) return null;

  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1">
        Calling from
      </label>
      <select
        value={selectedLineId ?? ""}
        onChange={(e) => setSelectedLineId(e.target.value || null)}
        className="w-full px-3 py-1.5 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
      >
        <option value="">Select a line</option>
        {activeLines.map((line) => (
          <option key={line.id} value={line.id}>
            {line.friendlyName} — {line.number}
          </option>
        ))}
      </select>
    </div>
  );
}
