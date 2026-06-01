"use client";

import { Search } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { NotificationDropdown } from "@/components/dashboard/notification-dropdown";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { DialerDropdown } from "@/components/calling/dialer/dialer-dropdown";

export function Header() {
  return (
    <header className="brand-chrome fixed top-0 left-[56px] right-0 z-30 h-14 border-b flex items-center px-6 gap-4">
      {/* Spacer */}
      <div className="flex-1" />

      {/* Search — glass pill that adapts to both themes via the surface
          token. Periwinkle icon, soft focus ring. */}
      <div className="flex items-center gap-2 bg-section border border-border-subtle rounded-full px-4 py-1.5 w-[260px] shrink-0 transition-colors focus-within:border-border-default">
        <Search size={13} strokeWidth={1.5} className="text-ink-muted shrink-0" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-[12px] text-ink outline-none w-full placeholder:text-ink-faint"
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
