"use client";

import { cn } from "@/lib/utils";

export type FunnelTab = "leads" | "cockpit" | "analytics";

const tabs: { id: FunnelTab; label: string }[] = [
  { id: "leads", label: "Leads" },
  { id: "cockpit", label: "Cockpit" },
  { id: "analytics", label: "Analytics" },
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
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-ink rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
