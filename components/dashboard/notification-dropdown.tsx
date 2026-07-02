"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Inbox, MessageSquare, Loader2 } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import {
  listNotifications, markNotificationRead, markAllNotificationsRead,
  type AppNotification,
} from "@/lib/api/notifications";

const POLL_MS = 30_000;

export function NotificationDropdown() {
  const router = useRouter();
  const isAuthReady = useAuthReady();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await listNotifications();
      setItems(res.data);
      setUnread(res.meta.unreadCount);
    } catch {
      // transient — keep prior state
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll for new notifications so the badge stays live — but not in hidden
  // tabs, where the requests are pure waste.
  useEffect(() => {
    if (!isAuthReady) return;
    void load();
    const tick = () => {
      if (document.visibilityState === "visible") void load();
    };
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [isAuthReady, load]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleClick(n: AppNotification) {
    setOpen(false);
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      void markNotificationRead(n.id);
    }
    if (n.funnelId && n.leadId) {
      router.push(`/dashboard/funnels/${n.funnelId}/leads/${n.leadId}`);
    }
  }

  async function handleMarkAll() {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnread(0);
    void markAllNotificationsRead();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-hover transition-colors"
      >
        <Bell size={17} strokeWidth={1.5} className="text-ink-muted" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-signal-red-text text-on-ink text-[9px] font-semibold flex items-center justify-center tabular-nums">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface rounded-[14px] border border-border-subtle overflow-hidden z-50 shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <h3 className="text-[13px] font-medium text-ink">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-[11px] text-signal-blue-text hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Loader2 size={18} className="animate-spin text-ink-muted mx-auto" />
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Inbox size={20} strokeWidth={1.5} className="text-ink-faint mx-auto mb-2" />
                <p className="text-[12px] text-ink-muted">No new notifications</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full text-left flex items-start gap-2.5 px-4 py-3 border-b border-border-subtle last:border-0 hover:bg-hover transition-colors",
                    !n.read && "bg-signal-blue/5",
                  )}
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-signal-green/15 text-signal-green-text shrink-0 mt-0.5">
                    <MessageSquare size={13} strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-ink truncate">{n.title}</p>
                    {n.body && <p className="text-[11px] text-ink-muted line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-ink-faint mt-0.5">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-signal-blue-text shrink-0 mt-1.5" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
