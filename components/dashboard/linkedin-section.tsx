"use client";

import { useState } from "react";
import { UserPlus, MessageCircle, ExternalLink, Check, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockLinkedInQueue } from "@/lib/mock-data";
import type { LinkedInQueueItem } from "@/lib/types";

function LinkedInCard({
  item,
  onMarkSent,
  onSkip,
}: {
  item: LinkedInQueueItem;
  onMarkSent: (id: string) => void;
  onSkip: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState(item.message);

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-signal-blue flex items-center justify-center shrink-0">
            <span className="text-[11px] font-medium text-signal-blue-text">
              {item.contact.name.split(" ").map((n) => n[0]).join("")}
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-[13px] font-medium text-ink truncate block">{item.contact.name}</span>
            <p className="text-[11px] text-ink-muted truncate">
              {item.contact.title} at {item.contact.company}
            </p>
          </div>
        </div>
        <span className={cn(
          "text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0",
          item.type === "connection_request"
            ? "bg-signal-blue text-signal-blue-text"
            : "bg-signal-slate text-signal-slate-text"
        )}>
          {item.type === "connection_request" ? "Connect" : "Message"}
        </span>
      </div>

      {/* Message */}
      <div className="mt-3">
        {editing ? (
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onBlur={() => setEditing(false)}
            autoFocus
            rows={3}
            className="w-full text-[12px] text-ink-secondary leading-relaxed bg-section rounded-lg p-2 outline-none resize-none border border-border-subtle focus:border-ink-faint"
          />
        ) : (
          <p
            onClick={() => setEditing(true)}
            className="text-[12px] text-ink-secondary leading-relaxed cursor-pointer hover:bg-section/50 rounded-lg p-1 -m-1 transition-colors"
            title="Click to edit"
          >
            {message}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
        <a
          href={item.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-linkedin text-white text-[11px] font-medium hover:bg-linkedin/90 transition-colors"
        >
          <ExternalLink size={12} strokeWidth={1.5} />
          Open on LinkedIn
        </a>
        <button
          onClick={() => onMarkSent(item.id)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] bg-signal-green text-signal-green-text text-[11px] font-medium hover:bg-signal-green/80 transition-colors"
        >
          <Check size={12} strokeWidth={1.5} />
          Mark Sent
        </button>
        <button
          onClick={() => onSkip(item.id)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
        >
          <SkipForward size={12} strokeWidth={1.5} />
          Skip
        </button>
      </div>
    </div>
  );
}

export function LinkedInSection() {
  const [queue, setQueue] = useState(mockLinkedInQueue);
  const pending = queue.filter((item) => item.status === "pending");
  const connectionRequests = pending.filter((item) => item.type === "connection_request");
  const messages = pending.filter((item) => item.type === "message");

  function handleMarkSent(id: string) {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, status: "sent" as const } : item)));
  }

  function handleSkip(id: string) {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, status: "skipped" as const } : item)));
  }

  function handleMarkAllSent() {
    setQueue((prev) => prev.map((item) => (item.status === "pending" ? { ...item, status: "sent" as const } : item)));
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-semibold text-ink">LinkedIn Queue</h2>
          <span className="text-[11px] font-medium bg-signal-blue text-signal-blue-text rounded-full px-2 py-0.5 leading-none">
            {pending.length} pending
          </span>
        </div>
        {pending.length > 0 && (
          <button
            onClick={handleMarkAllSent}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
          >
            <Check size={12} strokeWidth={1.5} />
            Mark All Sent
          </button>
        )}
      </div>

      {pending.length === 0 ? (
        <div className="bg-surface rounded-[14px] border border-border-subtle p-8 text-center">
          <p className="text-[13px] text-ink-muted">All LinkedIn tasks completed</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Connection Requests */}
          {connectionRequests.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <UserPlus size={14} strokeWidth={1.5} className="text-ink-muted" />
                <h3 className="text-[12px] font-medium text-ink-secondary">
                  Connection Requests ({connectionRequests.length})
                </h3>
              </div>
              <div className="flex flex-col gap-3">
                {connectionRequests.map((item) => (
                  <LinkedInCard key={item.id} item={item} onMarkSent={handleMarkSent} onSkip={handleSkip} />
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle size={14} strokeWidth={1.5} className="text-ink-muted" />
                <h3 className="text-[12px] font-medium text-ink-secondary">
                  Messages ({messages.length})
                </h3>
              </div>
              <div className="flex flex-col gap-3">
                {messages.map((item) => (
                  <LinkedInCard key={item.id} item={item} onMarkSent={handleMarkSent} onSkip={handleSkip} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
