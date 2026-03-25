"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Inbox } from "lucide-react";

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-surface rounded-[14px] border border-border-subtle overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-border-subtle">
            <h3 className="text-[13px] font-medium text-ink">Notifications</h3>
          </div>
          <div className="px-4 py-8 text-center">
            <Inbox size={20} strokeWidth={1.5} className="text-ink-faint mx-auto mb-2" />
            <p className="text-[12px] text-ink-muted">No new notifications</p>
          </div>
        </div>
      )}
    </div>
  );
}
