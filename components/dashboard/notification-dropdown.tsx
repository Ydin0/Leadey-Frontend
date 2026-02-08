"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, MessageSquare, Radio, Zap, AlertTriangle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { mockNotifications } from "@/lib/mock-data";

const typeIcons = {
  reply: MessageSquare,
  signal: Radio,
  sequence: Zap,
  alert: AlertTriangle,
  system: Settings,
};

const typeColors = {
  reply: "text-signal-blue-text bg-signal-blue",
  signal: "text-signal-blue-text bg-signal-blue",
  sequence: "text-signal-slate-text bg-signal-slate",
  alert: "text-signal-red-text bg-signal-red",
  system: "text-signal-slate-text bg-signal-slate",
};

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-hover transition-colors"
      >
        <Bell size={17} strokeWidth={1.5} className="text-ink-muted" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-signal-red-text text-white text-[9px] font-medium flex items-center justify-center leading-none">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface rounded-[14px] border border-border-subtle overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-border-subtle">
            <h3 className="text-[13px] font-medium text-ink">Notifications</h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {mockNotifications.map((notification) => {
              const TypeIcon = typeIcons[notification.type];
              const colorClass = typeColors[notification.type];

              return (
                <div
                  key={notification.id}
                  className={cn(
                    "flex gap-3 px-4 py-3 hover:bg-hover/40 transition-colors cursor-pointer",
                    !notification.read && "bg-signal-blue/30"
                  )}
                >
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", colorClass)}>
                    <TypeIcon size={14} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-[12px] leading-tight", !notification.read ? "font-medium text-ink" : "text-ink-secondary")}>
                      {notification.title}
                    </p>
                    <p className="text-[11px] text-ink-muted mt-0.5 line-clamp-2">{notification.description}</p>
                    <p className="text-[10px] text-ink-faint mt-1">{formatRelativeTime(notification.timestamp)}</p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-signal-blue-text shrink-0 mt-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
