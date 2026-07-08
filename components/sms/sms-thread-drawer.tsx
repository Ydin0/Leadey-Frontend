"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";
import { X, MessageSquare, Loader2, Send, ChevronDown, Check, CheckCheck, FileText } from "lucide-react";
import { cn, formatRelativeTime, formatPhoneIntl } from "@/lib/utils";
import { useTeamMembers } from "@/hooks/use-team-members";
import { getSmsThread, getSmsThreadByPhone, sendSms, type SmsMessage } from "@/lib/api/sms";
import { getPhoneLines } from "@/lib/api/phone-lines";
import { listTemplates } from "@/lib/api/templates";
import { renderPersonalized, type PersonalizationLead } from "@/lib/utils/personalize";
import type { PhoneLine } from "@/lib/types/calling";
import type { Template } from "@/lib/types/template";
import { SlideOver } from "@/components/shared/slide-over";
import { useTelephonyBlock, isTelephonyBlockedError } from "@/components/telephony/telephony-block";

/** Rough dial-country of a number — so we text a UK lead from a UK number and a
 *  US lead from a US number (Twilio rejects mismatched From/To combinations). */
function phoneCountry(num: string | null | undefined): "us" | "uk" | "other" {
  const raw = (num || "").replace(/[^\d+]/g, "");
  const d = raw.replace(/\D/g, "");
  if (raw.startsWith("+44") || d.startsWith("44") || /^07\d{9}$/.test(d)) return "uk";
  if (raw.startsWith("+1") || (d.length === 11 && d.startsWith("1")) || (!raw.startsWith("+") && d.length === 10)) return "us";
  return "other";
}

