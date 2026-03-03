"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { getPhoneLines } from "@/lib/api/phone-lines";
import { PhoneLineStatusBadge } from "@/components/calling/shared/phone-line-status-badge";
import type { PhoneLine } from "@/lib/types/calling";

const countryFlags: Record<string, string> = {
  US: "\u{1F1FA}\u{1F1F8}",
  GB: "\u{1F1EC}\u{1F1E7}",
  DE: "\u{1F1E9}\u{1F1EA}",
  FR: "\u{1F1EB}\u{1F1F7}",
  CA: "\u{1F1E8}\u{1F1E6}",
  AU: "\u{1F1E6}\u{1F1FA}",
};

const typeBadgeStyles: Record<string, string> = {
  local: "bg-signal-blue text-signal-blue-text",
  "toll-free": "bg-signal-green text-signal-green-text",
  mobile: "bg-signal-slate text-signal-slate-text",
};

export function CallingLinesSummary() {
  const [allLines, setAllLines] = useState<PhoneLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPhoneLines()
      .then(setAllLines)
      .catch((err) => console.error("Failed to fetch lines:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={16} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  const lines = allLines.slice(0, 5);

  return (
    <div>
      <div className="space-y-1">
        {lines.map((line) => (
          <div
            key={line.id}
            className="flex items-center justify-between rounded-[8px] px-2 py-2 hover:bg-hover transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="text-[14px]">{countryFlags[line.countryCode] || ""}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-ink font-medium truncate">{line.number}</p>
                  <span className={`text-[9px] font-medium rounded-full px-1.5 py-0.5 ${typeBadgeStyles[line.type] || ""}`}>
                    {line.type}
                  </span>
                </div>
                <p className="text-[10px] text-ink-muted truncate">{line.friendlyName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {line.assignedToName && (
                <span className="text-[10px] text-ink-secondary">{line.assignedToName}</span>
              )}
              <PhoneLineStatusBadge status={line.status} />
            </div>
          </div>
        ))}
      </div>

      {allLines.length > 5 && (
        <div className="mt-2 pt-2 border-t border-border-subtle">
          <Link
            href="/dashboard/settings"
            className="text-[11px] text-signal-blue-text font-medium hover:underline"
          >
            View all {allLines.length} lines in Settings
          </Link>
        </div>
      )}

      {allLines.length === 0 && (
        <p className="text-[12px] text-ink-muted text-center py-4">No phone lines provisioned yet.</p>
      )}
    </div>
  );
}
