"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Inbox as InboxIcon, Mail, Phone, MessageSquare, ListChecks, Bell, UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmailInbox } from "./tabs/email-inbox";
import { TasksInbox } from "./tabs/tasks-inbox";

type TabKey = "primary" | "emails" | "calls" | "messages" | "tasks" | "reminders" | "potential";

const TABS: { key: TabKey; label: string; icon: typeof Mail }[] = [
  { key: "primary", label: "Primary", icon: InboxIcon },
  { key: "emails", label: "Emails", icon: Mail },
  { key: "calls", label: "Calls", icon: Phone },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "tasks", label: "Tasks", icon: ListChecks },
  { key: "reminders", label: "Reminders", icon: Bell },
  { key: "potential", label: "Potential Contacts", icon: UserPlus },
];

const VALID = new Set<TabKey>(TABS.map((t) => t.key));

export function InboxShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab") as TabKey | null;
  // Land on Tasks for now — the channel tabs (Primary/Calls/Messages/Potential)
  // arrive in later phases.
  const [tab, setTab] = useState<TabKey>(requested && VALID.has(requested) ? requested : "tasks");

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
          return (
            <button
              key={t.key}
              onClick={() => selectTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
                on
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-muted hover:text-ink-secondary",
              )}
            >
              <Icon size={13} className={on ? "text-ink" : "text-ink-muted"} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Active tab */}
      {tab === "emails" ? (
        <EmailInbox />
      ) : tab === "tasks" ? (
        <TasksInbox />
      ) : tab === "reminders" ? (
        <TasksInbox categoryFilter="reminder" />
      ) : (
        <ComingSoon label={TABS.find((t) => t.key === tab)?.label || ""} />
      )}
    </div>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 rounded-[14px] border border-border-subtle bg-surface text-center">
      <span className="flex items-center justify-center w-12 h-12 rounded-full bg-section">
        <InboxIcon size={22} className="text-ink-muted" />
      </span>
      <p className="text-[13px] font-semibold text-ink">{label} coming soon</p>
      <p className="text-[12px] text-ink-muted max-w-[340px]">
        This channel is being wired into the unified inbox. Tasks &amp; Reminders are live now.
      </p>
    </div>
  );
}
