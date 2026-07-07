"use client";

import { NotificationDropdown } from "@/components/dashboard/notification-dropdown";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { CreditBalancePill } from "@/components/layout/credit-balance-pill";
import { DialerDropdown } from "@/components/calling/dialer/dialer-dropdown";
import { GlobalSearch } from "@/components/layout/global-search";
import { UserMenu } from "@/components/layout/user-menu";
import { TrialBanner } from "@/components/layout/trial-banner";

export function Header() {
  return (
    <header className="brand-chrome fixed top-0 left-[56px] right-0 z-30 h-14 border-b flex items-center px-6 gap-4">
      {/* Smart global search — leads, companies, campaigns, members & more. */}
      <GlobalSearch />

      {/* Spacer pushes the action cluster to the right. */}
      <div className="flex-1" />

      {/* Trial/upgrade pill — absolutely centered so it stays put regardless of
          the search + action-cluster widths. Hidden on narrow screens where it
          would collide (still visible in Settings → Billing). */}
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 hidden lg:block">
        <div className="pointer-events-auto">
          <TrialBanner />
        </div>
      </div>

      {/* Credit balance — click to view breakdown & top up */}
      <CreditBalancePill />

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* Phone Dialer */}
      <DialerDropdown />

      {/* Notifications */}
      <NotificationDropdown />

      {/* User Menu — custom Leadey account menu with the gradient avatar */}
      <UserMenu />
    </header>
  );
}
