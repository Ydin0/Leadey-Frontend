"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, Mail, MailOpen, Loader2, Send, ThumbsUp, ThumbsDown, Clock,
  Inbox as InboxIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { RichEmailEditor } from "@/components/email/rich-email-editor";
import {
  listInboxThreads, getThread, replyToThread, setThreadSentiment, listSendingAccounts,
} from "@/lib/api/email";
import { renderPersonalized, type PersonalizationLead } from "@/lib/utils/personalize";
import type { EmailThread, ReplySentiment, InboxFilters } from "@/lib/types/email";

const VIEWS: { key: NonNullable<InboxFilters["view"]>; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "needs_reply", label: "Needs reply" },
  { key: "interested", label: "Interested" },
];

export function InboxShell() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<NonNullable<InboxFilters["view"]>>("all");
  const [search, setSearch] = useState("");
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("thread"));
  const [active, setActive] = useState<EmailThread | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [fromId, setFromId] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    listSendingAccounts().then((a) => {
      const act = a.filter((x) => x.isActive);
      setFromId((p) => p || act[0]?.id || "");
    });
  }, []);

  // Load list on view/search change.
  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    listInboxThreads({ view, search: search || undefined })
      .then((rows) => {
        if (cancelled) return;
        setThreads(rows);
        setSelectedId((prev) => prev ?? rows[0]?.id ?? null);
      })
      .finally(() => !cancelled && setLoadingList(false));
    return () => { cancelled = true; };
  }, [view, search]);

  // Load active conversation.
  useEffect(() => {
    if (!selectedId) { setActive(null); return; }
    let cancelled = false;
    setLoadingThread(true);
    getThread(selectedId)
      .then((t) => {
        if (cancelled) return;
        setActive(t);
        // Mark read in the list.
        setThreads((rows) => rows.map((r) => (r.id === selectedId ? { ...r, unread: false } : r)));
      })
      .finally(() => !cancelled && setLoadingThread(false));
    return () => { cancelled = true; };
  }, [selectedId]);

  const activeLead: PersonalizationLead = useMemo(
    () => ({
      name: active?.leadName,
      company: active?.company,
      title: active?.leadTitle,
      email: active?.contactEmail,
    }),
    [active],
  );

  async function handleReply() {
    if (!active || !reply.trim()) return;
    setSending(true);
    try {
      const msg = await replyToThread(active.id, {
        fromAccountId: fromId,
        bodyHtml: renderPersonalized(reply, activeLead),
      });
      setActive((t) => (t ? { ...t, messages: [...(t.messages || []), msg] } : t));
      setReply("");
    } finally {
      setSending(false);
    }
  }

  async function handleSentiment(s: ReplySentiment) {
    if (!active) return;
    setActive({ ...active, sentiment: s });
    setThreads((rows) => rows.map((r) => (r.id === active.id ? { ...r, sentiment: s } : r)));
    await setThreadSentiment(active.id, s).catch(() => {});
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)]">
      <div className="mb-3">
        <h1 className="text-[18px] font-semibold text-ink">Inbox</h1>
        <p className="text-[12px] text-ink-muted">All email conversations across your campaigns.</p>
      </div>

      <div className="flex-1 flex rounded-[14px] border border-border-subtle overflow-hidden bg-surface">
        {/* Thread list */}
        <div className="w-[340px] border-r border-border-subtle flex flex-col shrink-0">
          {/* Search */}
          <div className="p-2.5 border-b border-border-subtle">
            <div className="flex items-center gap-2 bg-section border border-border-subtle rounded-full px-3 py-1.5">
              <Search size={13} className="text-ink-muted shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="bg-transparent text-[12px] text-ink outline-none w-full placeholder:text-ink-faint"
              />
            </div>
          </div>
          {/* View tabs */}
          <div className="flex items-center gap-1 px-2.5 py-2 border-b border-border-subtle">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={cn(
                  "px-2 py-1 rounded-full text-[10px] font-medium transition-colors",
                  view === v.key ? "bg-ink text-on-ink" : "text-ink-secondary hover:bg-hover",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={16} className="animate-spin text-ink-muted" />
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-6">
                <InboxIcon size={20} className="text-ink-faint" />
                <p className="text-[12px] text-ink-muted">No conversations here.</p>
              </div>
            ) : (
              threads.map((t) => (
                <ThreadRow
                  key={t.id}
                  thread={t}
                  active={t.id === selectedId}
                  onClick={() => setSelectedId(t.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Conversation */}
        <div className="flex-1 flex flex-col min-w-0">
          {loadingThread ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={18} className="animate-spin text-ink-muted" />
            </div>
          ) : !active ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
              <Mail size={22} className="text-ink-faint" />
              <p className="text-[12px] text-ink-muted">Select a conversation to read and reply.</p>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div className="flex items-center justify-between px-4 h-14 border-b border-border-subtle shrink-0">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink truncate">
                    {active.leadName} <span className="text-ink-muted font-normal">· {active.company}</span>
                  </p>
                  <p className="text-[11px] text-ink-muted truncate">{active.subject}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <SentimentButton active={active.sentiment === "interested"} onClick={() => handleSentiment("interested")} tone="green" title="Interested"><ThumbsUp size={13} /></SentimentButton>
                  <SentimentButton active={active.sentiment === "not_interested"} onClick={() => handleSentiment("not_interested")} tone="red" title="Not interested"><ThumbsDown size={13} /></SentimentButton>
                  <button title="Snooze (hooks up later)" disabled className="p-1.5 rounded-md text-ink-faint cursor-not-allowed"><Clock size={13} /></button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {(active.messages || []).map((m) => {
                  const outbound = m.direction === "outbound";
                  return (
                    <div key={m.id} className={cn("flex flex-col", outbound ? "items-end" : "items-start")}>
                      <div className={cn(
                        "max-w-[78%] rounded-[12px] px-3.5 py-2.5 border",
                        outbound ? "bg-signal-blue/10 border-signal-blue-text/20" : "bg-section border-border-subtle",
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-medium text-ink">{m.fromName}</span>
                          <span className="text-[10px] text-ink-faint">{formatRelativeTime(new Date(m.sentAt))}</span>
                        </div>
                        <div className="prose-email text-[12px] text-ink-secondary" dangerouslySetInnerHTML={{ __html: m.bodyHtml }} />
                      </div>
                      {outbound && (
                        <span className="flex items-center gap-1 text-[9px] text-ink-faint mt-0.5 mr-1">
                          {m.openedAt ? <><MailOpen size={9} /> Opened</> : <><Mail size={9} /> Sent</>}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Reply composer */}
              <div className="border-t border-border-subtle p-3 shrink-0">
                <RichEmailEditor value={reply} onChange={setReply} previewLead={activeLead} minHeight={110} placeholder="Write a reply…" />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleReply}
                    disabled={sending || !reply.trim()}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
                  >
                    {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    Send reply
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ThreadRow({ thread: t, active, onClick }: { thread: EmailThread; active: boolean; onClick: () => void }) {
  const initials = t.leadName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 border-b border-border-subtle transition-colors flex gap-2.5",
        active ? "bg-hover" : "hover:bg-hover/50",
      )}
    >
      <div className="relative shrink-0">
        <div className="w-8 h-8 rounded-full bg-signal-blue/10 flex items-center justify-center text-[11px] font-semibold text-signal-blue-text">
          {initials}
        </div>
        {t.unread && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-signal-blue-text border-2 border-surface" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-[12px] truncate", t.unread ? "font-semibold text-ink" : "font-medium text-ink-secondary")}>{t.leadName}</span>
          <span className="text-[10px] text-ink-faint shrink-0">{formatRelativeTime(new Date(t.lastMessageAt))}</span>
        </div>
        <p className="text-[11px] text-ink-muted truncate">{t.company}</p>
        <p className="text-[11px] text-ink-faint truncate">{t.lastMessagePreview}</p>
        {t.sentiment && (
          <span className={cn(
            "inline-block mt-1 text-[9px] font-medium rounded-full px-1.5 py-0.5",
            t.sentiment === "interested" ? "bg-signal-green/15 text-signal-green-text" :
            t.sentiment === "not_interested" ? "bg-signal-red/15 text-signal-red-text" :
            "bg-section text-ink-muted",
          )}>
            {t.sentiment === "interested" ? "Interested" : t.sentiment === "not_interested" ? "Not interested" : "Neutral"}
          </span>
        )}
      </div>
    </button>
  );
}

function SentimentButton({ active, onClick, tone, title, children }: { active: boolean; onClick: () => void; tone: "green" | "red"; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "p-1.5 rounded-md transition-colors",
        active
          ? tone === "green" ? "bg-signal-green/15 text-signal-green-text" : "bg-signal-red/15 text-signal-red-text"
          : "text-ink-faint hover:bg-hover",
      )}
    >
      {children}
    </button>
  );
}
