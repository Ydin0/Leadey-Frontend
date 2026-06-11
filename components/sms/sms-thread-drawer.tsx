"use client";

import { useEffect, useRef, useState } from "react";
import { X, MessageSquare, Loader2, Send } from "lucide-react";
import { cn, formatRelativeTime, formatPhoneIntl } from "@/lib/utils";
import { useTeamMembers } from "@/hooks/use-team-members";
import { getSmsThread, sendSms, type SmsMessage } from "@/lib/api/sms";

interface SmsThreadDrawerProps {
  open: boolean;
  onClose: () => void;
  funnelId: string;
  leadId: string;
  leadName: string;
  leadPhone: string | null;
  /** Called after a message is sent so the parent can refresh the timeline. */
  onSent?: () => void;
}

export function SmsThreadDrawer({
  open,
  onClose,
  funnelId,
  leadId,
  leadName,
  leadPhone,
  onSent,
}: SmsThreadDrawerProps) {
  const { resolveMember } = useTeamMembers();
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSmsThread(funnelId, leadId)
      .then((m) => !cancelled && setMessages(m))
      .catch(() => !cancelled && setError("Couldn't load the conversation."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [open, funnelId, leadId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, loading]);

  async function handleSend() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const msg = await sendSms(funnelId, leadId, text);
      setMessages((prev) => [...prev, msg]);
      setBody("");
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  const segments = Math.max(1, Math.ceil(body.length / 160));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface border-l border-border-subtle shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-signal-green/15 text-signal-green-text shrink-0">
              <MessageSquare size={15} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink truncate">{leadName}</p>
              <p className="text-[11px] text-ink-muted truncate">
                {leadPhone ? formatPhoneIntl(leadPhone) : "No phone number"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={18} className="animate-spin text-ink-muted" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-[12px] text-ink-muted text-center py-16">
              No messages yet. Send the first text below.
            </p>
          ) : (
            messages.map((m) => {
              const outbound = m.direction === "outbound";
              const sender = outbound ? (m.userId ? resolveMember(m.userId)?.name || "You" : "You") : null;
              return (
                <div key={m.id} className={cn("flex flex-col", outbound ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-[14px] px-3 py-2 text-[12.5px] leading-snug whitespace-pre-wrap break-words",
                      outbound
                        ? "bg-signal-green/15 text-ink rounded-br-sm"
                        : "bg-section text-ink rounded-bl-sm",
                    )}
                  >
                    {m.body}
                  </div>
                  <p className="text-[10px] text-ink-faint mt-1 px-1">
                    {sender ? `${sender} · ` : ""}
                    {formatRelativeTime(m.createdAt)}
                    {outbound && m.status && m.status !== "received" ? ` · ${m.status}` : ""}
                  </p>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-border-subtle p-3">
          {error && <p className="text-[11px] text-signal-red-text mb-2 px-1">{error}</p>}
          <div className="flex items-end gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              rows={2}
              placeholder={leadPhone ? "Type a message…" : "This lead has no phone number"}
              disabled={!leadPhone || sending}
              className="flex-1 resize-none px-3 py-2 rounded-[12px] bg-section text-[12.5px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30 disabled:opacity-50"
            />
            <button
              onClick={() => void handleSend()}
              disabled={!body.trim() || !leadPhone || sending}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-ink text-on-ink hover:bg-ink/90 transition-colors disabled:opacity-40 shrink-0"
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
          <p className="text-[10px] text-ink-faint mt-1.5 px-1">
            {body.length} chars · {segments} SMS segment{segments === 1 ? "" : "s"} · ⌘/Ctrl+Enter to send
          </p>
        </div>
      </div>
    </div>
  );
}
