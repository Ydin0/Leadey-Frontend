"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive, Clock, Mail, Star, ArrowUpRight, Reply, Forward, Sparkles, FileText,
  Paperclip, Send, X, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { qk } from "@/lib/queries/keys";
import { getEmailThread, aiDraftReply, type EmailThreadSummary, type ThreadPatch } from "@/lib/api/email-threads";
import { listSendingAccounts, sendEmail } from "@/lib/api/email";
import type { SendingAccount } from "@/lib/types/email";
import { listTemplates } from "@/lib/api/templates";
import type { Template } from "@/lib/types/template";
import { uploadTemplateAttachment } from "@/lib/api/templates";
import type { TemplateAttachment } from "@/lib/types/template";
import { renderPersonalized } from "@/lib/utils/personalize";
import type { LeadStatusOption } from "@/lib/utils/lead-status";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { NativeSelect } from "@/components/ui/native-select";
import { AttachmentChips } from "@/components/email/attachment-chips";
import { STATUS_BADGE, messageTime, snoozePresets } from "./shared";

interface ThreadReaderProps {
  leadId: string | null;
  summary: EmailThreadSummary | null;
  statuses: LeadStatusOption[];
  onPatch: (leadId: string, patch: ThreadPatch, msg?: string) => void;
  onClose: () => void;
  showToast: (msg: string) => void;
}

