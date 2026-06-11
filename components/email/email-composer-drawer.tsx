"use client";

import { useEffect, useState } from "react";
import { X, Mail, Loader2, Send, ChevronDown, FileText, Clock } from "lucide-react";
import { RichEmailEditor } from "./rich-email-editor";
import { SlideOver } from "@/components/shared/slide-over";
import { listSendingAccounts, sendEmail } from "@/lib/api/email";
import { listTemplates } from "@/lib/api/templates";
import { renderPersonalized, type PersonalizationLead } from "@/lib/utils/personalize";
import type { SendingAccount } from "@/lib/types/email";
import type { Template } from "@/lib/types/template";

export interface ComposerLead extends PersonalizationLead {
  id: string;
  email?: string | null;
}

interface EmailComposerDrawerProps {
  open: boolean;
  onClose: () => void;
  lead: ComposerLead;
  funnelId?: string | null;
  /** Current campaign step index (0-based), tagged on the sent message. */
  stepIndex?: number | null;
  onSent: (info: { subject: string; bodyHtml: string }) => void;
}

export function EmailComposerDrawer({
  open,
  onClose,
  lead,
  funnelId,
  stepIndex,
  onSent,
}: EmailComposerDrawerProps) {
  const [accounts, setAccounts] = useState<SendingAccount[]>([]);
  const [fromId, setFromId] = useState<string>("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    listSendingAccounts()
      .then((a) => {
        const active = a.filter((x) => x.isActive);
        setAccounts(active);
        setFromId((prev) => prev || active[0]?.id || "");
      })
      .catch(() => {});
    listTemplates("email").then(setTemplates).catch(() => setTemplates([]));
  }, [open]);

  function applyTemplate(t: Template) {
    setSubject(t.subject || "");
    // Templates store plain text; wrap lines into paragraphs for the editor.
    const html = (t.body || "")
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
      .join("");
    setBody(html);
    setShowTemplates(false);
  }

  async function handleSend() {
    if (!lead.email) {
      setError("This lead has no email address.");
      return;
    }
    if (!subject.trim() && !body.trim()) {
      setError("Add a subject or body before sending.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      // 1:1 send → resolve personalization tokens to the lead's real values.
      const resolvedSubject = renderPersonalized(subject, lead);
      const resolvedBody = renderPersonalized(body, lead);
      await sendEmail({
        leadId: lead.id,
        funnelId,
        fromAccountId: fromId,
        toEmail: lead.email,
        subject: resolvedSubject,
        bodyHtml: resolvedBody,
        stepIndex: stepIndex ?? null,
      });
      onSent({ subject: resolvedSubject, bodyHtml: resolvedBody });
      onClose();
      setSubject("");
      setBody("");
    } catch {
      setError("Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const fromAccount = accounts.find((a) => a.id === fromId);

  return (
    <SlideOver open={open} onClose={onClose} width="max-w-[560px]" panelClassName="bg-page">
      {/* Header */}
      <div className="relative flex items-center justify-between px-5 h-14 border-b border-border-subtle shrink-0">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal-blue-text/40 to-transparent" />
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-signal-blue/15 text-signal-blue-text">
            <Mail size={15} />
          </span>
          <span className="text-[13px] font-semibold text-ink">New Email</span>
        </div>
        <button onClick={onClose} className="p-1.5 -mr-1 rounded-lg text-ink-muted hover:bg-hover hover:text-ink transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {/* From */}
          <Field label="From">
            <div className="relative">
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="w-full appearance-none bg-section border border-border-subtle rounded-[8px] pl-3 pr-8 py-2 text-[12px] text-ink focus:outline-none focus:border-border-default"
              >
                {accounts.length === 0 && <option value="">No account connected</option>}
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fromName} · {a.email}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            </div>
            {accounts.length === 0 && (
              <p className="text-[10px] text-signal-red-text mt-1">
                No email account connected. Add one in Settings → Email Accounts.
              </p>
            )}
          </Field>

          {/* To */}
          <Field label="To">
            <div className="bg-section border border-border-subtle rounded-[8px] px-3 py-2 text-[12px] text-ink">
              {lead.name ? <span className="font-medium">{lead.name}</span> : null}
              {lead.email ? (
                <span className="text-ink-muted">{lead.name ? ` · ${lead.email}` : lead.email}</span>
              ) : (
                <span className="text-signal-red-text">No email address</span>
              )}
            </div>
          </Field>

          {/* Template picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplates((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors"
            >
              <FileText size={12} />
              Use template
              <ChevronDown size={11} />
            </button>
            {showTemplates && (
              <div className="absolute left-0 top-full mt-1 z-20 w-72 max-h-64 overflow-y-auto bg-surface rounded-[10px] border border-border-subtle shadow-lg py-1">
                {templates.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-ink-muted">No email templates yet.</div>
                ) : (
                  templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="w-full text-left px-3 py-2 hover:bg-hover transition-colors"
                    >
                      <p className="text-[11px] font-medium text-ink truncate">{t.name}</p>
                      {t.subject && <p className="text-[10px] text-ink-muted truncate">{t.subject}</p>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Subject */}
          <Field label="Subject">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Quick question about {{company}}"
              className="w-full bg-section border border-border-subtle rounded-[8px] px-3 py-2 text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
            />
            {subject.includes("{{") && (
              <p className="text-[10px] text-ink-faint mt-1">
                Preview: {renderPersonalized(subject, lead)}
              </p>
            )}
          </Field>

          {/* Body */}
          <Field label="Body">
            <RichEmailEditor
              value={body}
              onChange={setBody}
              previewLead={lead}
              senderName={fromAccount?.fromName}
              minHeight={240}
            />
          </Field>

          {error && <p className="text-[11px] text-signal-red-text">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 h-16 border-t border-border-subtle shrink-0">
          <button
            type="button"
            disabled
            title="Scheduling hooks up with the backend later"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-surface border border-border-subtle text-[11px] font-medium text-ink-faint cursor-not-allowed"
          >
            <Clock size={13} />
            Schedule
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !lead.email}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Send email
          </button>
        </div>
    </SlideOver>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
