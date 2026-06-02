"use client";

import { UserButton } from "@clerk/nextjs";
import { NotificationDropdown } from "@/components/dashboard/notification-dropdown";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { DialerDropdown } from "@/components/calling/dialer/dialer-dropdown";
import { GlobalSearch } from "@/components/layout/global-search";

export function Header() {
  return (
    <header className="brand-chrome fixed top-0 left-[56px] right-0 z-30 h-14 border-b flex items-center px-6 gap-4">
      {/* Smart global search — leads, companies, campaigns, members & more. */}
      <GlobalSearch />

      {/* Spacer pushes the action cluster to the right. */}
      <div className="flex-1" />

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
