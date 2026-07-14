"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Mail, MessageSquare, MessageCircle, Send, Loader2, ChevronDown, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NativeSelect } from "@/components/ui/native-select";
import { RichEmailEditor } from "@/components/email/rich-email-editor";
import { SignaturePicker } from "@/components/shared/signature-picker";
import { listSignatures, getSignatureDetails, type EmailSignature, type SignatureDetails } from "@/lib/api/signatures";
import { listSendingAccounts, sendEmail } from "@/lib/api/email";
import { listTemplates, listTemplateAttachments, uploadTemplateAttachment } from "@/lib/api/templates";
import { uploadLeadDocument } from "@/lib/api/lead-documents";
import type { NoteAttachment } from "@/lib/types/funnel-focus";
import { getPhoneLines } from "@/lib/api/phone-lines";
import { sendSms } from "@/lib/api/sms";
import { getWhatsappSettings, listWhatsappTemplates, sendWhatsappToLead, type WhatsappTemplate } from "@/lib/api/whatsapp";
import { renderPersonalized, type PersonalizationLead } from "@/lib/utils/personalize";
import type { PhoneLine } from "@/lib/types/calling";
import type { SendingAccount } from "@/lib/types/email";
import type { Template, TemplateAttachment } from "@/lib/types/template";

/** Rough dial-country of a number (mirrors the SMS send-line matching). */
function phoneCountry(num: string | null | undefined): "us" | "uk" | "other" {
  const d = (num || "").replace(/[^\d]/g, "");
  if (d.startsWith("44") || (d.startsWith("0") && d.length >= 10)) return "uk";
  if (d.startsWith("1") && d.length === 11) return "us";
  return "other";
}

export type ComposerMode = "note" | "email" | "sms" | "whatsapp";
export interface ComposerContact { leadId: string; name: string; email: string | null; phone: string | null }
export interface ComposerLead extends PersonalizationLead { id: string; email?: string | null }

interface LeadComposerProps {
  funnelId: string;
  leadId: string;
  lead: ComposerLead;
  contacts: ComposerContact[];
  mode: ComposerMode;
  onModeChange: (m: ComposerMode) => void;
  stepIndex?: number | null;
  /** Reply/forward prefill for email. */
  prefill?: { to?: string; subject?: string; body?: string } | null;
  onAddNote: (text: string, attachments?: NoteAttachment[]) => void;
  onSent: () => void;
}

