"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, MessageSquare, ArrowUpRight } from "lucide-react";
import { cn, formatRelativeTime, formatPhoneNumber } from "@/lib/utils";
import { getSmsThreads, type SmsThread } from "@/lib/api/sms";
import { SmsThreadDrawer } from "@/components/sms/sms-thread-drawer";
import { CompanyAvatar } from "@/components/funnels/focus/company-avatar";

/** Messages tab — every SMS conversation across the org, newest first, with the
 *  ones awaiting a reply flagged. Clicking a row opens a WhatsApp-style chat. */
export function MessagesInbox() {
  const router = useRouter();
  const [threads, setThreads] = useState<SmsThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<SmsThread | null>(null);

  const refresh = useCallback(() => {
    return getSmsThreads().then(setThreads).catch(() => {});
  }, []);

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
            <div
              key={t.key}
              onClick={() => setActive(t)}
              className="group relative flex items-center gap-3 px-3 py-2.5 border-b border-border-subtle hover:bg-hover/40 transition-colors cursor-pointer"
            >
              {/* Company logo when known, message glyph otherwise */}
              {t.company ? (
                <span className="relative shrink-0">
                  <CompanyAvatar name={t.company} domain={t.companyDomain || undefined} size="lg" />
                  {t.needsReply && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-signal-green-text border-2 border-surface" />
                  )}
                </span>
              ) : (
                <span className={cn("flex items-center justify-center w-10 h-10 rounded-full shrink-0",
                  t.needsReply ? "bg-signal-green/15 text-signal-green-text" : "bg-section text-ink-muted")}>
                  <MessageSquare size={15} />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[12.5px] font-medium text-ink truncate">
                    {t.contactName || formatPhoneNumber(t.phone)}
                  </span>
                  {t.contactName && (
                    <span className="text-[10.5px] text-ink-muted shrink-0">{formatPhoneNumber(t.phone)}</span>
                  )}
                  {t.needsReply && (
                    <span className="text-[9px] font-medium uppercase tracking-wide rounded-full px-1.5 py-0.5 bg-signal-green/15 text-signal-green-text shrink-0">Reply</span>
                  )}
                </div>
                <div className="text-[10.5px] text-ink-muted truncate">
                  {t.lastDirection === "inbound" ? "" : "You: "}{t.lastBody || "—"}
                </div>
              </div>

              {/* Company identity — links to the universal company profile */}
              {t.company && (
                <div
                  className="hidden sm:flex flex-col items-end shrink-0 max-w-[180px] text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t.masterCompanyId ? (
                    <Link
                      href={`/dashboard/companies/${encodeURIComponent(t.masterCompanyId)}`}
                      className="text-[11px] font-medium text-ink-secondary hover:text-ink hover:underline truncate max-w-full"
                      title={t.company}
                    >
                      {t.company}
                    </Link>
                  ) : (
                    <span className="text-[11px] font-medium text-ink-secondary truncate max-w-full">{t.company}</span>
                  )}
                  {t.companyDomain && (
                    <span className="text-[10px] text-ink-faint truncate max-w-full">{t.companyDomain}</span>
                  )}
                </div>
              )}

              <span className="text-[10.5px] text-ink-faint shrink-0 w-16 text-right">{formatRelativeTime(new Date(t.lastAt))}</span>
              {t.leadId && t.funnelId && (
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/funnels/${t.funnelId}/leads/${t.leadId}`); }}
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

      <SmsThreadDrawer
        open={!!active}
        onClose={() => setActive(null)}
        funnelId={active?.funnelId ?? null}
        leadId={active?.leadId ?? null}
        leadName={active?.contactName || active?.phone || "Conversation"}
        leadPhone={active?.phone ?? null}
        onSent={refresh}
      />
    </div>
  );
}
