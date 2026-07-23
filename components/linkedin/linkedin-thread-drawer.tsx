"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Linkedin, Loader2, Send } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { SlideOver } from "@/components/shared/slide-over";
import {
  getLinkedInThread, sendLinkedInMessage, type LinkedInMessage,
} from "@/lib/api/linkedin";

/** LinkedIn conversation drawer — mirrors the SMS thread drawer. Shows the
 *  message history for one connection and (when the lead is matched) lets the
 *  rep reply, which sends through their connected LinkedIn account. */
export function LinkedInThreadDrawer({
  open, onClose, providerId, leadId, funnelId, contactName, onSent,
}: {
  open: boolean;
  onClose: () => void;
  providerId: string | null;
  leadId: string | null;
  funnelId: string | null;
  contactName: string;
  onSent?: () => void;
}) {
  const [messages, setMessages] = useState<LinkedInMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const canSend = !!(providerId && leadId && funnelId);

  const load = useCallback(async () => {
    if (!providerId) return;
    setLoading(true);
    try { setMessages(await getLinkedInThread(providerId)); }
    catch { /* leave prior */ }
    finally { setLoading(false); }
  }, [providerId]);

  useEffect(() => {
    if (open && providerId) { setBody(""); setError(null); void load(); }
  }, [open, providerId, load]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function handleSend() {
    const text = body.trim();
    if (!text || sending || !canSend) return;
    setSending(true);
    setError(null);
    try {
      await sendLinkedInMessage(funnelId!, leadId!, text);
      setBody("");
      await load();
      onSent?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <SlideOver open={open} onClose={onClose} width="max-w-[440px]">
      {/* Header */}
      <div className="relative shrink-0 px-5 py-4 border-b border-border-subtle">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal-blue-text/40 to-transparent" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-signal-blue/15 text-signal-blue-text shrink-0">
              <Linkedin size={16} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-ink truncate leading-tight">{contactName}</p>
              <p className="text-[11px] text-ink-muted truncate">LinkedIn conversation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 -mr-1 rounded-lg text-ink-muted hover:bg-hover hover:text-ink transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3 bg-page/40">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={18} className="animate-spin text-ink-muted" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-signal-blue/10 text-signal-blue-text mb-3"><Linkedin size={20} strokeWidth={1.5} /></span>
            <p className="text-[12px] text-ink-muted">No messages yet.</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const outbound = m.direction === "outbound";
            const prev = messages[i - 1];
            const grouped = prev && prev.direction === m.direction;
            return (
              <div key={m.id} className={cn("flex flex-col", outbound ? "items-end" : "items-start", grouped ? "mt-1" : "mt-3 first:mt-0")}>
                <div className={cn(
                  "max-w-[82%] rounded-[16px] px-3.5 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap break-words shadow-sm",
                  outbound ? "bg-signal-blue text-signal-blue-text rounded-br-md" : "bg-surface border border-border-subtle text-ink rounded-bl-md",
                )}>
                  {m.text}
                </div>
                <span className={cn("text-[10px] text-ink-faint mt-1 px-1")}>{formatRelativeTime(new Date(m.createdAt))}</span>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Composer / view-only footer */}
      {!canSend ? (
        <div className="shrink-0 border-t border-border-subtle px-4 py-3 bg-surface">
          <p className="text-[11px] text-ink-muted text-center">
            This conversation isn’t linked to a lead — add them as a lead to reply from here.
          </p>
        </div>
      ) : (
        <div className="shrink-0 border-t border-border-subtle p-3 bg-surface">
          {error && <p className="text-[11px] text-signal-red-text mb-2 px-1">{error}</p>}
          <div className="flex items-end gap-2 rounded-[18px] bg-section border border-border-subtle focus-within:border-signal-blue-text/40 transition-colors px-2 py-1.5">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void handleSend(); } }}
              rows={1}
              placeholder="Type a LinkedIn message…"
              className="flex-1 resize-none bg-transparent text-[12.5px] text-ink placeholder:text-ink-faint focus:outline-none py-1.5 px-1.5 max-h-32"
            />
            <button
              onClick={() => void handleSend()}
              disabled={!body.trim() || sending}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-signal-blue text-signal-blue-text disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="text-[10px] text-ink-faint mt-1.5 px-1">Sends from your connected LinkedIn · ⌘↵ to send</p>
        </div>
      )}
    </SlideOver>
  );
}
