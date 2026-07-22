"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Check, Plus, Trash2, Mail } from "lucide-react";
import { renderPersonalized } from "@/lib/utils/personalize";
import {
  listSignatures, getSignatureDetails, updateSignatureDetails,
  type EmailSignature, type SignatureDetails,
} from "@/lib/api/signatures";
import { listEmailAccounts, updateEmailAccount } from "@/lib/api/email-accounts";
import type { EmailAccount } from "@/lib/types/email-accounts";

/** Effective signature values — an override wins over the profile/org default. */
function effectiveName(d: SignatureDetails) {
  return (d.signatureName || "").trim() || [d.firstName, d.lastName].filter(Boolean).join(" ");
}
function senderCtx(d: SignatureDetails) {
  const name = effectiveName(d);
  const [firstName, ...rest] = name.split(/\s+/);
  return {
    sender: {
      firstName: firstName || "",
      lastName: rest.join(" "),
      email: d.signatureEmail || d.email,
      phone: d.signaturePhone || d.phone,
      title: d.title,
      company: d.signatureCompany || d.companyName || "",
      fields: d.signatureFields,
    },
  };
}

export function SignatureSection() {
  const [details, setDetails] = useState<SignatureDetails | null>(null);
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, sigs, accts] = await Promise.all([getSignatureDetails(), listSignatures(), listEmailAccounts()]);
      setDetails(d);
      setSignatures(sigs);
      setAccounts(accts);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (loading || !details) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-ink-muted" /></div>;
  }

  return (
    <div className="space-y-6">
      <YourDetails details={details} onChange={setDetails} />
      <MailboxSignatures accounts={accounts} signatures={signatures} details={details} onChanged={load} />
    </div>
  );
}