interface SmsThreadDrawerProps {
  open: boolean;
  onClose: () => void;
  /** When linked to a lead, the thread loads & sends via funnel+lead. When null
   *  (e.g. an unmatched inbox number), the thread loads read-only by phone. */
  funnelId?: string | null;
  leadId?: string | null;
  leadName: string;
  leadPhone: string | null;
  /** Lead fields for personalizing template variables ({{first_name}}, etc.). */
  lead?: PersonalizationLead;
  /** Restrict the thread to one channel. On the lead profile this is "sms"
   *  (WhatsApp has its own drawer); the inbox leaves it unset to show all. */
  channelFilter?: "sms" | "whatsapp";
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
  lead,
  channelFilter,
  onSent,
}: SmsThreadDrawerProps) {
  const { resolveMember } = useTeamMembers();
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<PhoneLine[]>([]);
  const [fromLineId, setFromLineId] = useState<string>("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const { ensureAllowed: ensureTelephonyAllowed, showBlockModal, blockModal: telephonyBlockModal } = useTelephonyBlock();
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const personalize = (text: string) => renderPersonalized(text, lead || { name: leadName });
  /** Sending requires a linked lead; unmatched numbers are view-only. */
  const canSend = !!(funnelId && leadId);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setBody("");
    setFromLineId(""); // re-pick a country-matched From line for this lead
    const load = funnelId && leadId
      ? getSmsThread(funnelId, leadId)
      : leadPhone
        ? getSmsThreadByPhone(leadPhone)
        : Promise.resolve([] as SmsMessage[]);
    load
      .then((m) => !cancelled && setMessages(channelFilter ? m.filter((x) => (x.channel || "sms") === channelFilter) : m))
      .catch(() => !cancelled && setError("Couldn't load the conversation."))
      .finally(() => !cancelled && setLoading(false));
    setShowTemplates(false);
    getPhoneLines()
      .then((ls) => {
        if (cancelled) return;
        const active = ls.filter((l) => l.status === "active");
        setLines(active);
        // Default the "From" number to one whose country matches the recipient,
        // so a UK lead is texted from a UK number (Twilio rejects e.g. US→UK).
        const destCountry = phoneCountry(leadPhone);
        const match = destCountry !== "other"
          ? active.find((l) => phoneCountry(l.number) === destCountry)
          : undefined;
        setFromLineId((prev) => prev || match?.id || active[0]?.id || "");
      })
      .catch(() => {});
    listTemplates("sms").then((t) => !cancelled && setTemplates(t)).catch(() => {});
    return () => { cancelled = true; };
  }, [open, funnelId, leadId, leadPhone, channelFilter]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, loading]);

  const fromLine = useMemo(() => lines.find((l) => l.id === fromLineId), [lines, fromLineId]);

  async function handleSend() {
    const text = body.trim();
    if (!text || sending || !funnelId || !leadId) return;
    // Spend gate: balance floor / monthly budget.
    if (!(await ensureTelephonyAllowed())) return;
    setSending(true);
    setError(null);
    try {
      const msg = await sendSms(funnelId, leadId, personalize(text), fromLineId || undefined);
      setMessages((prev) => [...prev, msg]);
      setBody("");
      onSent?.();
    } catch (err) {
      if (isTelephonyBlockedError(err)) {
        showBlockModal(); // stale client cache — server refused; show the modal
      } else {
        setError(err instanceof Error ? err.message : "Failed to send");
      }
    } finally {
      setSending(false);
    }
  }

  const segments = Math.max(1, Math.ceil(body.length / 160));

  return (
    <>
    {telephonyBlockModal}
    <SlideOver open={open} onClose={onClose} width="max-w-[440px]">
      {/* Header */}
      <div className="relative shrink-0 px-5 py-4 border-b border-border-subtle">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal-green-text/40 to-transparent" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-signal-green/15 text-signal-green-text shrink-0">
              <MessageSquare size={16} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-ink truncate leading-tight">{leadName}</p>
              <p className="text-[11px] text-ink-muted truncate">
                {leadPhone ? formatPhoneIntl(leadPhone) : "No phone number"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1 rounded-lg text-ink-muted hover:bg-hover hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Send-from selector — admins can text from any active number. */}
        {canSend && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-ink-faint font-medium">From</span>
          <div className="relative flex-1 min-w-0">
            <NativeSelect
              value={fromLineId}
              onChange={(e) => setFromLineId(e.target.value)}
              disabled={lines.length === 0}
              className="w-full rounded-full pl-3 pr-8 py-1.5 text-[11px] font-medium text-ink-secondary focus:border-signal-blue-text/40 truncate"
            >
              {lines.length === 0 && <option value="">No active numbers</option>}
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.number}{l.assignedToName ? ` · ${l.assignedToName}` : l.friendlyName ? ` · ${l.friendlyName}` : ""}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        )}
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3 bg-page/40">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={18} className="animate-spin text-ink-muted" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-signal-green/10 text-signal-green-text mb-3">
              <MessageSquare size={20} strokeWidth={1.5} />
            </span>
            <p className="text-[12px] text-ink-muted">No messages yet.</p>
            <p className="text-[11px] text-ink-faint mt-0.5">Send the first text below.</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const outbound = m.direction === "outbound";
            const sender = outbound ? (m.userId ? resolveMember(m.userId)?.name || "You" : "You") : null;
            const prev = messages[i - 1];
            const grouped = prev && prev.direction === m.direction;
            return (
              <div key={m.id} className={cn("flex flex-col", outbound ? "items-end" : "items-start", grouped ? "mt-1" : "mt-3 first:mt-0")}>
                <div
                  className={cn(
                    "max-w-[82%] rounded-[16px] px-3.5 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap break-words shadow-sm",
                    outbound
                      ? "bg-signal-green text-signal-green-text rounded-br-md"
                      : "bg-surface border border-border-subtle text-ink rounded-bl-md",
                  )}
                >
                  {m.body}
                </div>
                <div className={cn("flex items-center gap-1 mt-1 px-1", outbound ? "flex-row-reverse" : "")}>
                  {sender && <span className="text-[10px] text-ink-muted">{sender}</span>}
                  <span className="text-[10px] text-ink-faint">{formatRelativeTime(m.createdAt)}</span>
                  {outbound && <DeliveryTick status={m.status} />}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* View-only footer when the number isn't linked to a lead. */}
      {!canSend ? (
        <div className="shrink-0 border-t border-border-subtle px-4 py-3 bg-surface">
          <p className="text-[11px] text-ink-muted text-center">
            This number isn’t linked to a lead — add them as a lead to reply.
          </p>
        </div>
      ) : (
      /* Composer */
      <div className="shrink-0 border-t border-border-subtle p-3 bg-surface">
        {error && <p className="text-[11px] text-signal-red-text mb-2 px-1">{error}</p>}

        {/* Template picker — links to your SMS templates */}
        <div className="relative mb-2">
          <button
            type="button"
            onClick={() => setShowTemplates((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors"
          >
            <FileText size={12} /> Use template <ChevronDown size={11} />
          </button>
          {showTemplates && (
            <div className="absolute left-0 bottom-full mb-1 z-20 w-72 max-h-56 overflow-y-auto bg-surface rounded-[10px] border border-border-subtle shadow-lg py-1">
              {templates.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-ink-muted">
                  No SMS templates yet — create them in Templates.
                </div>
              ) : (
                templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setBody(personalize(t.body)); setShowTemplates(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-hover transition-colors"
                  >
                    <p className="text-[11px] font-medium text-ink truncate">{t.name}</p>
                    <p className="text-[10px] text-ink-muted truncate">{t.body}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex items-end gap-2 rounded-[18px] bg-section border border-border-subtle focus-within:border-signal-blue-text/40 transition-colors px-2 py-1.5">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void handleSend();
              }
            }}
            rows={1}
            placeholder={leadPhone ? "Type a message…" : "This lead has no phone number"}
            disabled={!leadPhone || sending}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-[12.5px] text-ink placeholder:text-ink-faint outline-none max-h-32 disabled:opacity-50"
          />
          <button
            onClick={() => void handleSend()}
            disabled={!body.trim() || !leadPhone || sending}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-signal-green text-signal-green-text hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1.5">
          <span className="text-[10px] text-ink-faint truncate">
            {fromLine ? `From ${fromLine.number}` : ""}
          </span>
          <span className="text-[10px] text-ink-faint shrink-0">
            {body.length} · {segments} segment{segments === 1 ? "" : "s"} · ⌘↵
          </span>
        </div>
      </div>
      )}
    </SlideOver>
    </>
  );
}

/** Small delivery indicator for outbound texts. */
function DeliveryTick({ status }: { status: string }) {
  if (status === "delivered") return <CheckCheck size={11} className="text-signal-green-text" />;
  if (status === "failed") return <span className="text-[10px] text-signal-red-text">failed</span>;
  if (status === "sent" || status === "queued") return <Check size={11} className="text-ink-faint" />;
  return null;
}
