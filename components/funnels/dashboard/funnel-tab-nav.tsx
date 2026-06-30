"use client";

import { cn } from "@/lib/utils";

export type FunnelTab = "leads" | "cockpit" | "analytics" | "workflows";

const tabs: { id: FunnelTab; label: string; isNew?: boolean }[] = [
  { id: "leads", label: "Leads" },
  { id: "cockpit", label: "Cockpit" },
  { id: "analytics", label: "Analytics" },
  { id: "workflows", label: "Workflows", isNew: true },
];

interface FunnelTabNavProps {
  activeTab: FunnelTab;
  onTabChange: (tab: FunnelTab) => void;
}

export function FunnelTabNav({ activeTab, onTabChange }: FunnelTabNavProps) {
  return (
    <div className="flex items-center gap-1 border-b border-border-subtle">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "px-4 py-2.5 text-[12px] font-medium transition-colors relative",
            activeTab === tab.id
              ? "text-ink"
              : "text-ink-muted hover:text-ink-secondary"
          )}
        >
          {tab.label}
          {tab.isNew && (
            <span className="ml-1.5 align-middle text-[8.5px] font-bold tracking-wide bg-signal-blue text-accent px-1.5 py-0.5 rounded-full">NEW</span>
          )}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-ink rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
