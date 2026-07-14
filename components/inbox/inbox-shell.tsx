"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Inbox as InboxIcon, Mail, Phone, MessageSquare, ListChecks, Bell, UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TasksInbox } from "./tabs/tasks-inbox";
import { CallsInbox } from "./tabs/calls-inbox";
import { MessagesInbox } from "./tabs/messages-inbox";
import { PrimaryFeed } from "./tabs/primary-feed";
import { EmailInbox } from "./email/email-inbox";
import { PotentialContactsInbox } from "./tabs/potential-contacts-inbox";
import { InboxLineFilter } from "./inbox-line-filter";
import { getInboxCounts, type InboxCounts } from "@/lib/api/inbox";
import { getPhoneLines } from "@/lib/api/phone-lines";
import type { PhoneLine } from "@/lib/types/calling";

const LINE_FILTER_KEY = "leadey:inbox-line-filter";

type TabKey = "primary" | "emails" | "calls" | "messages" | "tasks" | "reminders" | "potential";

// Every tab here is backed by LIVE org data (no mock/hardcoded content).
const TABS: { key: TabKey; label: string; icon: typeof Mail; count?: keyof InboxCounts }[] = [
  { key: "primary", label: "Primary", icon: InboxIcon, count: "total" },
  { key: "emails", label: "Emails", icon: Mail, count: "emails" },
  { key: "calls", label: "Missed Calls", icon: Phone, count: "calls" },
  { key: "messages", label: "Messages", icon: MessageSquare, count: "messages" },
  { key: "tasks", label: "Tasks", icon: ListChecks, count: "tasks" },
  { key: "reminders", label: "Reminders", icon: Bell, count: "reminders" },
  { key: "potential", label: "Potential Contacts", icon: UserPlus, count: "potential" },
];

const VISIBLE_TABS = TABS;
const VALID = new Set<TabKey>(TABS.map((t) => t.key));

export function InboxShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId } = useAuth();
  const requested = searchParams.get("tab") as TabKey | null;
  const [tab, setTab] = useState<TabKey>(requested && VALID.has(requested) ? requested : "primary");
  const [counts, setCounts] = useState<InboxCounts | null>(null);

  // Phone-line filter — Missed Calls & Messages default to the rep's own line(s).
  const [lines, setLines] = useState<PhoneLine[]>([]);
  const [selectedLines, setSelectedLines] = useState<string[] | null>(null); // null = not yet initialised
  const showLineFilter = tab === "calls" || tab === "messages";
  // undefined = All numbers (no scoping); otherwise the selected line ids.
  const lineFilter = selectedLines && selectedLines.length ? selectedLines : undefined;

  useEffect(() => {
    getPhoneLines().then((ls) => setLines(ls.filter((l) => l.status === "active"))).catch(() => setLines([]));
  }, []);

  // Initialise the selection once lines + auth are known: a saved choice wins,
  // else default to the rep's own assigned line(s) (empty ⇒ All).
  useEffect(() => {
    if (selectedLines !== null || lines.length === 0) return;
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(LINE_FILTER_KEY) : null;
    if (saved !== null) {
      const ids = saved ? saved.split(",").filter(Boolean).filter((id) => lines.some((l) => l.id === id)) : [];
      setSelectedLines(ids);
      return;
    }
    const mine = lines.filter((l) => l.assignedTo && l.assignedTo === userId).map((l) => l.id);
    setSelectedLines(mine);
  }, [lines, userId, selectedLines]);

  function changeLines(ids: string[]) {
    setSelectedLines(ids);
    try { window.localStorage.setItem(LINE_FILTER_KEY, ids.join(",")); } catch { /* ignore */ }
  }

  const countsKey = useMemo(() => (lineFilter ? lineFilter.join(",") : ""), [lineFilter]);
  useEffect(() => {
    getInboxCounts(lineFilter).then(setCounts).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, countsKey]); // refresh counts as the rep works through tabs / changes filter

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
        {VISIBLE_TABS.map((t) => {
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

      {/* Phone-line filter — shown on the number-scoped tabs. */}
      {showLineFilter && lines.length > 0 && (
        <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
          <span className="text-[11px] text-ink-muted">
            {lineFilter ? "Showing selected numbers" : "Showing all numbers"}
          </span>
          <InboxLineFilter lines={lines} selected={selectedLines ?? []} onChange={changeLines} currentUserId={userId ?? null} />
        </div>
      )}

      {/* Active tab */}
      {tab === "primary" ? (
        <PrimaryFeed />
      ) : tab === "emails" ? (
        <EmailInbox />
      ) : tab === "calls" ? (
        <CallsInbox lineIds={lineFilter} lines={lines} currentUserId={userId ?? null} />
      ) : tab === "messages" ? (
        <MessagesInbox lineIds={lineFilter} currentUserId={userId ?? null} />
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
