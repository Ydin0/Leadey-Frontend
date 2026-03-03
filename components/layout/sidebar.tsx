"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/mock-data";
import { useSidebarFunnels } from "@/hooks/use-sidebar-funnels";

export function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  const { items: funnelItems } = useSidebarFunnels();

  const toggleGroup = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const statusDotColor = (status?: string) => {
    if (status === "active") return "bg-signal-green-text";
    if (status === "paused") return "bg-ink-muted";
    return "bg-ink-faint";
  };

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-surface border-r border-border-subtle flex flex-col transition-all duration-200 ease-in-out",
        expanded ? "w-[200px]" : "w-[56px]"
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
      <nav className="flex-1 flex flex-col gap-0.5 px-2 py-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          const hasDynamicChildren = item.dynamicChildren && funnelItems.length > 0;
          const isGroupOpen = expandedGroups.has(item.id);

          return (
            <div key={item.id}>
              <div className="flex items-center">
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 h-9 px-2 rounded-lg transition-colors relative flex-1 min-w-0",
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
                      "text-[13px] whitespace-nowrap transition-opacity duration-200 truncate",
                      expanded ? "opacity-100" : "opacity-0",
                      isActive ? "text-ink" : "text-ink-secondary"
                    )}
                  >
                    {item.label}
                  </span>
                  {item.badge && expanded && (
                    <span className="ml-auto text-[10px] font-medium bg-signal-red text-signal-red-text rounded-full px-1.5 py-0.5 leading-none shrink-0">
                      {item.badge}
                    </span>
                  )}
                  {item.badge && !expanded && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-signal-red-text" />
                  )}
                </Link>

                {/* Chevron toggle for groups with children */}
                {hasDynamicChildren && expanded && (
                  <button
                    onClick={(e) => toggleGroup(item.id, e)}
                    className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md hover:bg-hover/60 transition-colors"
                  >
                    <ChevronRight
                      size={13}
                      strokeWidth={1.5}
                      className={cn(
                        "text-ink-muted transition-transform duration-200",
                        isGroupOpen && "rotate-90"
                      )}
                    />
                  </button>
                )}
              </div>

              {/* Sub-items */}
              {hasDynamicChildren && (
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200 ease-in-out",
                    expanded && isGroupOpen
                      ? "max-h-[300px] opacity-100"
                      : "max-h-0 opacity-0"
                  )}
                >
                  <div className="flex flex-col gap-0.5 py-0.5">
                    {funnelItems.map((sub) => {
                      const isSubActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.id}
                          href={sub.href}
                          className={cn(
                            "flex items-center gap-2 h-7 pl-9 pr-2 rounded-lg transition-colors text-[12px] truncate",
                            isSubActive
                              ? "bg-hover/80 text-ink font-medium"
                              : "text-ink-secondary hover:bg-hover/40"
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDotColor(sub.status))} />
                          <span className="truncate">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
