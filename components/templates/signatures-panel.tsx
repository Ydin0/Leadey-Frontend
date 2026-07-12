"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, Signature, ArrowLeft, Check } from "lucide-react";
import { renderPersonalized } from "@/lib/utils/personalize";
import { SIGNATURE_VARIABLES } from "@/lib/types/template";
import {
  listSignatures, createSignature, updateSignature, deleteSignature,
  getSignatureDetails, type EmailSignature, type SignatureDetails,
} from "@/lib/api/signatures";
import { invalidateSignatureCache } from "@/components/shared/signature-picker";

/** Sample sender for the preview when the author has no details filled in. */
const SAMPLE: SignatureDetails = {
  firstName: "Jane", lastName: "Smith", email: "jane@acme.com",
  phone: "+44 7893 952310", title: "Account Executive", signatureFields: { booking_link: "https://cal.com/jane" },
};

/** Build the sender ctx for a live preview from the author's own details. */
function senderCtx(d: SignatureDetails | null) {
  const s = d && (d.firstName || d.email) ? d : SAMPLE;
  return {
    sender: {
      firstName: s.firstName, lastName: s.lastName, email: s.email,
      phone: s.phone, title: s.title, company: "", fields: s.signatureFields,
    },
  };
}

export function SignaturesPanel() {
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<SignatureDetails | null>(null);
  const [editing, setEditing] = useState<EmailSignature | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sigs, d] = await Promise.all([listSignatures(), getSignatureDetails().catch(() => null)]);
      setSignatures(sigs);
      setDetails(d);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={20} className="animate-spin text-ink-muted" /></div>;
  }

  if (editing) {
    return (
      <SignatureEditor
        signature={editing === "new" ? null : editing}
        details={details}
        onBack={() => setEditing(null)}
        onSaved={() => { setEditing(null); void load(); }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[12px] text-ink-muted">
          Shared signatures used across the team. Variables like <code className="text-ink-secondary">{"{{sender_full_name}}"}</code> fill each rep&apos;s own details automatically.
        </p>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors shrink-0"
        >
          <Plus size={14} strokeWidth={2} /> New signature
        </button>
      </div>

      {signatures.length === 0 ? (
        <div className="py-16 text-center">
          <Signature size={22} className="text-ink-faint mx-auto mb-2.5" />
          <p className="text-[13px] font-medium text-ink">No signatures yet</p>
          <p className="text-[12px] text-ink-muted mt-1">Create a shared signature the whole team can use — with each rep&apos;s details auto-filled.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {signatures.map((s) => (
            <div key={s.id} className="group rounded-[14px] border border-border-subtle bg-surface overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
                <span className="text-[12.5px] font-semibold text-ink truncate">{s.name}</span>
                <button onClick={() => setEditing(s)} className="p-1.5 rounded-md text-ink-muted hover:bg-hover hover:text-ink transition-colors" title="Edit">
                  <Pencil size={13} />
                </button>
              </div>
              <div
                className="px-4 py-3 text-[12px] text-ink-secondary max-h-[160px] overflow-hidden [&_img]:max-w-full [&_a]:text-accent"
                dangerouslySetInnerHTML={{ __html: renderPersonalized(s.contentHtml, {}, senderCtx(details)) }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SignatureEditor({ signature, details, onBack, onSaved }: {
  signature: EmailSignature | null;
  details: SignatureDetails | null;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(signature?.name || "");
  const [html, setHtml] = useState(signature?.contentHtml || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  function insertVar(token: string) {
    const ta = taRef.current;
    if (!ta) { setHtml((h) => h + token); return; }
    const start = ta.selectionStart ?? html.length;
    const end = ta.selectionEnd ?? html.length;
    const next = html.slice(0, start) + token + html.slice(end);
    setHtml(next);
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + token.length; });
  }

  async function insertCustomField() {
    const key = window.prompt("Custom field key (e.g. booking_link, pronouns):", "");
    if (!key) return;
    const clean = key.trim().replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
    if (clean) insertVar(`{{sender_${clean}}}`);
  }

  async function save() {
    if (!name.trim()) { setError("Give the signature a name."); return; }
    setSaving(true);
    setError(null);
    try {
      if (signature) await updateSignature(signature.id, { name: name.trim(), contentHtml: html });
      else await createSignature({ name: name.trim(), contentHtml: html });
      invalidateSignatureCache();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  }

  async function remove() {
    if (!signature) return;
    if (!confirm(`Delete "${signature.name}"? Mailboxes using it will fall back to no signature.`)) return;
    setSaving(true);
    try { await deleteSignature(signature.id); invalidateSignatureCache(); onSaved(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to delete"); setSaving(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] text-ink-secondary hover:text-ink">
          <ArrowLeft size={14} /> Back to signatures
        </button>
        <div className="flex items-center gap-2">
          {signature && (
            <button onClick={remove} disabled={saving} className="p-2 rounded-[16px] text-ink-muted hover:text-signal-red-text hover:bg-signal-red/10 transition-colors" title="Delete">
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save signature
          </button>
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Company standard"
          className="w-full max-w-[360px] px-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[12.5px] text-ink focus:outline-none focus:border-border-default" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor */}
        <div>
          <div className="flex items-center gap-1 flex-wrap mb-2">
            <span className="text-[9px] uppercase tracking-wider text-ink-faint font-medium mr-1">Insert:</span>
            {SIGNATURE_VARIABLES.map((v) => (
              <button key={v.key} type="button" onClick={() => insertVar(`{{${v.key}}}`)}
                className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-signal-blue/10 text-signal-blue-text hover:bg-signal-blue/20 transition-colors">
                {v.label}
              </button>
            ))}
            <button type="button" onClick={insertCustomField}
              className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-signal-slate/15 text-signal-slate-text hover:bg-signal-slate/25 transition-colors">
              + Custom field
            </button>
          </div>
          <textarea
            ref={taRef}
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder={"Paste your HTML signature or type plain text.\n\nBest,\n{{sender_full_name}}\n{{sender_title}} · {{sender_company}}\n{{sender_phone}}"}
            className="w-full min-h-[280px] resize-y font-mono text-[12px] leading-relaxed px-3 py-2.5 rounded-[10px] bg-section border border-border-subtle text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
          />
          <p className="text-[10.5px] text-ink-faint mt-1.5">
            Full HTML is supported (logos, tables, links). Variables render to each rep&apos;s own details at send time.
          </p>
        </div>

        {/* Live preview */}
        <div>
          <span className="block text-[9px] uppercase tracking-wider text-ink-faint font-medium mb-2">Preview{details && (details.firstName || details.email) ? " (your details)" : " (sample)"}</span>
          <div className="rounded-[10px] border border-border-subtle bg-surface p-4 min-h-[280px] text-[12.5px] text-ink [&_img]:max-w-full [&_a]:text-accent [&_table]:max-w-full"
            dangerouslySetInnerHTML={{ __html: renderPersonalized(html || "<span style='color:#94a3b8'>Nothing to preview yet…</span>", {}, senderCtx(details)) }}
          />
        </div>
      </div>

      {error && <p className="text-[12px] text-signal-red-text mt-3">{error}</p>}
    </div>
  );
}
