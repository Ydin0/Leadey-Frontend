"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus, PhoneCall, PhoneIncoming, MessageSquare, Calendar } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { getPotentialContacts, convertPotentialContact, type PotentialContact } from "@/lib/api/inbox";
import { listFunnels } from "@/lib/api/funnels";
import { useCallContext } from "@/components/calling/call-context";
import { Modal, ModalHeader } from "@/components/email/modal";

/** Potential Contacts tab — unknown inbound callers/texters not yet in the CRM.
 *  Reps can call them back or convert them into a lead in a campaign. */
export function PotentialContactsInbox() {
  const { startCall } = useCallContext();
  const [contacts, setContacts] = useState<PotentialContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState<PotentialContact | null>(null);

  async function load() {
    setLoading(true);
    try {
      setContacts(await getPotentialContacts());
    } catch {
      /* keep */
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  return (
    <div className="flex-1 flex flex-col rounded-[14px] border border-border-subtle bg-surface overflow-hidden min-h-0">
      <div className="px-3 py-2 border-b border-border-subtle text-[11px] text-ink-muted shrink-0">
        Inbound callers &amp; texters not yet matched to a lead.
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={18} className="animate-spin text-ink-muted" /></div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-6">
            <UserPlus size={20} className="text-ink-faint" />
            <p className="text-[12px] text-ink-muted">No unknown contacts — everyone who reached out is in your CRM.</p>
          </div>
        ) : (
          contacts.map((c) => {
            const handle = c.phone || c.email || "?";
            return (
            <div key={handle} className="group flex items-center gap-3 px-3 py-2.5 border-b border-border-subtle hover:bg-hover/40 transition-colors">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-section text-ink-muted shrink-0 text-[11px] font-semibold">
                {(c.name || handle).slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] text-ink truncate">{c.name || handle}</span>
                  {c.source === "calendly" && (
                    <span className="text-[9px] font-medium uppercase tracking-wide rounded-full px-1.5 py-0.5 bg-signal-blue/15 text-signal-blue-text shrink-0">Calendly</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10.5px] text-ink-muted">
                  {c.name && <span className="truncate">{c.phone || c.email}</span>}
                  {c.calls > 0 && <span className="flex items-center gap-0.5"><PhoneIncoming size={10} />{c.calls}</span>}
                  {c.texts > 0 && <span className="flex items-center gap-0.5"><MessageSquare size={10} />{c.texts}</span>}
                  {c.meetings > 0 && <span className="flex items-center gap-0.5"><Calendar size={10} />{c.meetings}</span>}
                </div>
              </div>
              <span className="text-[10.5px] text-ink-faint shrink-0">{formatRelativeTime(new Date(c.lastAt))}</span>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {c.phone && (
                  <button onClick={() => void startCall(c.phone!, { contactName: c.name || undefined })} title="Call back" className="p-1.5 rounded-md text-ink-faint hover:text-signal-green-text hover:bg-signal-green/10">
                    <PhoneCall size={13} />
                  </button>
                )}
                <button onClick={() => setConverting(c)} title="Add as lead" className="flex items-center gap-1 px-2.5 py-1 rounded-[14px] bg-ink text-on-ink text-[10.5px] font-medium hover:opacity-90">
                  <UserPlus size={11} /> Add as lead
                </button>
              </div>
            </div>
            );
          })
        )}
      </div>

      {converting && (
        <ConvertModal
          contact={converting}
          onClose={() => setConverting(null)}
          onConverted={() => { setConverting(null); void load(); }}
        />
      )}
    </div>
  );
}

function ConvertModal({ contact, onClose, onConverted }: {
  contact: PotentialContact;
  onClose: () => void;
  onConverted: () => void;
}) {
  const [funnels, setFunnels] = useState<{ id: string; name: string }[]>([]);
  const [funnelId, setFunnelId] = useState("");
  const [name, setName] = useState(contact.name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listFunnels()
      .then((fs) => {
        setFunnels(fs.map((f) => ({ id: f.id, name: f.name })));
        setFunnelId((p) => p || fs[0]?.id || "");
      })
      .catch(() => {});
  }, []);

  async function save() {
    if (!funnelId) { setError("Pick a campaign"); return; }
    setSaving(true);
    setError(null);
    try {
      await convertPotentialContact({
        phone: contact.phone || undefined,
        email: contact.email || undefined,
        name: name.trim() || undefined,
        funnelId,
      });
      onConverted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add lead");
      setSaving(false);
    }
  }

  return (
    <Modal onClose={() => (saving ? null : onClose())} maxWidth={420}>
      <ModalHeader title="Add as lead" onClose={() => (saving ? null : onClose())} />
      <div className="p-[18px] space-y-3">
        <p className="text-[11.5px] text-ink-muted">
          Create a lead for <span className="font-medium text-ink">{contact.phone || contact.email}</span> and link their inbound activity.
        </p>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={contact.phone || contact.email || ""}
            className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink focus:outline-none focus:border-border-default" />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Campaign</label>
          <select value={funnelId} onChange={(e) => setFunnelId(e.target.value)}
            className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink focus:outline-none focus:border-border-default">
            {funnels.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        {error && <p className="text-[11.5px] text-signal-red-text">{error}</p>}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover disabled:opacity-50">Cancel</button>
          <button onClick={() => void save()} disabled={saving || !funnelId} className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />} Add lead
          </button>
        </div>
      </div>
    </Modal>
  );
}
