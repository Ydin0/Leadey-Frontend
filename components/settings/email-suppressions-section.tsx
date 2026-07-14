"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Ban, Loader2, Plus, Search, ShieldX, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  addSuppression,
  deleteSuppression,
  getSuppressions,
  type EmailSuppression,
} from "@/lib/api/email-suppressions";

const REASON_META: Record<EmailSuppression["reason"], { label: string; className: string }> = {
  unsubscribe: { label: "Unsubscribed", className: "bg-signal-slate text-signal-slate-text" },
  bounce: { label: "Bounced", className: "bg-signal-red text-signal-red-text" },
  complaint: { label: "Complaint", className: "bg-signal-amber text-signal-amber-text" },
  manual: { label: "Manual", className: "bg-signal-blue text-signal-blue-text" },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ReasonBadge({ reason }: { reason: EmailSuppression["reason"] }) {
  const m = REASON_META[reason] ?? REASON_META.manual;
  return <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0", m.className)}>{m.label}</span>;
}

function SuppressionRow({ row, onRemoved }: { row: EmailSuppression; onRemoved: (id: string) => void }) {
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(`Remove ${row.email} from the suppression list? Emails to this address will be allowed again.`)) return;
    setBusy(true);
    try {
      await deleteSuppression(row.id);
      onRemoved(row.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="group flex items-center gap-2.5 px-3 py-2 rounded-[10px] border border-border-subtle bg-section/40">
      <span className="flex-1 min-w-0 truncate text-[12.5px] text-ink">{row.email}</span>
      {row.leadId ? (
        <Link
          href={`/dashboard/leads/${row.leadId}`}
          className="text-[11px] text-ink-muted hover:text-signal-blue-text truncate max-w-[140px] shrink-0"
          title={row.leadName || "View lead"}
        >
          {row.leadName || "View lead"}
        </Link>
      ) : (
        <span className="text-[11px] text-ink-faint shrink-0">—</span>
      )}
      <ReasonBadge reason={row.reason} />
      <span className="text-[10.5px] text-ink-faint w-24 text-right shrink-0">
        {new Date(row.createdAt).toLocaleDateString()}
      </span>
      {busy ? (
        <Loader2 size={13} className="animate-spin text-ink-muted shrink-0" />
      ) : (
        <button
          type="button"
          onClick={() => void remove()}
          title="Remove from list"
          className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-signal-red-text transition-all shrink-0"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

export function EmailSuppressionsSection() {
  const [rows, setRows] = useState<EmailSuppression[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const reqId = useRef(0);

  const load = useCallback(async (q: string) => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const data = await getSuppressions(q);
      if (id === reqId.current) setRows(data);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  // Load on mount and (debounced) whenever the search term changes.
  useEffect(() => {
    const t = setTimeout(() => void load(search), search ? 250 : 0);
    return () => clearTimeout(t);
  }, [search, load]);

  async function add() {
    const email = newEmail.trim().toLowerCase();
    if (!email || adding) return;
    if (!EMAIL_RE.test(email)) { setAddError("Enter a valid email address"); return; }
    setAdding(true);
    setAddError(null);
    try {
      await addSuppression(email);
      setNewEmail("");
      await load(search);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not add address");
    } finally {
      setAdding(false);
    }
  }

  return (
    <section className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="mb-4 flex items-start gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-section shrink-0">
          <ShieldX size={15} className="text-ink-muted" />
        </div>
        <div>
          <h3 className="text-[13px] font-semibold text-ink">Email Suppression List</h3>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Addresses that will never receive email from your org. People are added automatically
            when they unsubscribe, reply “stop”, hard-bounce, or file a spam complaint — and any
            active workflow enrollment is exited. Remove an address to allow emails again.
          </p>
        </div>
      </div>

      {/* Add row */}
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] border border-dashed border-border-default mb-3">
        <Ban size={14} className="text-ink-faint shrink-0" />
        <input
          type="email"
          value={newEmail}
          onChange={(e) => { setNewEmail(e.target.value); setAddError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") void add(); }}
          placeholder="Add an address to suppress…"
          className="flex-1 min-w-0 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-faint"
        />
        {addError && <span className="text-[10px] text-signal-red-text shrink-0">{addError}</span>}
        <button
          type="button"
          onClick={() => void add()}
          disabled={!newEmail.trim() || adding}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink text-on-ink text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
        >
          {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={2} />}
          Suppress
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] border border-border-subtle bg-section/40 mb-2">
        <Search size={13} className="text-ink-faint shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search addresses…"
          className="flex-1 min-w-0 bg-transparent text-[12px] text-ink outline-none placeholder:text-ink-faint"
        />
        {loading && <Loader2 size={13} className="animate-spin text-ink-muted shrink-0" />}
      </div>

      {loading && rows.length === 0 ? (
        <div className="flex items-center gap-2 text-[12px] text-ink-muted py-4">
          <Loader2 size={14} className="animate-spin" /> Loading suppression list…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-[12px] text-ink-muted px-1 py-6 text-center">
          {search ? "No addresses match your search." : "No suppressed addresses. Unsubscribes and bounces will appear here automatically."}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <SuppressionRow key={r.id} row={r} onRemoved={(id) => setRows((prev) => prev.filter((x) => x.id !== id))} />
          ))}
        </div>
      )}
    </section>
  );
}
