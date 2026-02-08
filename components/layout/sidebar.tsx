"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/mock-data";

export function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-surface border-r border-border-subtle flex flex-col transition-all duration-200 ease-in-out",
        expanded ? "w-[180px]" : "w-[56px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 gap-3 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-ink flex items-center justify-center shrink-0">
          <span className="text-on-ink text-[11px] font-semibold">L</span>
        </div>
        <span
          className={cn(
            "text-[15px] font-semibold text-ink whitespace-nowrap transition-opacity duration-200",
            expanded ? "opacity-100" : "opacity-0"
          )}
        >
          Leadey
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-2 py-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-3 h-9 px-2 rounded-lg transition-colors relative",
                isActive
                  ? "bg-hover font-medium"
                  : "hover:bg-hover/60"
              )}
            >
              <Icon
                size={17}
                strokeWidth={1.5}
                className={cn(
                  "shrink-0",
                  isActive ? "text-ink" : "text-ink-muted"
                )}
              />
              <span
                className={cn(
                  "text-[13px] whitespace-nowrap transition-opacity duration-200",
                  expanded ? "opacity-100" : "opacity-0",
                  isActive ? "text-ink" : "text-ink-secondary"
                )}
              >
                {item.label}
              </span>
              {item.badge && expanded && (
                <span className="ml-auto text-[10px] font-medium bg-signal-red text-signal-red-text rounded-full px-1.5 py-0.5 leading-none">
                  {item.badge}
                </span>
              )}
              {item.badge && !expanded && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-signal-red-text" />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