// ── Your details (job title + custom fields) ─────────────────────────
function YourDetails({ details, onChange }: { details: SignatureDetails; onChange: (d: SignatureDetails) => void }) {
  const [title, setTitle] = useState(details.title);
  const [name, setName] = useState(details.signatureName ?? "");
  const [email, setEmail] = useState(details.signatureEmail ?? "");
  const [phone, setPhone] = useState(details.signaturePhone ?? "");
  const [company, setCompany] = useState(details.signatureCompany ?? "");
  const [fields, setFields] = useState<{ key: string; value: string }[]>(
    Object.entries(details.signatureFields || {}).map(([key, value]) => ({ key, value })),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const profileName = [details.firstName, details.lastName].filter(Boolean).join(" ");

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const signatureFields: Record<string, string> = {};
      for (const f of fields) {
        const k = f.key.trim().replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
        if (k) signatureFields[k] = f.value;
      }
      await updateSignatureDetails({
        title, signatureName: name, signatureEmail: email, signaturePhone: phone, signatureCompany: company, signatureFields,
      });
      onChange({
        ...details, title, signatureFields,
        signatureName: name.trim() || null, signatureEmail: email.trim() || null,
        signaturePhone: phone.trim() || null, signatureCompany: company.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
      <h3 className="text-[14px] font-semibold text-ink mb-1">Your signature details</h3>
      <p className="text-[11px] text-ink-muted mb-4">
        These fill the <code className="text-ink-secondary">{"{{sender_*}}"}</code> variables in any signature you use. Leave a field blank to use your profile default (shown as the placeholder) — editing here only changes your signature, not your login.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Field label="Name" value={name} onChange={setName} placeholder={profileName || "Your name"} />
        <Field label="Email" value={email} onChange={setEmail} placeholder={details.email || "you@company.com"} type="email" />
        <Field label="Phone" value={phone} onChange={setPhone} placeholder={details.phone || "+1 555 123 4567"} type="tel" />
        <Field label="Job Title" value={title} onChange={setTitle} placeholder="Account Executive" />
        <Field label="Company" value={company} onChange={setCompany} placeholder={details.companyName || "Company name"} />
      </div>

      <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Custom fields</label>
      <p className="text-[10.5px] text-ink-faint mb-2">Anything else a signature might reference — e.g. a key <code>booking_link</code> becomes <code className="text-ink-secondary">{"{{sender_booking_link}}"}</code>.</p>
      <div className="space-y-2">
        {fields.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={f.key} onChange={(e) => setFields((p) => p.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} placeholder="booking_link"
              className="w-[180px] px-2.5 py-1.5 rounded-[8px] bg-section border border-border-subtle text-[11.5px] text-ink font-mono focus:outline-none focus:border-border-default" />
            <input value={f.value} onChange={(e) => setFields((p) => p.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} placeholder="https://cal.com/you"
              className="flex-1 px-2.5 py-1.5 rounded-[8px] bg-section border border-border-subtle text-[11.5px] text-ink focus:outline-none focus:border-border-default" />
            <button onClick={() => setFields((p) => p.filter((_, j) => j !== i))} className="p-1.5 rounded-md text-ink-muted hover:text-signal-red-text hover:bg-signal-red/10">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <button onClick={() => setFields((p) => [...p, { key: "", value: "" }])} className="inline-flex items-center gap-1.5 text-[11px] text-ink-secondary hover:text-ink">
          <Plus size={12} /> Add field
        </button>
      </div>

      <div className="flex items-center justify-end gap-2 mt-4">
        {saved && <span className="text-[11px] text-signal-green-text">Saved</span>}
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save details
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
      />
    </div>
  );
}

// ── Per-mailbox signature choice ─────────────────────────────────────
const CUSTOM = "__custom__";
const NONE = "__none__";

function MailboxSignatures({ accounts, signatures, details, onChanged }: {
  accounts: EmailAccount[]; signatures: EmailSignature[]; details: SignatureDetails; onChanged: () => void;
}) {
  if (accounts.length === 0) {
    return (
      <div className="bg-surface rounded-[14px] border border-border-subtle p-5 text-center">
        <Mail size={20} className="text-ink-faint mx-auto mb-2" />
        <p className="text-[12px] text-ink-muted">Connect a mailbox in Email Accounts to set a signature.</p>
      </div>
    );
  }
  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
      <h3 className="text-[14px] font-semibold text-ink mb-1">Your signature</h3>
      <p className="text-[11px] text-ink-muted mb-4">Pick a shared team signature or set a custom one per mailbox. Shared signatures fill in your details above automatically.</p>
      <div className="space-y-5">
        {accounts.map((a) => (
          <MailboxRow key={a.id} account={a} signatures={signatures} details={details} onChanged={onChanged} />
        ))}
      </div>
    </div>
  );
}

function MailboxRow({ account, signatures, details, onChanged }: {
  account: EmailAccount; signatures: EmailSignature[]; details: SignatureDetails; onChanged: () => void;
}) {
  const initial = account.signatureId ? account.signatureId : account.signature ? CUSTOM : NONE;
  const [choice, setChoice] = useState(initial);
  const [custom, setCustom] = useState(account.signature || "");
  const [saving, setSaving] = useState(false);

  async function apply(next: string, customHtml?: string) {
    setSaving(true);
    try {
      if (next === NONE) await updateEmailAccount(account.id, { signatureId: null, signature: null });
      else if (next === CUSTOM) await updateEmailAccount(account.id, { signature: customHtml ?? custom });
      else await updateEmailAccount(account.id, { signatureId: next });
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  const previewHtml =
    choice === CUSTOM ? custom
    : choice === NONE ? ""
    : signatures.find((s) => s.id === choice)?.contentHtml || "";

  return (
    <div className="rounded-[12px] border border-border-subtle p-3.5">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <span className="flex items-center gap-2 text-[12px] font-medium text-ink min-w-0">
          <Mail size={13} className="text-ink-muted shrink-0" /> <span className="truncate">{account.email}</span>
          {saving && <Loader2 size={12} className="animate-spin text-ink-muted" />}
        </span>
        <select
          value={choice}
          onChange={(e) => { setChoice(e.target.value); void apply(e.target.value); }}
          className="text-[11.5px] bg-section border border-border-subtle rounded-[8px] px-2.5 py-1.5 text-ink focus:outline-none focus:border-border-default max-w-[220px]"
        >
          <option value={NONE}>No signature</option>
          {signatures.length > 0 && (
            <optgroup label="Shared signatures">
              {signatures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </optgroup>
          )}
          <option value={CUSTOM}>Custom…</option>
        </select>
      </div>

      {choice === CUSTOM && (
        <textarea
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onBlur={() => void apply(CUSTOM, custom)}
          placeholder="Your custom signature (HTML or plain text)…"
          className="w-full min-h-[90px] resize-y font-mono text-[11.5px] px-2.5 py-2 rounded-[8px] bg-section border border-border-subtle text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default mb-2"
        />
      )}

      {choice !== NONE && (
        <div>
          <span className="block text-[9px] uppercase tracking-wider text-ink-faint font-medium mb-1.5">Preview (your details)</span>
          <div className="rounded-[8px] border border-border-subtle bg-page/40 p-3 text-[12px] text-ink [&_img]:max-w-full [&_a]:text-accent [&_table]:max-w-full"
            dangerouslySetInnerHTML={{ __html: renderPersonalized(previewHtml, {}, senderCtx(details)) }}
          />
        </div>
      )}
    </div>
  );
}