/** Plain text from the reply box → simple paragraph HTML. */
function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export function ThreadReader({ leadId, summary, statuses, onPatch, onClose, showToast }: ThreadReaderProps) {
  const qc = useQueryClient();
  const { data: detail, isPending } = useQuery({
    queryKey: qk.emailThread(leadId || "none"),
    queryFn: () => getEmailThread(leadId!),
    enabled: !!leadId,
  });

  // Parent passes key={leadId}, so switching threads remounts and resets this.
  const [snoozeMenu, setSnoozeMenu] = useState(false);

  if (!leadId || !summary) {
    return (
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center text-center p-10">
        <span className="w-[60px] h-[60px] rounded-[16px] bg-section flex items-center justify-center mb-4">
          <Mail size={25} className="text-ink-muted" />
        </span>
        <div className="text-[15px] font-semibold text-ink">Select a conversation</div>
        <p className="text-[12.5px] text-ink-muted mt-1.5 max-w-[300px]">
          Choose an email from the list to read the thread, see lead context, and reply.
        </p>
      </div>
    );
  }

  const st = statuses.find((s) => s.key === summary.status);
  const toolBtn = "w-8 h-8 flex items-center justify-center rounded-[8px] text-ink-muted hover:bg-hover hover:text-ink transition-colors";

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-0.5">
          <button
            className={toolBtn}
            title={summary.archived ? "Unarchive" : "Archive"}
            onClick={() => { onPatch(leadId, { archived: !summary.archived }, summary.archived ? "Moved to inbox" : "Conversation archived"); onClose(); }}
          >
            <Archive size={15} />
          </button>
          <div className="relative">
            <button className={toolBtn} title="Snooze" onClick={() => setSnoozeMenu((v) => !v)}>
              <Clock size={15} />
            </button>
            {snoozeMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSnoozeMenu(false)} />
                <div className="absolute left-0 top-9 z-50 min-w-[150px] bg-surface border border-border-default rounded-[10px] shadow-lg p-1.5">
                  {snoozePresets().map((p) => (
                    <button
                      key={p.label}
                      onClick={() => {
                        onPatch(leadId, { snoozedUntil: p.until.toISOString() }, `Snoozed until ${p.label.toLowerCase()}`);
                        setSnoozeMenu(false);
                        onClose();
                      }}
                      className="w-full text-left rounded-[7px] px-2.5 py-1.5 text-[12px] text-ink-secondary hover:bg-hover"
                    >
                      {p.label}
                    </button>
                  ))}
                  {summary.snoozedUntil && (
                    <button
                      onClick={() => { onPatch(leadId, { snoozedUntil: null }, "Snooze removed"); setSnoozeMenu(false); }}
                      className="w-full text-left rounded-[7px] px-2.5 py-1.5 text-[12px] text-signal-red-text hover:bg-hover"
                    >
                      Unsnooze
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          <button
            className={toolBtn}
            title="Mark unread"
            onClick={() => { onPatch(leadId, { unread: true }, "Marked unread"); onClose(); }}
          >
            <Mail size={15} />
          </button>
        </div>
        <button
          className={toolBtn}
          title={summary.starred ? "Unstar" : "Star"}
          onClick={() => onPatch(leadId, { starred: !summary.starred })}
        >
          <Star size={15} className={summary.starred ? "text-amber-500 fill-amber-500" : undefined} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5">
        <div className="max-w-[820px]">
          {/* Chips + subject */}
          <div className="flex items-center gap-2 flex-wrap mb-2.5">
            {st && (
              <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5", STATUS_BADGE[st.color])}>
                <span className="w-[5px] h-[5px] rounded-full bg-current" />
                {st.label}
              </span>
            )}
            {summary.funnelName && (
              <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-signal-slate text-signal-slate-text">
                {summary.funnelName}
              </span>
            )}
          </div>
          <h2 className="text-[18px] font-semibold text-ink tracking-[-0.01em] leading-snug">
            {summary.subject || "(no subject)"}
          </h2>

          {/* Lead context strip */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-section/60 border border-border-subtle rounded-[12px] px-4 py-3 mt-4">
            <div className="flex items-center gap-3 min-w-0">
              <MemberAvatar id={summary.leadId} name={summary.leadName} size="lg" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-ink truncate">{summary.leadName}</span>
                </div>
                <span className="text-[11.5px] text-ink-muted block mt-0.5 truncate">
                  {[summary.leadTitle, summary.company].filter(Boolean).join(" · ") || summary.leadEmail}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-5">
              {summary.funnelName && (
                <div className="hidden lg:flex flex-col">
                  <span className="text-[9.5px] uppercase tracking-wider text-ink-faint">Campaign</span>
                  <span className="text-[11.5px] font-medium text-ink mt-0.5 truncate max-w-[140px]">{summary.funnelName}</span>
                </div>
              )}
              {summary.ownerName && (
                <div className="hidden lg:flex flex-col">
                  <span className="text-[9.5px] uppercase tracking-wider text-ink-faint">Owner</span>
                  <span className="flex items-center gap-1.5 mt-0.5">
                    <MemberAvatar id={summary.ownerId || summary.ownerName} name={summary.ownerName} size="xs" />
                    <span className="text-[11.5px] font-medium text-ink">{summary.ownerName.split(" ")[0]}</span>
                  </span>
                </div>
              )}
              {summary.funnelId && (
                <Link
                  href={`/dashboard/funnels/${summary.funnelId}/leads/${summary.leadId}`}
                  className="flex items-center gap-1 rounded-[20px] border border-border-default px-3 py-1.5 text-[11px] font-medium text-ink-secondary hover:bg-hover hover:text-ink transition-colors"
                >
                  Open lead
                  <ArrowUpRight size={12} />
                </Link>
              )}
            </div>
          </div>

          {/* Thread */}
          {isPending ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 size={18} className="animate-spin text-ink-muted" />
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-5">
              {(detail?.messages || []).map((m) => (
                <div key={m.id} className="bg-surface border border-border-subtle rounded-[12px] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MemberAvatar
                        id={m.direction === "outbound" ? m.fromEmail : summary.leadId}
                        name={m.fromName || m.fromEmail}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <span className="text-[12.5px] font-semibold text-ink truncate">{m.fromName || m.fromEmail}</span>
                          <span className="text-[10.5px] text-ink-faint truncate">{m.fromEmail}</span>
                        </div>
                        <span className="text-[10.5px] text-ink-muted">to {m.toEmail || "—"}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[10.5px] text-ink-faint">{messageTime(m.createdAt)}</span>
                      {m.direction === "outbound" && m.openedAt && (
                        <span className="text-[9.5px] text-signal-green-text mt-0.5">Opened</span>
                      )}
                      {m.status === "bounced" && (
                        <span className="text-[9.5px] text-signal-red-text mt-0.5">Bounced</span>
                      )}
                    </div>
                  </div>
                  <div
                    className="mt-3 text-[13px] text-ink-secondary leading-relaxed break-words [&_a]:text-accent [&_a]:underline [&_p]:my-1.5 [&_img]:max-w-full [&_blockquote]:border-l-2 [&_blockquote]:border-border-default [&_blockquote]:pl-3 [&_blockquote]:text-ink-muted"
                    dangerouslySetInnerHTML={{ __html: m.bodyHtml }}
                  />
                  {m.attachments?.length > 0 && (
                    <div className="mt-3.5">
                      <AttachmentChips attachments={m.attachments} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reply composer */}
          {detail && (
            <ReplyBox
              key={leadId}
              summary={summary}
              lead={detail.lead}
              lastInboundFrom={
                [...detail.messages].reverse().find((m) => m.direction === "inbound")?.fromEmail || detail.lead.email
              }
              onSent={() => {
                qc.invalidateQueries({ queryKey: qk.emailThread(leadId) });
                qc.invalidateQueries({ queryKey: qk.emailThreads });
                showToast("Email sent");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Inline reply/forward composer ─────────────────────────────────────
function ReplyBox({
  summary,
  lead,
  lastInboundFrom,
  onSent,
}: {
  summary: EmailThreadSummary;
  lead: { id: string; name: string; email: string; funnelId: string; company: string; title: string };
  lastInboundFrom: string;
  onSent: () => void;
}) {
  const [mode, setMode] = useState<"reply" | "forward">("reply");
  const [accounts, setAccounts] = useState<SendingAccount[]>([]);
  const [fromId, setFromId] = useState("");
  const [forwardTo, setForwardTo] = useState("");
  const [text, setText] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [attachments, setAttachments] = useState<TemplateAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listSendingAccounts()
      .then((a) => {
        setAccounts(a);
        if (a.length) setFromId((prev) => prev || a[0].id);
      })
      .catch(() => {});
    listTemplates("email").then(setTemplates).catch(() => {});
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const up: TemplateAttachment[] = [];
      for (const f of Array.from(files)) up.push(await uploadTemplateAttachment(f, null));
      setAttachments((p) => [...p, ...up]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Attachment upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleAiDraft() {
    setDrafting(true);
    setError(null);
    try {
      setText(await aiDraftReply(lead.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI draft failed");
    } finally {
      setDrafting(false);
    }
  }

  async function handleSend() {
    const toEmail = mode === "forward" ? forwardTo.trim() : lastInboundFrom;
    if (!toEmail || !/.+@.+\..+/.test(toEmail)) {
      setError(mode === "forward" ? "Enter a valid forward address." : "This lead has no email address.");
      return;
    }
    if (!fromId) { setError("Connect a mailbox in Settings → Email Accounts first."); return; }
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const base = summary.subject || "";
      const subject =
        mode === "forward"
          ? (base.startsWith("Fwd:") ? base : `Fwd: ${base}`)
          : base
            ? (base.startsWith("Re:") ? base : `Re: ${base}`)
            : `Re: your conversation with ${lead.name}`;
      const bodyHtml = renderPersonalized(textToHtml(text), lead);
      await sendEmail({
        leadId: lead.id,
        funnelId: lead.funnelId,
        fromAccountId: fromId,
        toEmail,
        subject,
        bodyHtml,
        attachmentIds: attachments.map((a) => a.id),
      });
      setText("");
      setAttachments([]);
      setForwardTo("");
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  const fromAccount = accounts.find((a) => a.id === fromId);
  const modeBtn = (m: "reply" | "forward", label: string, Icon: typeof Reply) => (
    <button
      onClick={() => setMode(m)}
      className={cn(
        "flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[12px] font-medium transition-colors",
        mode === m ? "bg-section text-ink" : "text-ink-muted hover:text-ink-secondary",
      )}
    >
      <Icon size={13} />
      {label}
    </button>
  );

  return (
    <div className="bg-surface border border-border-subtle rounded-[12px] mt-4 overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border-subtle flex-wrap gap-2">
        <div className="flex items-center gap-0.5">
          {modeBtn("reply", "Reply", Reply)}
          {modeBtn("forward", "Forward", Forward)}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAiDraft}
            disabled={drafting}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-signal-blue-text bg-signal-blue rounded-full px-3 py-1.5 hover:brightness-110 transition disabled:opacity-60"
          >
            {drafting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {drafting ? "Drafting…" : "Draft with AI"}
          </button>
          {templates.length > 0 && (
            <button
              onClick={() => setTemplatesOpen((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[11px] transition-colors",
                templatesOpen ? "bg-section text-ink" : "text-ink-secondary hover:bg-hover",
              )}
            >
              <FileText size={13} />
              Templates
            </button>
          )}
        </div>
      </div>

      {templatesOpen && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-border-subtle flex-wrap bg-page/50">
          {templates.slice(0, 8).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setText(t.body || "");
                setTemplatesOpen(false);
              }}
              className="rounded-full border border-border-subtle px-3 py-1.5 text-[11px] text-ink-secondary hover:bg-hover hover:text-ink transition-colors"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {mode === "forward" && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border-subtle">
          <span className="text-[11.5px] text-ink-muted shrink-0">To</span>
          <input
            value={forwardTo}
            onChange={(e) => setForwardTo(e.target.value)}
            placeholder="name@company.com"
            className="bg-transparent outline-none text-[12.5px] text-ink placeholder:text-ink-faint w-full"
          />
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={mode === "forward" ? "Add a note, then send…" : `Write a reply to ${lead.name.split(" ")[0]}…`}
        className="w-full min-h-[110px] resize-y bg-transparent outline-none text-[13px] text-ink placeholder:text-ink-faint leading-relaxed px-4 py-3.5"
      />

      {attachments.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap px-3.5 pb-2">
          {attachments.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1.5 max-w-full pl-2.5 pr-1.5 py-1 rounded-full bg-section border border-border-subtle text-[11px] text-ink">
              <Paperclip size={11} className="text-ink-muted shrink-0" />
              <span className="truncate max-w-[180px]">{a.fileName}</span>
              <button
                onClick={() => setAttachments((p) => p.filter((x) => x.id !== a.id))}
                className="p-0.5 rounded-full hover:bg-hover text-ink-muted hover:text-ink"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {error && <p className="text-[11.5px] text-signal-red-text px-4 pb-2">{error}</p>}

      <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-border-subtle flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Attach files"
            className="w-[30px] h-[30px] flex items-center justify-center rounded-[8px] text-ink-muted hover:bg-hover hover:text-ink transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
          </button>
          {accounts.length > 1 ? (
            <NativeSelect
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              className="text-[11px] bg-transparent border border-border-subtle rounded-[8px] px-2 py-1.5 text-ink-secondary max-w-[220px]"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.email}</option>
              ))}
            </NativeSelect>
          ) : fromAccount ? (
            <span className="text-[11px] text-ink-faint truncate">from {fromAccount.email}</span>
          ) : null}
          {fromAccount?.signature && (
            <span className="hidden sm:block text-[10.5px] text-ink-faint">· Signature added automatically</span>
          )}
        </div>
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="flex items-center gap-1.5 bg-ink text-on-ink rounded-[20px] px-4 py-2 text-[12px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
