"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronRight, Eye, EyeOff, MoreHorizontal, Reply, ReplyAll, Forward, Mail, Paperclip,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { LeadEmailMessage } from "@/lib/api/email";
import { AttachmentChips } from "@/components/email/attachment-chips";

export type EmailReplyMode = "reply" | "reply_all" | "forward";

/** Strip Re:/Fwd: prefixes so replies group into one thread. */
export function normalizeSubject(subject: string): string {
  return (subject || "")
    .replace(/^(\s*(re|fw|fwd|aw)\s*:\s*)+/i, "")
    .trim()
    .toLowerCase() || "(no subject)";
}

/** One message within a thread: a collapsible header + the rendered email. */
function MessageRow({
  message, onReply, showSubject, defaultExpanded = false, divider = false,
}: {
  message: LeadEmailMessage;
  onReply?: (message: LeadEmailMessage, mode: EmailReplyMode) => void;
  showSubject?: boolean;
  defaultExpanded?: boolean;
  divider?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const outbound = message.direction === "outbound";
  const fromLabel = message.fromName ? `${message.fromName} <${message.fromEmail}>` : message.fromEmail;
  const opened = !!message.openedAt;

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <div className={cn(divider && "border-t border-border-subtle")}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-hover/40 transition-colors"
      >
        <ChevronRight size={14} className={cn("text-ink-muted shrink-0 transition-transform", expanded && "rotate-90")} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] uppercase tracking-wide font-semibold shrink-0 rounded-full px-1.5 py-0.5",
              outbound ? "bg-signal-blue/15 text-signal-blue-text" : "bg-signal-green/15 text-signal-green-text",
            )}>
              {outbound ? "Sent" : "Reply"}
            </span>
            {showSubject
              ? <span className="text-[12.5px] font-semibold text-ink truncate">{message.subject || "(no subject)"}</span>
              : <span className="text-[12px] text-ink-secondary truncate">{outbound ? `To ${message.toEmail}` : fromLabel}</span>}
            {message.attachments?.length > 0 && <Paperclip size={11} className="text-ink-faint shrink-0" />}
            {outbound && <ReadReceipt opened={opened} openedAt={message.openedAt} count={message.openCount} compact />}
          </span>
          {showSubject && (
            <span className="block text-[11px] text-ink-muted truncate mt-0.5">
              {outbound ? `To ${message.toEmail}` : `From ${fromLabel}`}
            </span>
          )}
        </span>
        <span className="text-[11px] text-ink-faint shrink-0 whitespace-nowrap">{formatRelativeTime(message.createdAt)}</span>
      </button>

      {expanded && (
        <div className="border-t border-border-subtle">
          <div className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0 text-[11px] space-y-0.5">
              <p className="truncate"><span className="text-ink-faint">From: </span><span className="text-ink">{fromLabel}</span></p>
              <p className="truncate"><span className="text-ink-faint">To: </span><span className="text-ink">{message.toEmail}</span></p>
              <p className="text-ink-muted">{new Date(message.createdAt).toLocaleString()}</p>
              {outbound && <ReadReceipt opened={opened} openedAt={message.openedAt} count={message.openCount} />}
            </div>
            <div ref={menuRef} className="relative shrink-0">
              <button type="button" onClick={() => setMenuOpen((v) => !v)} className="p-1.5 rounded-md text-ink-muted hover:bg-hover hover:text-ink transition-colors">
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

          <EmailBody html={message.bodyHtml || message.bodyText} />

          {message.attachments?.length > 0 && (
            <div className="px-4 pt-1 pb-3"><AttachmentChips attachments={message.attachments} /></div>
          )}

          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border-subtle">
            <button type="button" onClick={() => onReply?.(message, "reply")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle">
              <Reply size={12} /> Reply
            </button>
            <button type="button" onClick={() => onReply?.(message, "forward")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle">
              <Forward size={12} /> Forward
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** A single email (standalone) rendered as a Close-style card. */
export function EmailActivityCard({
  message, onReply,
}: {
  message: LeadEmailMessage;
  onReply?: (message: LeadEmailMessage, mode: EmailReplyMode) => void;
}) {
  return (
    <div className="rounded-[14px] border border-border-subtle bg-surface overflow-hidden">
      <MessageRow message={message} onReply={onReply} showSubject />
    </div>
  );
}

/** A full email chain: subject once at the top, then each message as a
 *  collapsible row (latest expanded) — like Close's threaded email view. */
export function EmailThreadCard({
  messages, onReply,
}: {
  messages: LeadEmailMessage[];
  onReply?: (message: LeadEmailMessage, mode: EmailReplyMode) => void;
}) {
  // Oldest → newest so the chain reads top-to-bottom; latest expanded.
  const ordered = [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const subject = ordered.find((m) => m.subject)?.subject || "(no subject)";
  const latestId = ordered[ordered.length - 1]?.id;

  return (
    <div className="rounded-[14px] border border-border-subtle bg-surface overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-section/40 border-b border-border-subtle">
        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-signal-blue/15 text-signal-blue-text shrink-0"><Mail size={13} /></span>
        <span className="text-[12.5px] font-semibold text-ink truncate flex-1">{subject}</span>
        <span className="text-[10.5px] font-medium text-ink-muted bg-surface border border-border-subtle rounded-full px-2 py-0.5 shrink-0">
          {ordered.length} messages
        </span>
      </div>
      {ordered.map((m, i) => (
        <MessageRow key={m.id} message={m} onReply={onReply} defaultExpanded={m.id === latestId} divider={i > 0} />
      ))}
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
