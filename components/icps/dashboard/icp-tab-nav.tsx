"use client";

import { cn } from "@/lib/utils";

export type ICPTab = "pipeline" | "companies" | "leads" | "scrapers" | "sources" | "rules";

const tabs: { id: ICPTab; label: string }[] = [
  { id: "pipeline", label: "Pipeline" },
  { id: "companies", label: "Companies" },
  { id: "leads", label: "Leads" },
  { id: "scrapers", label: "Scrapers" },
  { id: "sources", label: "Sources" },
  { id: "rules", label: "Rules" },
];

interface ICPTabNavProps {
  activeTab: ICPTab;
  onTabChange: (tab: ICPTab) => void;
}

export function ICPTabNav({ activeTab, onTabChange }: ICPTabNavProps) {
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
