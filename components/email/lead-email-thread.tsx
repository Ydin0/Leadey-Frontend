"use client";

import { useEffect, useState } from "react";
import { Mail, MailOpen, CornerUpLeft, Loader2, Send, ThumbsUp, ThumbsDown, MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichEmailEditor } from "./rich-email-editor";
import { getThreadByLead, replyToThread, setThreadSentiment, listSendingAccounts } from "@/lib/api/email";
import { renderPersonalized, type PersonalizationLead } from "@/lib/utils/personalize";
import { formatRelativeTime } from "@/lib/utils";
import type { EmailThread, EmailMessage, ReplySentiment } from "@/lib/types/email";

interface LeadEmailThreadProps {
  lead: PersonalizationLead & { id: string; email?: string | null };
  onCompose?: () => void;
}

export function LeadEmailThread({ lead, onCompose }: LeadEmailThreadProps) {
  const [thread, setThread] = useState<EmailThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [fromId, setFromId] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getThreadByLead(lead.id)
      .then((t) => !cancelled && setThread(t))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    listSendingAccounts().then((a) => {
      const active = a.filter((x) => x.isActive);
      setFromId((prev) => prev || active[0]?.id || "");
    });
    return () => { cancelled = true; };
  }, [lead.id]);

  async function handleReply() {
    if (!thread || !reply.trim()) return;
    setSending(true);
    try {
      const msg = await replyToThread(thread.id, {
        fromAccountId: fromId,
        bodyHtml: renderPersonalized(reply, lead),
      });
      setThread((t) => (t ? { ...t, messages: [...(t.messages || []), msg] } : t));
      setReply("");
      setReplying(false);
    } finally {
      setSending(false);
    }
  }

  async function handleSentiment(s: ReplySentiment) {
    if (!thread) return;
    setThread({ ...thread, sentiment: s });
    await setThreadSentiment(thread.id, s).catch(() => {});
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={18} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3">
        <div className="w-11 h-11 rounded-full bg-section flex items-center justify-center">
          <Mail size={18} className="text-ink-faint" />
        </div>
        <p className="text-[12px] text-ink-muted">No emails with this lead yet.</p>
        {onCompose && (
          <button
            onClick={onCompose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
          >
            <MessageSquarePlus size={13} /> Compose email
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sentiment bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle">
        <span className="text-[11px] text-ink-muted truncate">{thread.subject}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => handleSentiment("interested")}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              thread.sentiment === "interested"
                ? "bg-signal-green/15 text-signal-green-text"
                : "text-ink-faint hover:bg-hover",
            )}
            title="Interested"
          >
            <ThumbsUp size={12} />
          </button>
          <button
            onClick={() => handleSentiment("not_interested")}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              thread.sentiment === "not_interested"
                ? "bg-signal-red/15 text-signal-red-text"
                : "text-ink-faint hover:bg-hover",
            )}
            title="Not interested"
          >
            <ThumbsDown size={12} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {(thread.messages || []).map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>

      {/* Reply */}
      <div className="border-t border-border-subtle p-3">
        {replying ? (
          <div className="space-y-2">
            <RichEmailEditor value={reply} onChange={setReply} previewLead={lead} minHeight={120} placeholder="Write a reply…" />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setReplying(false); setReply(""); }}
                className="px-3 py-1.5 rounded-[20px] text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors"
              >
                Cancel
              </button>
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
        ) : (
          <button
            onClick={() => setReplying(true)}
            className="w-full flex items-center gap-1.5 justify-center px-3 py-2 rounded-[10px] border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors"
          >
            <CornerUpLeft size={13} /> Reply
          </button>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message: m }: { message: EmailMessage }) {
  const outbound = m.direction === "outbound";
  return (
    <div className={cn("flex flex-col", outbound ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-[12px] px-3 py-2 border",
          outbound
            ? "bg-signal-blue/10 border-signal-blue-text/20"
            : "bg-section border-border-subtle",
        )}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[11px] font-medium text-ink">{m.fromName}</span>
          <span className="text-[10px] text-ink-faint">{formatRelativeTime(new Date(m.sentAt))}</span>
        </div>
        <div
          className="prose-email text-[12px] text-ink-secondary"
          dangerouslySetInnerHTML={{ __html: m.bodyHtml }}
        />
      </div>
      {outbound && (
        <span className="flex items-center gap-1 text-[9px] text-ink-faint mt-0.5 mr-1">
          {m.bounced ? (
            <span className="text-signal-red-text">Bounced</span>
          ) : m.repliedAt ? (
            <>Replied</>
          ) : m.openedAt ? (
            <><MailOpen size={9} /> Opened</>
          ) : (
            <><Mail size={9} /> Sent</>
          )}
        </span>
      )}
    </div>
  );
}
