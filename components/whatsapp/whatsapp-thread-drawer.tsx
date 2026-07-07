"use client";

import { useEffect, useRef, useState } from "react";
import { X, MessageCircle, Loader2, Send, Check, CheckCheck, FileText } from "lucide-react";
import Link from "next/link";
import { NativeSelect } from "@/components/ui/native-select";
import { cn, formatRelativeTime, formatPhoneIntl } from "@/lib/utils";
import { useTeamMembers } from "@/hooks/use-team-members";
import { getSmsThread, type SmsMessage } from "@/lib/api/sms";
import { sendWhatsappToLead, getWhatsappSettings, listWhatsappTemplates, type WhatsappSettings, type WhatsappTemplate } from "@/lib/api/whatsapp";
import { renderPersonalized, type PersonalizationLead } from "@/lib/utils/personalize";
import { SlideOver } from "@/components/shared/slide-over";

const DAY_MS = 24 * 60 * 60 * 1000;

interface WhatsappThreadDrawerProps {
  open: boolean;
  onClose: () => void;
  funnelId?: string | null;
  leadId?: string | null;
  leadName: string;
  leadPhone: string | null;
  /** Lead fields for personalizing {{first_name}} etc. */
  lead?: PersonalizationLead;
  /** Called after a message is sent so the parent can refresh the timeline. */
  onSent?: () => void;
}

/** Manual WhatsApp conversation with a lead — mirrors the SMS drawer but sends
 *  from the org's QR-connected WhatsApp number (no From-line selector) and
 *  shows only channel="whatsapp" messages. */
