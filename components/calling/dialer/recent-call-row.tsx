"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { CallDirectionIcon } from "@/components/calling/shared/call-direction-icon";
import { CallDurationDisplay } from "@/components/calling/shared/call-duration-display";
import type { CallRecord } from "@/lib/types/calling";

interface RecentCallRowProps {
  call: CallRecord;
  onCallBack: (number: string) => void;
}

export function RecentCallRow({ call, onCallBack }: RecentCallRowProps) {
  const [hovered, setHovered] = useState(false);
  const displayName = call.contactName || (call.direction === "outbound" ? call.to : call.from);
  const callbackNumber = call.direction === "outbound" ? call.to : call.from;

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 hover:bg-hover/40 transition-colors cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <CallDirectionIcon direction={call.direction} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-ink truncate">{displayName}</p>
        {call.companyName && (
          <p className="text-[11px] text-ink-muted truncate">{call.companyName}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {hovered ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCallBack(callbackNumber);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-[16px] bg-signal-green-text text-on-ink text-[10px] font-medium hover:bg-signal-green-text/90 transition-colors"
          >
            <Phone size={10} strokeWidth={2} />
            Call
          </button>
        ) : (
          <div className="text-right">
            <p className="text-[10px] text-ink-faint">{formatRelativeTime(call.timestamp)}</p>
            {call.duration > 0 && <CallDurationDisplay seconds={call.duration} />}
          </div>
        )}
      </div>
    </div>
  );
}
