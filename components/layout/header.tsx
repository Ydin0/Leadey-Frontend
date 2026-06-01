"use client";

import { Search } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { NotificationDropdown } from "@/components/dashboard/notification-dropdown";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { DialerDropdown } from "@/components/calling/dialer/dialer-dropdown";

export function Header() {
  return (
    <header className="fixed top-0 left-[56px] right-0 z-30 h-14 bg-[rgba(10,14,31,0.7)] backdrop-blur-md border-b border-white/[0.06] flex items-center px-6 gap-4">
      {/* Spacer */}
      <div className="flex-1" />

      {/* Search — glass pill, periwinkle accents on focus */}
      <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-1.5 w-[260px] shrink-0 transition-colors focus-within:border-white/[0.16] focus-within:bg-white/[0.06]">
        <Search size={13} strokeWidth={1.5} className="text-[#97A4D6] shrink-0" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-[12px] text-ink outline-none w-full placeholder:text-ink-muted"
        />
      </div>

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* Phone Dialer */}
      <DialerDropdown />

      {/* Notifications */}
      <NotificationDropdown />

      {/* User Menu */}
      <UserButton afterSignOutUrl="/sign-in" />
    </header>
  );
}
