"use client";

import { useCallContext } from "@/components/calling/call-context";
import { RecentCallRow } from "./recent-call-row";

export function RecentCallsList() {
  const { callHistory, startCall } = useCallContext();

  if (callHistory.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[12px] text-ink-muted">No recent calls</p>
      </div>
    );
  }

  return (
    <div className="max-h-60 overflow-y-auto">
      {callHistory.map((call) => (
        <RecentCallRow key={call.id} call={call} onCallBack={startCall} />
      ))}
    </div>
  );
}
