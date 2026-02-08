"use client";

import { useState } from "react";
import { Mail, Linkedin, ChevronDown, ChevronUp, Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { mockReplies } from "@/lib/mock-data";
import type { Reply } from "@/lib/types";

function ReplyCard({ reply, onAction }: { reply: Reply; onAction: (id: string, action: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = reply.message.length > 120;

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-section flex items-center justify-center shrink-0">
            <span className="text-[11px] font-medium text-ink-secondary">
              {reply.contact.name.split(" ").map((n) => n[0]).join("")}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-ink truncate">{reply.contact.name}</span>
              {reply.channel === "email" ? (
                <Mail size={13} strokeWidth={1.5} className="text-ink-muted shrink-0" />
              ) : (
                <Linkedin size={13} strokeWidth={1.5} className="text-linkedin shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-ink-muted truncate">
              {reply.contact.title} at {reply.company}
            </p>
          </div>
        </div>
        <span className="text-[10px] text-ink-faint whitespace-nowrap shrink-0">
          {formatRelativeTime(reply.timestamp)}
        </span>
      </div>

      {/* Message */}
      <div className="mt-3">
        <p className={cn("text-[12px] text-ink-secondary leading-relaxed", !expanded && isLong && "line-clamp-2")}>
          {reply.message}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-1 text-[11px] text-ink-muted hover:text-ink transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? "Less" : "More"}
          </button>
        )}
      </div>

      {/* Source tags */}
      {(reply.sequence || reply.funnel) && (
        <div className="flex items-center gap-2 mt-3">
          {reply.sequence && (
            <span className="text-[10px] text-ink-muted bg-section rounded-full px-2 py-0.5">{reply.sequence}</span>
          )}
          {reply.funnel && (
            <span className="text-[10px] text-signal-blue-text bg-signal-blue rounded-full px-2 py-0.5">{reply.funnel}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
        <button
          onClick={() => onAction(reply.id, "open")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
        >
          <ExternalLink size={12} strokeWidth={1.5} />
          Open Thread
        </button>
        <button
          onClick={() => onAction(reply.id, "interested")}
          className="px-3 py-1.5 rounded-[20px] bg-signal-green text-signal-green-text text-[11px] font-medium hover:bg-signal-green/80 transition-colors"
        >
          Interested
        </button>
        <button
          onClick={() => onAction(reply.id, "not_interested")}
          className="px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
        >
          Not Interested
        </button>
        <button
          onClick={() => onAction(reply.id, "snoozed")}
          className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
        >
          <Clock size={11} strokeWidth={1.5} />
          Snooze
        </button>
      </div>
    </div>
  );
}

export function RepliesSection() {
  const [replies, setReplies] = useState(mockReplies);
  const unhandled = replies.filter((r) => r.status === "unhandled");

  function handleAction(id: string, action: string) {
    setReplies((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: action as Reply["status"] } : r
      )
    );
  }

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[15px] font-semibold text-ink">Replies</h2>
        {unhandled.length > 0 && (
          <span className="text-[11px] font-medium bg-signal-red text-signal-red-text rounded-full px-2 py-0.5 leading-none">
            {unhandled.length} unhandled
          </span>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {unhandled.map((reply) => (
          <ReplyCard key={reply.id} reply={reply} onAction={handleAction} />
        ))}
        {unhandled.length === 0 && (
          <div className="bg-surface rounded-[14px] border border-border-subtle p-8 text-center">
            <p className="text-[13px] text-ink-muted">All replies handled</p>
          </div>
        )}
      </div>
    </section>
  );
}
