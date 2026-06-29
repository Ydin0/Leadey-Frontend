"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ListChecks, Bell, PhoneIncoming, MessageSquare, ArrowUpRight, Sparkles } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { getPrimaryFeed, type PrimaryItem, type PrimaryItemType } from "@/lib/api/inbox";

const META: Record<PrimaryItemType, { icon: typeof Bell; cls: string }> = {
  task: { icon: ListChecks, cls: "bg-signal-blue/15 text-signal-blue-text" },
  reminder: { icon: Bell, cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  call: { icon: PhoneIncoming, cls: "bg-signal-red/15 text-signal-red-text" },
  sms: { icon: MessageSquare, cls: "bg-signal-green/15 text-signal-green-text" },
};

/** Primary tab — one chronological "needs attention" feed across channels. */
export function PrimaryFeed() {
  const router = useRouter();
  const [items, setItems] = useState<PrimaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPrimaryFeed()
      .then((d) => { if (!cancelled) setItems(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function open(item: PrimaryItem) {
    // Always go to the lead profile — never auto-dial. Items without a matched
    // lead (unknown caller/texter) live in Potential Contacts instead.
    if (item.leadId && item.funnelId) {
      router.push(`/dashboard/funnels/${item.funnelId}/leads/${item.leadId}`);
    }
  }

  return (
    <div className="flex-1 flex flex-col rounded-[14px] border border-border-subtle bg-surface overflow-hidden min-h-0">
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={18} className="animate-spin text-ink-muted" /></div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-6">
            <Sparkles size={20} className="text-ink-faint" />
            <p className="text-[13px] font-semibold text-ink">You&apos;re all caught up</p>
            <p className="text-[12px] text-ink-muted">No tasks due, missed calls, or unanswered texts need you right now.</p>
          </div>
        ) : (
          items.map((item) => {
            const m = META[item.type];
            const Icon = m.icon;
            return (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => open(item)}
                className="group w-full text-left flex items-center gap-3 px-3 py-2.5 border-b border-border-subtle hover:bg-hover/40 transition-colors"
              >
                <span className={cn("flex items-center justify-center w-8 h-8 rounded-full shrink-0", m.cls)}>
                  <Icon size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] text-ink truncate">{item.title}</div>
                  <div className="text-[10.5px] text-ink-muted truncate">{item.subtitle}</div>
                </div>
                <span className="text-[10.5px] text-ink-faint shrink-0 w-16 text-right">{formatRelativeTime(new Date(item.time))}</span>
                <ArrowUpRight size={13} className="text-ink-faint shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
