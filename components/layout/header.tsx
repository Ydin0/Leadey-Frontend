"use client";

import { Search } from "lucide-react";
import { quickStats } from "@/lib/mock-data";
import { QuickStatChip } from "@/components/dashboard/quick-stat-chip";
import { NotificationDropdown } from "@/components/dashboard/notification-dropdown";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Header() {
  return (
    <header className="fixed top-0 left-[56px] right-0 z-30 h-14 bg-surface border-b border-border-subtle flex items-center px-6 gap-4">
      {/* Quick Stats */}
      <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {quickStats.map((stat) => (
          <QuickStatChip key={stat.id} stat={stat} />
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-section rounded-[10px] px-3 py-1.5 w-52 shrink-0">
        <Search size={14} strokeWidth={1.5} className="text-ink-muted shrink-0" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-[12px] text-ink outline-none w-full placeholder:text-ink-faint"
        />
      </div>

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* Notifications */}
      <NotificationDropdown />
    </header>
  );
}