export function WhatsappThreadDrawer({
  open,
  onClose,
  funnelId,
  leadId,
  leadName,
  leadPhone,
  lead,
  onSent,
}: WhatsappThreadDrawerProps) {
  const { resolveMember } = useTeamMembers();
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<WhatsappSettings | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateVars, setTemplateVars] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const personalize = (text: string) => renderPersonalized(text, lead || { name: leadName });
  const canSend = !!(funnelId && leadId);
  const connected = !!settings?.connected;

  // Meta's 24-hour rule: freeform only when the lead messaged us within 24h;
  // otherwise (cold/first-touch) an approved template is required.
  const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");
  const inWindow = !!lastInbound && Date.now() - new Date(lastInbound.createdAt).getTime() < DAY_MS;
  const approvedTemplates = templates.filter((t) => t.status === "APPROVED");
  const selectedTemplate = approvedTemplates.find((t) => t.name === templateName) || null;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setBody("");
    setTemplateName("");
    setTemplateVars([]);
    const load = funnelId && leadId ? getSmsThread(funnelId, leadId) : Promise.resolve([] as SmsMessage[]);
    load
      .then((m) => !cancelled && setMessages(m.filter((x) => x.channel === "whatsapp")))
      .catch(() => !cancelled && setError("Couldn't load the conversation."))
      .finally(() => !cancelled && setLoading(false));
    getWhatsappSettings().then((s) => !cancelled && setSettings(s)).catch(() => {});
    listWhatsappTemplates().then((t) => !cancelled && setTemplates(t)).catch(() => {});
    return () => { cancelled = true; };
  }, [open, funnelId, leadId]);

  // Reset the variable inputs to match the picked template's slot count.
  useEffect(() => {
    setTemplateVars(selectedTemplate ? Array(selectedTemplate.bodyVariableCount).fill("") : []);
  }, [templateName]); // eslint-disable-line react-hooks/exhaustive-deps

  function appendOptimistic(id: string, text: string, from: string, to: string, status: string) {
    setMessages((prev) => [
      ...prev,
      { id, direction: "outbound", channel: "whatsapp", fromNumber: from, toNumber: to, body: text, status, userId: null, createdAt: new Date().toISOString() },
    ]);
  }

  async function handleSendTemplate() {
    if (!selectedTemplate || sending || !funnelId || !leadId) return;
    setSending(true);
    setError(null);
    try {
      const vars = templateVars.map((v) => personalize(v));
      const sent = await sendWhatsappToLead(funnelId, leadId, {
        templateName: selectedTemplate.name,
        templateLanguage: selectedTemplate.language,
        templateVariables: vars,
        contentBody: selectedTemplate.bodyText,
      });
      appendOptimistic(sent.id, sent.body, sent.fromNumber, sent.toNumber, sent.status);
      setTemplateName("");
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const text = body.trim();
    if (!text || sending || !funnelId || !leadId) return;
    setSending(true);
    setError(null);
    try {
      const sent = await sendWhatsappToLead(funnelId, leadId, { body: personalize(text) });
      setMessages((prev) => [
        ...prev,
        {
          id: sent.id,
          direction: "outbound",
          channel: "whatsapp",
          fromNumber: sent.fromNumber,
          toNumber: sent.toNumber,
          body: personalize(text),
          status: sent.status,
          userId: null,
          createdAt: new Date().toISOString(),
        },
      ]);
      setBody("");
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <SlideOver open={open} onClose={onClose} width="max-w-[440px]">
      {/* Header */}
      <div className="relative shrink-0 px-5 py-4 border-b border-border-subtle">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal-green-text/40 to-transparent" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-signal-green/15 text-signal-green-text shrink-0">
              <MessageCircle size={16} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-ink truncate leading-tight">{leadName}</p>
              <p className="text-[11px] text-ink-muted truncate">
                {leadPhone ? `WhatsApp · ${formatPhoneIntl(leadPhone)}` : "No phone number"}
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
              <MessageCircle size={20} strokeWidth={1.5} />
            </span>
            <p className="text-[12px] text-ink-muted">No WhatsApp messages yet.</p>
            <p className="text-[11px] text-ink-faint mt-0.5">Send the first message below.</p>
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

      {/* Composer / states */}
      {!canSend ? (
        <div className="shrink-0 border-t border-border-subtle px-4 py-3 bg-surface">
          <p className="text-[11px] text-ink-muted text-center">
            This number isn’t linked to a lead — add them as a lead to message on WhatsApp.
          </p>
        </div>
      ) : settings && !connected ? (
        <div className="shrink-0 border-t border-border-subtle px-4 py-3 bg-surface text-center">
          <p className="text-[11px] text-ink-muted">
            No WhatsApp connected.{" "}
            <Link href="/dashboard/settings?tab=whatsapp" className="text-signal-green-text font-medium hover:underline">
              Connect your WhatsApp
            </Link>{" "}
            to send.
          </p>
        </div>
      ) : inWindow ? (
        <div className="shrink-0 border-t border-border-subtle p-3 bg-surface">
          {error && <p className="text-[11px] text-signal-red-text mb-2 px-1">{error}</p>}
          <div className="flex items-end gap-2 rounded-[18px] bg-section border border-border-subtle focus-within:border-signal-green-text/40 transition-colors px-2 py-1.5">
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
              placeholder={leadPhone ? "Type a WhatsApp message…" : "This lead has no phone number"}
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
          <div className="flex items-center justify-end mt-1.5 px-1.5">
            <span className="text-[10px] text-ink-faint shrink-0">
              {settings?.phone ? `From ${settings.phone} · ` : ""}⌘↵
            </span>
          </div>
        </div>
      ) : (
        // Outside the 24h window — an approved template is required.
        <div className="shrink-0 border-t border-border-subtle p-3 bg-surface space-y-2">
          {error && <p className="text-[11px] text-signal-red-text px-1">{error}</p>}
          <div className="flex items-center gap-1.5 text-[10.5px] text-ink-muted px-1">
            <FileText size={12} className="shrink-0 text-ink-faint" />
            {lastInbound
              ? "It's been over 24h since their last reply — send an approved template."
              : "First WhatsApp message — cold outreach requires an approved template."}
          </div>
          {approvedTemplates.length === 0 ? (
            <p className="text-[11px] text-ink-faint px-1">
              No approved templates yet. Create and submit them in Meta Business Manager, then they&apos;ll appear here.
            </p>
          ) : (
            <>
              <NativeSelect
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full text-[12px]"
              >
                <option value="">Choose a template…</option>
                {approvedTemplates.map((t) => (
                  <option key={`${t.name}:${t.language}`} value={t.name}>
                    {t.name} ({t.language})
                  </option>
                ))}
              </NativeSelect>
              {selectedTemplate && (
                <>
                  <p className="text-[11px] text-ink-secondary bg-section rounded-[8px] px-2.5 py-2 whitespace-pre-wrap leading-relaxed">
                    {selectedTemplate.bodyText}
                  </p>
                  {templateVars.map((v, i) => (
                    <input
                      key={i}
                      value={v}
                      onChange={(e) => setTemplateVars((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))}
                      placeholder={`Value for {{${i + 1}}} — supports {{first_name}}`}
                      className="w-full px-2.5 py-1.5 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
                    />
                  ))}
                  <button
                    onClick={() => void handleSendTemplate()}
                    disabled={sending || templateVars.some((v) => !v.trim())}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-signal-green text-signal-green-text text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    Send template
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </SlideOver>
  );
}

function DeliveryTick({ status }: { status: string }) {
  if (status === "delivered") return <CheckCheck size={11} className="text-signal-green-text" />;
  if (status === "failed") return <span className="text-[10px] text-signal-red-text">failed</span>;
  if (status === "sent" || status === "queued") return <Check size={11} className="text-ink-faint" />;
  return null;
}
