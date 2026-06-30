"use client";

import { useState } from "react";
import { X, Loader2, UserPlus } from "lucide-react";
import { createLeadInFunnel } from "@/lib/api/funnels";

interface NewLeadModalProps {
  funnelId: string;
  /** Pre-fill + lock the company (used by "Add contact" on a lead profile). */
  defaultCompany?: string;
  lockCompany?: boolean;
  onClose: () => void;
  /** Called with the new lead id after a successful create. */
  onCreated: (leadId: string) => void;
}

/** Quick single-lead create — just Company + Contact name. Everything else is
 *  filled in from the (now fully editable) lead profile. */
export function NewLeadModal({ funnelId, defaultCompany, lockCompany, onClose, onCreated }: NewLeadModalProps) {
  const [company, setCompany] = useState(defaultCompany || "");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = company.trim().length > 0 && name.trim().length > 0;

  async function create() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { leadId } = await createLeadInFunnel(funnelId, { company: company.trim(), name: name.trim() });
      onCreated(leadId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lead");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50" onClick={onClose}>
      <div className="relative bg-surface rounded-[14px] border border-border-subtle shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="text-[15px] font-semibold text-ink">New Lead</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-hover transition-colors">
            <X size={16} strokeWidth={1.5} className="text-ink-muted" />
          </button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Company Name</label>
              <input
                autoFocus={!defaultCompany}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={lockCompany}
                placeholder="e.g. Close"
                className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Contact Name</label>
              <input
                autoFocus={!!defaultCompany}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void create(); }}
                placeholder="e.g. Steli Efti"
                className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
              />
            </div>
          </div>
          <p className="text-[11px] text-ink-muted mt-3">
            Add the basics now — you can fill in the domain, LinkedIn, phone, email and more from the lead profile.
          </p>
          {error && <p className="text-[11.5px] text-signal-red-text mt-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-subtle">
          <button onClick={onClose} disabled={saving} className="px-4 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={() => void create()} disabled={!valid || saving} className="flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
            Create Lead
          </button>
        </div>
      </div>
    </div>
  );
}
