"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare, ArrowUpRight } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { getSmsThreads, type SmsThread } from "@/lib/api/sms";

/** Messages tab — every SMS conversation across the org, newest first, with the
 *  ones awaiting a reply flagged. */
export function MessagesInbox() {
  const router = useRouter();
  const [threads, setThreads] = useState<SmsThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSmsThreads()
      .then((t) => { if (!cancelled) setThreads(t); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex-1 flex flex-col rounded-[14px] border border-border-subtle bg-surface overflow-hidden min-h-0">
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={18} className="animate-spin text-ink-muted" /></div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-6">
            <MessageSquare size={20} className="text-ink-faint" />
            <p className="text-[12px] text-ink-muted">No text conversations yet.</p>
          </div>
        ) : (
          threads.map((t) => (
            <div key={t.key} className="group relative flex items-center gap-3 px-3 py-2.5 border-b border-border-subtle hover:bg-hover/40 transition-colors">
              <span className={cn("flex items-center justify-center w-8 h-8 rounded-full shrink-0",
                t.needsReply ? "bg-signal-green/15 text-signal-green-text" : "bg-section text-ink-muted")}>
                <MessageSquare size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] text-ink truncate">{t.contactName || t.phone}</span>
                  {t.needsReply && (
                    <span className="text-[9px] font-medium uppercase tracking-wide rounded-full px-1.5 py-0.5 bg-signal-green/15 text-signal-green-text shrink-0">Reply</span>
                  )}
                </div>
                <div className="text-[10.5px] text-ink-muted truncate">
                  {t.lastDirection === "inbound" ? "" : "You: "}{t.lastBody || "—"}
                </div>
              </div>
              <span className="text-[10.5px] text-ink-faint shrink-0 w-16 text-right">{formatRelativeTime(new Date(t.lastAt))}</span>
              {t.leadId && t.funnelId && (
                <button
                  onClick={() => router.push(`/dashboard/funnels/${t.funnelId}/leads/${t.leadId}`)}
                  title="Open lead"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-hover opacity-0 group-hover:opacity-100 transition-opacity bg-surface"
                >
                  <ArrowUpRight size={13} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
