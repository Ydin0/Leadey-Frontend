"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { navGroups } from "@/lib/mock-data";
import { useSidebarFunnels } from "@/hooks/use-sidebar-funnels";
import { usePrefetchFunnel } from "@/lib/queries/use-prefetch";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getInboxCounts } from "@/lib/api/inbox";
import { LeadeyMark, LeadeyWordmark } from "@/components/brand/leadey-mark";
import type { NavItem } from "@/lib/types";

export function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  const { items: funnelItems } = useSidebarFunnels();
  const prefetchFunnel = usePrefetchFunnel();
  const isAuthReady = useAuthReady();
  const [inboxCount, setInboxCount] = useState(0);

  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    const tick = () => getInboxCounts().then((c) => { if (!cancelled) setInboxCount(c.total); }).catch(() => {});
    tick();
    const t = setInterval(tick, 60_000); // keep the badge fresh
    return () => { cancelled = true; clearInterval(t); };
  }, [isAuthReady]);

  const toggleGroup = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const statusDotColor = (status?: string) => {
    if (status === "active") return "bg-signal-green-text";
    if (status === "paused") return "bg-ink-muted";
    return "bg-ink-faint";
  };

  // Cockpit matches exactly; everything else also matches its sub-routes so a
  // parent (e.g. Cold Email) stays highlighted while you're inside it.
  const isItemActive = (item: NavItem) =>
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === item.href || pathname.startsWith(item.href + "/");

  const isSubActive = (href: string) =>
    pathname === href ||
    (href !== "/dashboard/email" && pathname.startsWith(href + "/"));

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={cn(
        "brand-chrome fixed left-0 top-0 z-40 h-screen border-r flex flex-col transition-all duration-200 ease-in-out",
        expanded ? "w-[200px]" : "w-[56px]",
      )}
    >
      {/* Brand mark */}
      <div className="relative flex items-center h-14 pl-[18px] gap-[7px] shrink-0 overflow-hidden">
        <LeadeyMark size={20} className="text-ink shrink-0" />
        <LeadeyWordmark
          height={18}
          className={cn(
            "text-ink shrink-0 transition-all duration-200 ease-out",
            expanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1 pointer-events-none",
          )}
        />
      </div>

      {/* Navigation — labeled sections */}
      <nav className="flex-1 flex flex-col gap-3 px-2 py-2 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            {/* Section label — only shown when expanded */}
            <div
              className={cn(
                "px-2 h-5 flex items-center transition-opacity duration-200",
                expanded ? "opacity-100" : "opacity-0",
              )}
            >
              <span className="text-[10px] uppercase tracking-[0.12em] text-ink-faint font-medium whitespace-nowrap truncate">
                {group.label}
              </span>
            </div>

            {group.items.map((item) => {
              const isActive = isItemActive(item);
              const Icon = item.icon;
              const badge = item.id === "inbox" ? (inboxCount || undefined) : item.badge;
              const children = item.dynamicChildren ? funnelItems : item.children ?? [];
              const hasChildren = children.length > 0;
              // Auto-open when inside the section; otherwise honor manual toggle.
              const isGroupOpen = hasChildren && (isActive ? !collapsedGroups.has(item.id) : collapsedGroups.has(item.id));

              return (
                <div key={item.id}>
                  <div className="flex items-center">
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 h-9 px-2 rounded-lg transition-colors relative flex-1 min-w-0",
                        isActive ? "bg-hover font-medium" : "hover:bg-hover/60",
                      )}
                    >
                      <Icon
                        size={17}
                        strokeWidth={1.5}
                        className={cn("shrink-0", isActive ? "text-ink" : "text-ink-muted")}
                      />
                      <span
                        className={cn(
                          "text-[13px] whitespace-nowrap transition-opacity duration-200 truncate",
                          expanded ? "opacity-100" : "opacity-0",
                          isActive ? "text-ink" : "text-ink-secondary",
                        )}
                      >
                        {item.label}
                      </span>
                      {badge && expanded && (
                        <span className="ml-auto text-[10px] font-medium bg-signal-red text-signal-red-text rounded-full px-1.5 py-0.5 leading-none shrink-0">
                          {badge}
                        </span>
                      )}
                      {badge && !expanded && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-signal-red-text" />
                      )}
                      {item.comingSoon && expanded && (
                        <span className="ml-auto text-[9px] text-ink-faint shrink-0">Soon</span>
                      )}
                    </Link>

                    {/* Chevron toggle for items with children */}
                    {hasChildren && expanded && (
                      <button
                        onClick={(e) => toggleGroup(item.id, e)}
                        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md hover:bg-hover/60 transition-colors"
                      >
                        <ChevronRight
                          size={13}
                          strokeWidth={1.5}
                          className={cn(
                            "text-ink-muted transition-transform duration-200",
                            isGroupOpen && "rotate-90",
                          )}
                        />
                      </button>
                    )}
                  </div>

                  {/* Sub-items */}
                  {hasChildren && (
                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-200 ease-in-out",
                        expanded && isGroupOpen ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0",
                      )}
                    >
                      <div className="flex flex-col gap-0.5 py-0.5">
                        {children.map((sub) => {
                          const subActive = isSubActive(sub.href);
                          const SubIcon = sub.icon;
                          return (
                            <Link
                              key={sub.id}
                              href={sub.href}
                              // Warm the campaign's data cache on hover so the
                              // click paints instantly (campaign sub-items only).
                              onMouseEnter={item.dynamicChildren ? () => prefetchFunnel(sub.id) : undefined}
                              onFocus={item.dynamicChildren ? () => prefetchFunnel(sub.id) : undefined}
                              className={cn(
                                "flex items-center gap-2 h-7 pl-9 pr-2 rounded-lg transition-colors text-[12px] truncate",
                                subActive
                                  ? "bg-hover/80 text-ink font-medium"
                                  : "text-ink-secondary hover:bg-hover/40",
                              )}
                            >
                              {SubIcon ? (
                                <SubIcon
                                  size={13}
                                  strokeWidth={1.5}
                                  className={cn("shrink-0", subActive ? "text-ink" : "text-ink-muted")}
                                />
                              ) : (
                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDotColor(sub.status))} />
                              )}
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
          </div>
        ))}
      </nav>
    </aside>
  );
}
