"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Inbox as InboxIcon, Mail, Phone, MessageSquare, ListChecks, Bell, UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmailInbox } from "./tabs/email-inbox";
import { TasksInbox } from "./tabs/tasks-inbox";
import { CallsInbox } from "./tabs/calls-inbox";
import { MessagesInbox } from "./tabs/messages-inbox";
import { PrimaryFeed } from "./tabs/primary-feed";
import { PotentialContactsInbox } from "./tabs/potential-contacts-inbox";
import { getInboxCounts, type InboxCounts } from "@/lib/api/inbox";

type TabKey = "primary" | "emails" | "calls" | "messages" | "tasks" | "reminders" | "potential";

const TABS: { key: TabKey; label: string; icon: typeof Mail; count?: keyof InboxCounts }[] = [
  { key: "primary", label: "Primary", icon: InboxIcon, count: "total" },
  { key: "emails", label: "Emails", icon: Mail },
  { key: "calls", label: "Calls", icon: Phone, count: "calls" },
  { key: "messages", label: "Messages", icon: MessageSquare, count: "messages" },
  { key: "tasks", label: "Tasks", icon: ListChecks, count: "tasks" },
  { key: "reminders", label: "Reminders", icon: Bell, count: "reminders" },
  { key: "potential", label: "Potential Contacts", icon: UserPlus, count: "potential" },
];

const VALID = new Set<TabKey>(TABS.map((t) => t.key));

export function InboxShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab") as TabKey | null;
  const [tab, setTab] = useState<TabKey>(requested && VALID.has(requested) ? requested : "primary");
  const [counts, setCounts] = useState<InboxCounts | null>(null);

  useEffect(() => {
    getInboxCounts().then(setCounts).catch(() => {});
  }, [tab]); // refresh counts as the rep works through tabs

  function selectTab(key: TabKey) {
    setTab(key);
    router.replace(`/dashboard/inbox?tab=${key}`, { scroll: false });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)]">
      <div className="mb-3">
        <h1 className="text-[18px] font-semibold text-ink">Inbox</h1>
        <p className="text-[12px] text-ink-muted">Tasks, reminders and conversations across every channel.</p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-3 border-b border-border-subtle overflow-x-auto shrink-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = tab === t.key;
          const n = t.count && counts ? counts[t.count] : 0;
          return (
            <button
              key={t.key}
              onClick={() => selectTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
                on ? "border-ink text-ink" : "border-transparent text-ink-muted hover:text-ink-secondary",
              )}
            >
              <Icon size={13} className={on ? "text-ink" : "text-ink-muted"} />
              {t.label}
              {n > 0 && (
                <span className={cn(
                  "text-[9px] font-semibold rounded-full px-1.5 py-0.5 min-w-[16px] text-center",
                  on ? "bg-ink text-on-ink" : "bg-section text-ink-muted",
                )}>
                  {n > 99 ? "99+" : n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active tab */}
      {tab === "primary" ? (
        <PrimaryFeed />
      ) : tab === "emails" ? (
        <EmailInbox />
      ) : tab === "calls" ? (
        <CallsInbox />
      ) : tab === "messages" ? (
        <MessagesInbox />
      ) : tab === "tasks" ? (
        <TasksInbox />
      ) : tab === "reminders" ? (
        <TasksInbox categoryFilter="reminder" />
      ) : (
        <PotentialContactsInbox />
      )}
    </div>
  );
}
