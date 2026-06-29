"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Phone, PhoneIncoming, ArrowUpRight, PhoneCall } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { getCallRecords } from "@/lib/api/phone-lines";
import { useCallContext } from "@/components/calling/call-context";
import type { CallRecord } from "@/lib/types/calling";

/** Calls tab — recent inbound calls, surfacing the ones that didn't connect so
 *  reps can call them straight back. */
export function CallsInbox() {
  const router = useRouter();
  const { startCall } = useCallContext();
  const [records, setRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Only MISSED inbound calls belong in the inbox (not connected ones, not
    // outbound). Fetch inbound and keep the unanswered ones.
    getCallRecords({ direction: "inbound", limit: 100 })
      .then((r) => { if (!cancelled) setRecords(r.data.filter((c) => c.disposition !== "completed")); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex-1 flex flex-col rounded-[14px] border border-border-subtle bg-surface overflow-hidden min-h-0">
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={18} className="animate-spin text-ink-muted" /></div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-6">
            <PhoneIncoming size={20} className="text-ink-faint" />
            <p className="text-[12px] text-ink-muted">No missed calls. You&apos;re all caught up.</p>
          </div>
        ) : (
          records.map((c) => {
            const connected = false; // this tab only shows missed calls
            return (
              <div key={c.id} className="group relative flex items-center gap-3 px-3 py-2.5 border-b border-border-subtle hover:bg-hover/40 transition-colors">
                <span className={cn("flex items-center justify-center w-8 h-8 rounded-full shrink-0",
                  connected ? "bg-signal-green/15 text-signal-green-text" : "bg-signal-red/15 text-signal-red-text")}>
                  <PhoneIncoming size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] text-ink truncate">{c.contactName || c.from || "Unknown caller"}</div>
                  <div className="text-[10.5px] text-ink-muted truncate">
                    {connected ? `Connected · ${c.duration}s` : `Missed · ${c.disposition}`}
                    {c.companyName ? ` · ${c.companyName}` : ""}
                  </div>
                </div>
                <span className="text-[10.5px] text-ink-faint shrink-0 w-16 text-right">{formatRelativeTime(new Date(c.timestamp))}</span>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-surface pl-3">
                  <button
                    onClick={() => void startCall(c.from, { contactName: c.contactName || undefined })}
                    title="Call back"
                    className="p-1.5 rounded-md text-ink-faint hover:text-signal-green-text hover:bg-signal-green/10"
                  >
                    <PhoneCall size={13} />
                  </button>
                  {c.leadId && c.funnelId && (
                    <button
                      onClick={() => router.push(`/dashboard/funnels/${c.funnelId}/leads/${c.leadId}`)}
                      title="Open lead"
                      className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-hover"
                    >
                      <ArrowUpRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
