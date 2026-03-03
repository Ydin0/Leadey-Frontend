"use client";

import { useState, useMemo } from "react";
import { Search, Settings, Phone, Mail, MailOpen, Linkedin, FileText, Package } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { FunnelLeadActivity } from "@/lib/types/funnel-focus";

type TabKey = "all" | "important" | "conversations" | "notes";

const tabs: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "important", label: "Important" },
  { key: "conversations", label: "Conversations" },
  { key: "notes", label: "Notes" },
];

const activityIcon: Record<FunnelLeadActivity["type"], typeof Phone> = {
  call: Phone,
  email_sent: Mail,
  email_opened: MailOpen,
  linkedin: Linkedin,
  note: FileText,
  status_change: Settings,
  import: Package,
};

interface LeadActivityTimelineProps {
  activities: FunnelLeadActivity[];
}

export function LeadActivityTimeline({ activities }: LeadActivityTimelineProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = activities;
    if (activeTab === "important") {
      result = result.filter((a) => ["call", "email_sent", "status_change"].includes(a.type));
    } else if (activeTab === "conversations") {
      result = result.filter((a) => ["call", "email_sent", "email_opened", "linkedin"].includes(a.type));
    } else if (activeTab === "notes") {
      result = result.filter((a) => a.type === "note");
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.summary.toLowerCase().includes(q) ||
          (a.detail && a.detail.toLowerCase().includes(q))
      );
    }
    return result;
  }, [activities, activeTab, search]);

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="px-4 pt-4 pb-0 border-b border-border-subtle">
        <div className="flex items-center gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "pb-2 text-[11px] transition-colors border-b-2",
                activeTab === tab.key
                  ? "border-ink font-medium text-ink"
                  : "border-transparent text-ink-muted hover:text-ink-secondary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search size={13} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity..."
            className="w-full pl-8 pr-3 py-1.5 rounded-full bg-section border border-border-subtle text-[11px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[11px] text-ink-muted">No activity yet</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border-subtle" />

            {filtered.map((activity) => {
              const Icon = activityIcon[activity.type];
              return (
                <div key={activity.id} className="relative flex gap-3 pb-4">
                  {/* Icon */}
                  <div className="relative z-10 w-[22px] h-[22px] rounded-full bg-section flex items-center justify-center shrink-0">
                    <Icon size={12} strokeWidth={1.5} className="text-ink-muted" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] text-ink leading-snug">{activity.summary}</p>
                        {activity.detail && (
                          <p className="text-[10px] text-ink-muted mt-0.5 leading-snug">{activity.detail}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-5 h-5 rounded-full bg-section flex items-center justify-center">
                          <span className="text-[8px] font-medium text-ink-muted">{activity.userInitials}</span>
                        </div>
                        <span className="text-[10px] text-ink-faint whitespace-nowrap">
                          {formatRelativeTime(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