const TABS: { key: ComposerMode; label: string; icon: typeof Mail; fg: string; tint: string }[] = [
  { key: "note", label: "Note", icon: FileText, fg: "text-ink-secondary", tint: "bg-section" },
  { key: "email", label: "Email", icon: Mail, fg: "text-signal-blue-text", tint: "bg-signal-blue/15" },
  { key: "sms", label: "Text", icon: MessageSquare, fg: "text-signal-green-text", tint: "bg-signal-green/15" },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, fg: "text-signal-green-text", tint: "bg-signal-green/15" },
];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
function fmtSize(b: number) { return b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`; }

export function LeadComposer(props: LeadComposerProps) {
  const { mode, onModeChange } = props;
  return (
    <div className="rounded-[14px] border border-border-subtle bg-surface overflow-hidden">
      {/* Mode tabs */}
      <div className="flex items-center gap-1 px-2 pt-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = mode === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onModeChange(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-medium transition-colors",
                active ? `${t.tint} ${t.fg}` : "text-ink-muted hover:bg-hover hover:text-ink-secondary",
              )}
            >
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>
      <div className="px-3 pb-3 pt-2">
        {mode === "note" && <NoteForm {...props} />}
        {mode === "email" && <EmailForm {...props} />}
        {(mode === "sms" || mode === "whatsapp") && <MessageForm key={mode} {...props} />}
      </div>
    </div>
  );
}

/* ── Note ─────────────────────────────────────────────────────────────── */
function NoteForm({ funnelId, leadId, onAddNote }: LeadComposerProps) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list || !list.length) return;
    setError(null);
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  async function submit() {
    const clean = text.trim();
    if (!clean && files.length === 0) return;
    setSubmitting(true); setError(null);
    try {
      let attachments: NoteAttachment[] | undefined;
      if (files.length) {
        const uploaded = [];
        for (const f of files) uploaded.push(await uploadLeadDocument(funnelId, leadId, f));
        attachments = uploaded.map((d) => ({ id: d.id, fileName: d.fileName, mimeType: d.mimeType, size: d.size }));
      }
      onAddNote(clean, attachments);
      setText(""); setFiles([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to attach files");
    } finally { setSubmitting(false); }
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
      className={cn(
        "rounded-[10px] border transition-colors",
        dragOver ? "border-accent border-dashed bg-accent/5" : "border-border-subtle bg-section",
      )}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a note about this lead… (or drop files to attach)"
        rows={3}
        className="w-full bg-transparent px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-faint resize-y focus:outline-none"
      />
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {files.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 max-w-full pl-2.5 pr-1.5 py-1 rounded-full bg-surface border border-border-subtle text-[11px] text-ink">
              <FileText size={11} className="text-ink-muted shrink-0" />
              <span className="truncate max-w-[160px]">{f.name}</span>
              {f.size > 0 && <span className="text-ink-faint">{fmtSize(f.size)}</span>}
              <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="p-0.5 rounded-full hover:bg-hover text-ink-muted hover:text-ink"><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
      {error && <p className="text-[11px] text-signal-red-text px-3 pb-1.5">{error}</p>}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border-subtle">
        <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); if (fileRef.current) fileRef.current.value = ""; }} />
        <button onClick={() => fileRef.current?.click()} disabled={submitting} title="Attach files" className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border-subtle text-[10.5px] text-ink-secondary hover:bg-hover disabled:opacity-50">
          <Paperclip size={11} /> Attach
        </button>
        <button
          onClick={submit}
          disabled={submitting || (!text.trim() && files.length === 0)}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 disabled:opacity-50 transition-colors"
        >
          {submitting && <Loader2 size={11} className="animate-spin" />} Add note
        </button>
      </div>
    </div>
  );
}

/* ── Chip recipient input (email) ─────────────────────────────────────── */
function ChipInput({ value, onChange, suggestions, placeholder }: {
  value: string[]; onChange: (v: string[]) => void;
  suggestions: { label: string; value: string }[]; placeholder: string;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const add = (v: string) => { const e = v.trim().toLowerCase(); if (e && !value.includes(e)) onChange([...value, e]); setText(""); setOpen(false); };
  const filtered = suggestions.filter((s) => !value.includes(s.value) && (s.label.toLowerCase().includes(text.toLowerCase()) || s.value.includes(text.toLowerCase())));
  return (
    <div className="relative flex flex-wrap items-center gap-1.5 bg-section border border-border-subtle rounded-[8px] px-2 py-1.5 focus-within:border-border-default">
      {value.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-accent/15 text-link text-[11px] font-medium">
          {v}
          <button onClick={() => onChange(value.filter((x) => x !== v))} className="hover:text-ink-secondary"><X size={11} /></button>
        </span>
      ))}
      <input
        value={text}
        onChange={(e) => { setText(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === ",") && text.trim()) { e.preventDefault(); add(text); } else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1)); }}
        placeholder={value.length ? "" : placeholder}
        className="flex-1 min-w-[120px] bg-transparent text-[12px] text-ink placeholder:text-ink-faint focus:outline-none py-0.5"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-30 w-full max-h-52 overflow-y-auto bg-surface border border-border-subtle rounded-[10px] shadow-lg py-1">
          {filtered.map((s) => (
            <button key={s.value} onMouseDown={(e) => { e.preventDefault(); add(s.value); }} className="w-full text-left px-3 py-1.5 hover:bg-hover transition-colors">
              <span className="text-[12px] text-ink">{s.label}</span>
              {s.label !== s.value && <span className="text-[10.5px] text-ink-muted ml-1.5">{s.value}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Email ────────────────────────────────────────────────────────────── */
function EmailForm({ funnelId, leadId, lead, contacts, stepIndex, prefill, onSent }: LeadComposerProps) {
  const [accounts, setAccounts] = useState<SendingAccount[]>([]);
  const [fromId, setFromId] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [to, setTo] = useState<string[]>(prefill?.to ? [prefill.to.toLowerCase()] : (lead.email ? [lead.email.toLowerCase()] : []));
  const [cc, setCc] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [bcc, setBcc] = useState<string[]>([]);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState(prefill?.subject ?? "");
  const [body, setBody] = useState(prefill?.body ?? "");
  const [signatureId, setSignatureId] = useState("default");
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [senderDetails, setSenderDetails] = useState<SignatureDetails | null>(null);
  const [attachments, setAttachments] = useState<TemplateAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listSendingAccounts().then((a) => { const active = a.filter((x) => x.isActive); setAccounts(active); setFromId((p) => p || active[0]?.id || ""); }).catch(() => {});
    listTemplates("email").then(setTemplates).catch(() => setTemplates([]));
    listSignatures().then(setSignatures).catch(() => setSignatures([]));
    getSignatureDetails().then(setSenderDetails).catch(() => {});
  }, []);

  const emailSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: { label: string; value: string }[] = [];
    for (const c of contacts) {
      const e = (c.email || "").toLowerCase();
      if (e && !seen.has(e)) { seen.add(e); out.push({ label: c.name || e, value: e }); }
    }
    return out;
  }, [contacts]);

  const fromAccount = accounts.find((a) => a.id === fromId);

  // Live signature preview — render the SAME HTML the backend appends at send,
  // with the rep's own {{sender_*}} details filled in, so it's visible here.
  const signaturePreview = useMemo(() => {
    if (signatureId === "none") return null;
    // "default" → the rep's personal default shared signature if they've marked
    // one, else the mailbox's own configured signature.
    const defaultRaw = senderDetails?.defaultSignatureId
      ? signatures.find((s) => s.id === senderDetails.defaultSignatureId)?.contentHtml || null
      : fromAccount?.signature || null;
    const raw = signatureId === "default"
      ? defaultRaw
      : signatures.find((s) => s.id === signatureId)?.contentHtml || null;
    if (!raw) return null;
    const senderCtx = senderDetails ? {
      sender: {
        firstName: senderDetails.firstName, lastName: senderDetails.lastName,
        email: senderDetails.email, phone: senderDetails.phone, title: senderDetails.title,
        fields: senderDetails.signatureFields,
      },
    } : undefined;
    return renderPersonalized(raw, lead, senderCtx);
  }, [signatureId, signatures, fromAccount, senderDetails, lead]);

  async function applyTemplate(t: Template) {
    setSubject(t.subject || "");
    setBody(t.bodyHtml || (t.body || "").split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join(""));
    setShowTemplates(false);
    try { setAttachments(await listTemplateAttachments(t.id)); } catch { setAttachments([]); }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true); setError(null);
    try {
      const up: TemplateAttachment[] = [];
      for (const f of Array.from(files)) up.push(await uploadTemplateAttachment(f, null));
      setAttachments((prev) => [...prev, ...up]);
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function send() {
    const recipients = to.filter((e) => EMAIL_RE.test(e));
    if (recipients.length === 0) { setError("Add a valid recipient."); return; }
    if (!subject.trim() && !body.trim()) { setError("Add a subject or body."); return; }
    setSending(true); setError(null);
    try {
      const ctx = { senderName: fromAccount?.fromName };
      await sendEmail({
        leadId, funnelId, fromAccountId: fromId,
        toEmail: recipients.join(", "),
        cc: cc.length ? cc.join(", ") : undefined,
        bcc: bcc.length ? bcc.join(", ") : undefined,
        subject: renderPersonalized(subject, lead, ctx),
        bodyHtml: renderPersonalized(body, lead, ctx),
        attachmentIds: attachments.map((a) => a.id),
        stepIndex: stepIndex ?? null,
        signatureId,
      });
      setSubject(""); setBody(""); setAttachments([]);
      onSent();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to send email."); }
    finally { setSending(false); }
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      className={cn("space-y-2.5 rounded-[12px] transition-colors", dragOver && "outline-2 outline-dashed outline-accent bg-accent/5")}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium w-12 shrink-0">From</span>
        <NativeSelect value={fromId} onChange={(e) => setFromId(e.target.value)} className="flex-1 bg-section border border-border-subtle rounded-[8px] px-3 py-1.5 text-[12px] text-ink">
          {accounts.length === 0 && <option value="">No account connected</option>}
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.fromName} · {a.email}</option>)}
        </NativeSelect>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium w-12 shrink-0 pt-2">To</span>
        <div className="flex-1 min-w-0"><ChipInput value={to} onChange={setTo} suggestions={emailSuggestions} placeholder="name@company.com" /></div>
        {(!showCc || !showBcc) && (
          <div className="flex items-center gap-2 pt-1.5 shrink-0 text-[11px]">
            {!showCc && <button onClick={() => setShowCc(true)} className="text-ink-muted hover:text-ink-secondary">Cc</button>}
            {!showBcc && <button onClick={() => setShowBcc(true)} className="text-ink-muted hover:text-ink-secondary">Bcc</button>}
          </div>
        )}
      </div>
      {showCc && (
        <div className="flex items-start gap-2"><span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium w-12 shrink-0 pt-2">Cc</span><div className="flex-1 min-w-0"><ChipInput value={cc} onChange={setCc} suggestions={emailSuggestions} placeholder="cc@company.com" /></div></div>
      )}
      {showBcc && (
        <div className="flex items-start gap-2"><span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium w-12 shrink-0 pt-2">Bcc</span><div className="flex-1 min-w-0"><ChipInput value={bcc} onChange={setBcc} suggestions={emailSuggestions} placeholder="bcc@company.com" /></div></div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium w-12 shrink-0">Subject</span>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="flex-1 bg-section border border-border-subtle rounded-[8px] px-3 py-1.5 text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default" />
        <div className="relative shrink-0">
          <button onClick={() => setShowTemplates((v) => !v)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] bg-section border border-border-subtle text-[11px] text-ink-secondary hover:bg-hover"><FileText size={12} /> Template <ChevronDown size={11} /></button>
          {showTemplates && (
            <div className="absolute right-0 top-full mt-1 z-30 w-72 max-h-56 overflow-y-auto bg-surface border border-border-subtle rounded-[10px] shadow-lg py-1">
              {templates.length === 0 ? <div className="px-3 py-2 text-[11px] text-ink-muted">No email templates.</div>
                : templates.map((t) => <button key={t.id} onClick={() => applyTemplate(t)} className="w-full text-left px-3 py-2 hover:bg-hover"><p className="text-[11px] font-medium text-ink truncate">{t.name}</p>{t.subject && <p className="text-[10px] text-ink-muted truncate">{t.subject}</p>}</button>)}
            </div>
          )}
        </div>
      </div>

      {/* The signature renders INLINE below the body on the same white email
          sheet, so what you write + the signature read as one email. */}
      <RichEmailEditor value={body} onChange={setBody} previewLead={lead} senderName={fromAccount?.fromName} minHeight={200} sheet signatureHtml={signatureId === "none" ? null : signaturePreview} />

      {/* Slim signature switcher — the preview itself is now inline above. */}
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Signature</span>
        <SignaturePicker value={signatureId} onChange={setSignatureId} />
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-section border border-border-subtle text-[10.5px] text-ink-secondary hover:bg-hover disabled:opacity-50">
          {uploading ? <Loader2 size={11} className="animate-spin" /> : <Paperclip size={11} />} Attach
        </button>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        {attachments.map((a) => (
          <span key={a.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-section border border-border-subtle text-[10.5px] text-ink">
            <FileText size={11} className="text-ink-muted" /> {a.fileName} <span className="text-ink-faint">{fmtSize(a.size)}</span>
            <button onClick={() => setAttachments((p) => p.filter((x) => x.id !== a.id))} className="text-ink-faint hover:text-signal-red-text"><X size={11} /></button>
          </span>
        ))}
      </div>

      {error && <p className="text-[11px] text-signal-red-text">{error}</p>}
      <div className="flex items-center justify-end">
        <button onClick={send} disabled={sending || to.length === 0 || accounts.length === 0} className="flex items-center gap-1.5 px-5 py-2 rounded-[20px] bg-ink text-on-ink text-[12px] font-semibold hover:bg-ink/90 disabled:opacity-50 transition-colors">
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send email
        </button>
      </div>
    </div>
  );
}

/* ── SMS + WhatsApp (share the same shape) ───────────────────────────── */
function MessageForm({ funnelId, mode, lead, contacts, onSent }: LeadComposerProps) {
  const isWa = mode === "whatsapp";
  const recipients = useMemo(() => contacts.filter((c) => c.phone), [contacts]);
  const [toLeadId, setToLeadId] = useState<string>(recipients.find((c) => c.leadId)?.leadId || "");
  const [lines, setLines] = useState<PhoneLine[]>([]);
  const [fromLineId, setFromLineId] = useState("");
  const [waConnected, setWaConnected] = useState<boolean | null>(null);
  const [waTemplates, setWaTemplates] = useState<WhatsappTemplate[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<Template[]>([]);
  const [showTpl, setShowTpl] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = recipients.find((c) => c.leadId === toLeadId) || recipients[0];
  const toPhone = active?.phone || null;

  useEffect(() => {
    if (isWa) {
      getWhatsappSettings().then((s) => setWaConnected(!!s.connected)).catch(() => setWaConnected(false));
      listWhatsappTemplates().then(setWaTemplates).catch(() => setWaTemplates([]));
    } else {
      getPhoneLines().then((ls) => {
        const act = ls.filter((l) => l.status === "active");
        setLines(act);
        const dest = phoneCountry(toPhone);
        setFromLineId((p) => p || act.find((l) => phoneCountry(l.number) === dest)?.id || act[0]?.id || "");
      }).catch(() => {});
      listTemplates("sms").then(setSmsTemplates).catch(() => setSmsTemplates([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWa]);

  async function send() {
    if (!body.trim()) { setError("Type a message."); return; }
    if (!isWa && !toPhone) { setError("This contact has no phone number."); return; }
    setSending(true); setError(null);
    try {
      const text = renderPersonalized(body, lead);
      if (isWa) {
        await sendWhatsappToLead(funnelId, toLeadId, { body: text });
      } else {
        await sendSms(funnelId, toLeadId, text, fromLineId || undefined);
      }
      setBody("");
      onSent();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to send."); }
    finally { setSending(false); }
  }

  if (isWa && waConnected === false) {
    return <p className="text-[12px] text-ink-muted py-2">WhatsApp isn&apos;t connected. Connect it in Settings → WhatsApp.</p>;
  }

  return (
    <div className="space-y-2.5">
      {!isWa && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium w-12 shrink-0">From</span>
          <NativeSelect value={fromLineId} onChange={(e) => setFromLineId(e.target.value)} className="flex-1 bg-section border border-border-subtle rounded-[8px] px-3 py-1.5 text-[12px] text-ink">
            {lines.length === 0 && <option value="">No active number</option>}
            {lines.map((l) => <option key={l.id} value={l.id}>{l.number}</option>)}
          </NativeSelect>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium w-12 shrink-0">To</span>
        <NativeSelect value={toLeadId} onChange={(e) => setToLeadId(e.target.value)} className="flex-1 bg-section border border-border-subtle rounded-[8px] px-3 py-1.5 text-[12px] text-ink">
          {recipients.length === 0 && <option value="">No contact with a phone number</option>}
          {recipients.map((c) => <option key={c.leadId} value={c.leadId}>{c.name} · {c.phone}</option>)}
        </NativeSelect>
        {((isWa ? waTemplates.length : smsTemplates.length) > 0) && (
          <div className="relative shrink-0">
            <button onClick={() => setShowTpl((v) => !v)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] bg-section border border-border-subtle text-[11px] text-ink-secondary hover:bg-hover"><FileText size={12} /> Template</button>
            {showTpl && (
              <div className="absolute right-0 top-full mt-1 z-30 w-64 max-h-56 overflow-y-auto bg-surface border border-border-subtle rounded-[10px] shadow-lg py-1">
                {isWa
                  ? waTemplates.map((t) => <button key={t.name} onClick={() => { setBody(t.bodyText || ""); setShowTpl(false); }} className="w-full text-left px-3 py-2 hover:bg-hover text-[11px] text-ink truncate">{t.name}</button>)
                  : smsTemplates.map((t) => <button key={t.id} onClick={() => { setBody(t.body || ""); setShowTpl(false); }} className="w-full text-left px-3 py-2 hover:bg-hover text-[11px] text-ink truncate">{t.name}</button>)}
              </div>
            )}
          </div>
        )}
      </div>
      <textarea
        value={body} onChange={(e) => setBody(e.target.value)}
        placeholder={isWa ? "Type a WhatsApp message…" : "Type a text…"}
        rows={3}
        className="w-full bg-section border border-border-subtle rounded-[10px] px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-faint resize-y focus:outline-none focus:border-border-default"
      />
      {error && <p className="text-[11px] text-signal-red-text">{error}</p>}
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] text-ink-faint">{!isWa && `${Math.max(1, Math.ceil(body.length / 160))} segment${body.length > 160 ? "s" : ""}`}</span>
        <button onClick={send} disabled={sending || !body.trim() || recipients.length === 0} className={cn("flex items-center gap-1.5 px-5 py-2 rounded-[20px] text-[12px] font-semibold text-on-ink disabled:opacity-50 transition-colors", isWa ? "bg-signal-green-text hover:opacity-90" : "bg-ink hover:bg-ink/90")}>
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send {isWa ? "WhatsApp" : "text"}
        </button>
      </div>
    </div>
  );
}
