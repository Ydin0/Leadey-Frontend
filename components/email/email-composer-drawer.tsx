"use client";

import { useEffect, useRef, useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";
import { X, Mail, Loader2, Send, ChevronDown, FileText, Clock, Paperclip } from "lucide-react";
import { RichEmailEditor } from "./rich-email-editor";
import { SlideOver } from "@/components/shared/slide-over";
import { listSendingAccounts, sendEmail } from "@/lib/api/email";
import { listTemplates, listTemplateAttachments, uploadTemplateAttachment } from "@/lib/api/templates";
import { renderPersonalized, type PersonalizationLead } from "@/lib/utils/personalize";
import type { SendingAccount } from "@/lib/types/email";
import type { Template, TemplateAttachment } from "@/lib/types/template";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  /** Prefill for replies/forwards (Re:/Fwd: subject + quoted body). */
  initialSubject?: string;
  initialBody?: string;
  /** Prefill recipient — empty for Forward (type a new address), the reply
   *  target for Reply, or defaults to the lead's email. */
  initialTo?: string;
  onSent: (info: { subject: string; bodyHtml: string }) => void;
}

export function EmailComposerDrawer({
  open,
  onClose,
  lead,
  funnelId,
  stepIndex,
  initialSubject,
  initialBody,
  initialTo,
  onSent,
}: EmailComposerDrawerProps) {
  const [accounts, setAccounts] = useState<SendingAccount[]>([]);
  const [fromId, setFromId] = useState<string>("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [toEmail, setToEmail] = useState("");
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<TemplateAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  // Seed recipient + Re:/Fwd: subject + quoted body when opened. For a forward
  // the To starts empty so you can type a new address; otherwise default to the
  // reply target (or the lead).
  useEffect(() => {
    if (!open) return;
    setToEmail(initialTo !== undefined ? initialTo : lead.email || "");
    setCc("");
    setShowCc(false);
    setAttachments([]);
    if (initialSubject !== undefined) setSubject(initialSubject);
    if (initialBody !== undefined) setBody(initialBody);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function applyTemplate(t: Template) {
    setSubject(t.subject || "");
    // Prefer the rich HTML body; fall back to wrapping legacy plain text.
    const html = t.bodyHtml
      ? t.bodyHtml
      : (t.body || "")
          .split(/\n{2,}/)
          .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
          .join("");
    setBody(html);
    setShowTemplates(false);
    // Pull in the template's attachments (list endpoint omits them).
    try {
      const atts = await listTemplateAttachments(t.id);
      setAttachments(atts);
    } catch {
      setAttachments([]);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: TemplateAttachment[] = [];
      for (const file of Array.from(files)) {
        uploaded.push(await uploadTemplateAttachment(file, null));
      }
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attachment upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // Composer removes are local only — a template's shared files stay on the
  // template; ad-hoc uploads just become unreferenced (harmless).
  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleSend() {
    const recipient = toEmail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) {
      setError("Enter a valid recipient email address.");
      return;
    }
    if (!subject.trim() && !body.trim()) {
      setError("Add a subject or body before sending.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      // Resolve personalization tokens to the lead's real values (and the
      // sending rep's name for {{sender_name}}).
      const ctx = { senderName: accounts.find((a) => a.id === fromId)?.fromName };
      const resolvedSubject = renderPersonalized(subject, lead, ctx);
      const resolvedBody = renderPersonalized(body, lead, ctx);
      await sendEmail({
        leadId: lead.id,
        funnelId,
        fromAccountId: fromId,
        toEmail: recipient,
        cc: cc.trim() || undefined,
        subject: resolvedSubject,
        bodyHtml: resolvedBody,
        attachmentIds: attachments.map((a) => a.id),
        stepIndex: stepIndex ?? null,
      });
      onSent({ subject: resolvedSubject, bodyHtml: resolvedBody });
      onClose();
      setSubject("");
      setBody("");
      setAttachments([]);
    } catch (err) {
      // Surface the real reason (provider error, scope/permission, etc.) so it
      // can actually be fixed — not a generic "try again".
      setError(err instanceof Error ? err.message : "Failed to send email. Please try again.");
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
              <NativeSelect
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="w-full rounded-[8px] pl-3 pr-8 py-2 text-[12px] text-ink focus:border-border-default"
              >
                {accounts.length === 0 && <option value="">No account connected</option>}
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fromName} · {a.email}
                  </option>
                ))}
              </NativeSelect>
            </div>
            {accounts.length === 0 && (
              <p className="text-[10px] text-signal-red-text mt-1">
                No email account connected. Add one in Settings → Email Accounts.
              </p>
            )}
          </Field>

          {/* To */}
          <Field label="To">
            <div className="relative">
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-section border border-border-subtle rounded-[8px] px-3 py-2 text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
              />
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-ink-muted hover:text-ink-secondary transition-colors"
                >
                  + Cc
                </button>
              )}
            </div>
          </Field>

          {/* Cc (optional) */}
          {showCc && (
            <Field label="Cc">
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc1@company.com, cc2@company.com"
                className="w-full bg-section border border-border-subtle rounded-[8px] px-3 py-2 text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
              />
            </Field>
          )}

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
            {fromAccount?.signature ? (
              <div className="mt-2 rounded-[8px] border border-border-subtle bg-section/40 px-3 py-2">
                <p className="text-[9px] uppercase tracking-wider text-ink-faint font-medium mb-1">
                  Signature added automatically
                </p>
                <div
                  className="text-[11.5px] text-ink-muted leading-relaxed [&_a]:text-accent"
                  dangerouslySetInnerHTML={{
                    __html: /<[a-z][\s\S]*>/i.test(fromAccount.signature)
                      ? fromAccount.signature
                      : fromAccount.signature.replace(/\n/g, "<br>"),
                  }}
                />
              </div>
            ) : null}
          </Field>

          {/* Attachments */}
          <Field label="Attachments">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-section border border-border-subtle text-[10px] font-medium text-ink-secondary hover:bg-hover transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 size={11} className="animate-spin" /> : <Paperclip size={11} />}
                Attach file
              </button>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            </div>
            {attachments.length > 0 && (
              <div className="space-y-1.5">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-section border border-border-subtle"
                  >
                    <FileText size={13} className="text-ink-muted shrink-0" />
                    <span className="text-[11px] text-ink truncate flex-1">{att.fileName}</span>
                    <span className="text-[10px] text-ink-faint shrink-0">{formatSize(att.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      title="Remove"
                      className="p-0.5 rounded text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
            disabled={sending || !toEmail.trim() || accounts.length === 0}
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
