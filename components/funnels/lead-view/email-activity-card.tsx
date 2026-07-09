"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronRight, Eye, EyeOff, MoreHorizontal, Reply, ReplyAll, Forward,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { LeadEmailMessage } from "@/lib/api/email";
import { AttachmentChips } from "@/components/email/attachment-chips";

export type EmailReplyMode = "reply" | "reply_all" | "forward";

/** Close-style email card: collapsed shows subject + who + when (+ a read
 *  receipt for sent mail); expanding renders the real email (From/To/date,
 *  the HTML body in a sandboxed frame) with Reply / Reply all / Forward. */
export function EmailActivityCard({
  message,
  onReply,
}: {
  message: LeadEmailMessage;
  onReply?: (message: LeadEmailMessage, mode: EmailReplyMode) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const outbound = message.direction === "outbound";
  const fromLabel = message.fromName ? `${message.fromName} <${message.fromEmail}>` : message.fromEmail;
  const opened = !!message.openedAt;

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <div className="rounded-[14px] border border-border-subtle bg-surface overflow-hidden">
      {/* Collapsed header — click to expand */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-hover/40 transition-colors"
      >
        <ChevronRight size={14} className={cn("text-ink-muted shrink-0 transition-transform", expanded && "rotate-90")} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide font-semibold text-ink-faint shrink-0">
              {outbound ? "Sent" : "Reply"}
            </span>
            <span className="text-[12.5px] font-semibold text-ink truncate">
              {message.subject || "(no subject)"}
            </span>
            {outbound && <ReadReceipt opened={opened} openedAt={message.openedAt} count={message.openCount} compact />}
          </span>
          <span className="block text-[11px] text-ink-muted truncate mt-0.5">
            {outbound ? `To ${message.toEmail}` : `From ${fromLabel}`}
          </span>
        </span>
        <span className="text-[11px] text-ink-faint shrink-0 whitespace-nowrap">
          {formatRelativeTime(message.createdAt)}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border-subtle">
          {/* Full headers + actions */}
          <div className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0 text-[11px] space-y-0.5">
              <p className="truncate"><span className="text-ink-faint">From: </span><span className="text-ink">{fromLabel}</span></p>
              <p className="truncate"><span className="text-ink-faint">To: </span><span className="text-ink">{message.toEmail}</span></p>
              <p className="text-ink-muted">{new Date(message.createdAt).toLocaleString()}</p>
              {outbound && (
                <ReadReceipt opened={opened} openedAt={message.openedAt} count={message.openCount} />
              )}
            </div>
            <div ref={menuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="p-1.5 rounded-md text-ink-muted hover:bg-hover hover:text-ink transition-colors"
              >
                <MoreHorizontal size={16} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 z-20 w-40 bg-surface border border-border-subtle rounded-[10px] shadow-lg py-1">
                  <MenuItem icon={Reply} label="Reply" onClick={() => { setMenuOpen(false); onReply?.(message, "reply"); }} />
                  <MenuItem icon={ReplyAll} label="Reply all" onClick={() => { setMenuOpen(false); onReply?.(message, "reply_all"); }} />
                  <MenuItem icon={Forward} label="Forward" onClick={() => { setMenuOpen(false); onReply?.(message, "forward"); }} />
                </div>
              )}
            </div>
          </div>

          {/* Rendered email body (sandboxed — no scripts run) */}
          <EmailBody html={message.bodyHtml || message.bodyText} />

          {message.attachments?.length > 0 && (
            <div className="px-4 pt-1 pb-3">
              <AttachmentChips attachments={message.attachments} />
            </div>
          )}

          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => onReply?.(message, "reply")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle"
            >
              <Reply size={12} /> Reply
            </button>
            <button
              type="button"
              onClick={() => onReply?.(message, "forward")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle"
            >
              <Forward size={12} /> Forward
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReadReceipt({
  opened, openedAt, count, compact,
}: {
  opened: boolean;
  openedAt: string | null;
  count: number;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span
        title={opened ? `Opened ${formatRelativeTime(openedAt!)}${count > 1 ? ` · ${count} times` : ""}` : "Not opened yet"}
        className={cn("flex items-center gap-0.5 text-[10px] shrink-0", opened ? "text-signal-green-text" : "text-ink-faint")}
      >
        {opened ? <Eye size={12} /> : <EyeOff size={12} />}
        {opened && count > 1 ? count : null}
      </span>
    );
  }
  return (
    <p className={cn("flex items-center gap-1", opened ? "text-signal-green-text" : "text-ink-faint")}>
      {opened ? <Eye size={11} /> : <EyeOff size={11} />}
      {opened
        ? `Opened ${formatRelativeTime(openedAt!)}${count > 1 ? ` · ${count} times` : ""}`
        : "Not opened yet"}
    </p>
  );
}

function MenuItem({ icon: Icon, label, onClick }: { icon: typeof Reply; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-ink-secondary hover:bg-hover transition-colors"
    >
      <Icon size={12} /> {label}
    </button>
  );
}

/** Render email HTML in a sandboxed iframe (scripts disabled) and auto-size it. */
function EmailBody({ html }: { html: string }) {
  const doc = `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>
    body{font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;font-size:13px;color:#1a1a2e;margin:14px;line-height:1.55;word-break:break-word;}
    img{max-width:100%;height:auto;} a{color:#2563eb;} blockquote{border-left:3px solid #ddd;margin:8px 0;padding-left:12px;color:#555;}
  </style></head><body>${html || "<p style='color:#888'>(empty message)</p>"}</body></html>`;
  return (
    <iframe
      title="Email body"
      sandbox="allow-same-origin allow-popups"
      srcDoc={doc}
      onLoad={(e) => {
        const f = e.currentTarget;
        try {
          const h = f.contentDocument?.body?.scrollHeight || 240;
          f.style.height = `${Math.min(h + 28, 1400)}px`;
        } catch {
          f.style.height = "320px";
        }
      }}
      className="w-full bg-white border-0 block"
      style={{ height: 240 }}
    />
  );
}
