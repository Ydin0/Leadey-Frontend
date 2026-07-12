"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Loader2, X, Video, MapPin, AlertTriangle } from "lucide-react";
import { SlideOver } from "@/components/shared/slide-over";
import { DateTimePicker } from "@/components/shared/date-time-picker";
import { TagInput } from "@/components/shared/tag-input";
import { NativeSelect } from "@/components/ui/native-select";
import { listOrgEmailAccounts } from "@/lib/api/email-accounts";
import type { OrgEmailAccount } from "@/lib/types/email-accounts";
import { bookMeeting } from "@/lib/api/meetings";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  extraEmails?: { label: string; value: string }[];
}

interface BookMeetingModalProps {
  open: boolean;
  onClose: () => void;
  funnelId: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  company: string;
  contacts: Contact[];
  onBooked: () => void;
}

const DURATIONS = [15, 30, 45, 60, 90];

export function BookMeetingModal({ open, onClose, funnelId, leadId, leadName, leadEmail, company, contacts, onBooked }: BookMeetingModalProps) {
  // The modal is conditionally mounted (fresh each open), so initial state can
  // seed straight from props — no reset-on-open effect needed.
  const [accounts, setAccounts] = useState<OrgEmailAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [hostId, setHostId] = useState("");
  const [title, setTitle] = useState(() => (company ? `${company} <> intro` : `Meeting with ${leadName}`));
  const [description, setDescription] = useState("");
  const [startISO, setStartISO] = useState<string | null>(null);
  const [durationMin, setDurationMin] = useState(30);
  const [video, setVideo] = useState(true);
  const [location, setLocation] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(leadEmail ? [leadEmail] : []));
  const [guests, setGuests] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Candidate invitee emails: the lead + every contact at the company + their
  // labeled extra emails, de-duplicated.
  const inviteeOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: { email: string; label: string }[] = [];
    const add = (email: string | null | undefined, label: string) => {
      const e = (email || "").trim();
      if (!e || seen.has(e.toLowerCase())) return;
      seen.add(e.toLowerCase());
      out.push({ email: e, label });
    };
    add(leadEmail, leadName);
    for (const c of contacts) {
      add(c.email, c.name);
      for (const x of c.extraEmails ?? []) add(x.value, `${c.name} · ${x.label}`);
    }
    return out;
  }, [leadEmail, leadName, contacts]);

  // Load the org's mailboxes on mount and default to a calendar-capable host.
  useEffect(() => {
    let alive = true;
    listOrgEmailAccounts()
      .then((accts) => {
        if (!alive) return;
        const active = accts.filter((a) => a.status === "active");
        setAccounts(active);
        setHostId(active.find((a) => a.canSchedule)?.id || "");
      })
      .catch(() => { if (alive) setAccounts([]); })
      .finally(() => { if (alive) setLoadingAccounts(false); });
    return () => { alive = false; };
  }, []);

  const host = accounts.find((a) => a.id === hostId);
  const capableAccounts = accounts.filter((a) => a.canSchedule);

  function toggle(email: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email); else next.add(email);
      return next;
    });
  }

  async function submit() {
    setError(null);
    if (!host || !host.canSchedule) { setError("Pick a host with a calendar-connected mailbox."); return; }
    if (!startISO) { setError("Choose a date & time."); return; }
    const inviteeEmails = [...selected];
    if (inviteeEmails.length === 0 && guests.length === 0) { setError("Add at least one invitee."); return; }
    setSubmitting(true);
    try {
      await bookMeeting(funnelId, leadId, {
        hostAccountId: host.id,
        title: title.trim() || "Meeting",
        description: description.trim() || undefined,
        startISO,
        durationMin,
        inviteeEmails,
        guestEmails: guests,
        video,
        location: !video ? location.trim() || undefined : undefined,
      });
      onBooked();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not book the meeting.");
      setSubmitting(false);
    }
  }

  const videoLabel = host?.provider === "outlook" ? "Microsoft Teams" : "Google Meet";

  return (
    <SlideOver open={open} onClose={onClose} width="max-w-lg">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle shrink-0">
          <h2 className="text-[15px] font-semibold text-ink flex items-center gap-2">
            <CalendarPlus size={16} className="text-signal-blue-text" /> Book meeting
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-ink-muted hover:bg-hover hover:text-ink"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Host */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Host (whose calendar)</label>
            {loadingAccounts ? (
              <div className="flex items-center gap-2 text-[12px] text-ink-muted py-2"><Loader2 size={13} className="animate-spin" /> Loading mailboxes…</div>
            ) : capableAccounts.length === 0 ? (
              <div className="rounded-[10px] border border-border-subtle bg-section/50 p-3 text-[11.5px] text-ink-muted flex items-start gap-2">
                <AlertTriangle size={14} className="text-signal-amber-text shrink-0 mt-0.5" />
                No calendar-connected mailbox yet. Connect (or reconnect) a Google/Outlook account in <span className="text-ink-secondary">Settings → Email Accounts</span> — it will ask for calendar access so it can host meetings.
              </div>
            ) : (
              <NativeSelect value={hostId} onChange={(e) => setHostId(e.target.value)} className="w-full">
                {capableAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.ownerName ? `${a.ownerName} · ${a.email}` : a.email}</option>
                ))}
              </NativeSelect>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[12.5px] text-ink focus:outline-none focus:border-border-default" />
          </div>

          {/* When */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Date & time</label>
              <DateTimePicker value={startISO} onChange={setStartISO} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Duration</label>
              <NativeSelect value={String(durationMin)} onChange={(e) => setDurationMin(Number(e.target.value))} className="w-full">
                {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
              </NativeSelect>
            </div>
          </div>

          {/* Invitees */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Invite from this company</label>
            {inviteeOptions.length === 0 ? (
              <p className="text-[11.5px] text-ink-faint">This lead has no email — add a guest below.</p>
            ) : (
              <div className="space-y-1">
                {inviteeOptions.map((o) => (
                  <label key={o.email} className="flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] border border-border-subtle hover:bg-hover cursor-pointer">
                    <input type="checkbox" checked={selected.has(o.email)} onChange={() => toggle(o.email)} className="accent-signal-blue-text" />
                    <span className="text-[12px] text-ink truncate">{o.label}</span>
                    <span className="ml-auto text-[10.5px] text-ink-faint truncate max-w-[45%]">{o.email}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Custom guests */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Add guests</label>
            <TagInput tags={guests} onChange={setGuests} placeholder="guest@company.com, press Enter" />
          </div>

          {/* Video / location */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button type="button" onClick={() => setVideo(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[11px] font-medium border transition-colors ${video ? "bg-signal-blue text-signal-blue-text border-transparent" : "bg-surface text-ink-secondary border-border-subtle hover:bg-hover"}`}>
                <Video size={13} /> {videoLabel}
              </button>
              <button type="button" onClick={() => setVideo(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[11px] font-medium border transition-colors ${!video ? "bg-section text-ink border-border-default" : "bg-surface text-ink-secondary border-border-subtle hover:bg-hover"}`}>
                <MapPin size={13} /> In person
              </button>
            </div>
            {!video && (
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (address or note)"
                className="w-full px-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[12px] text-ink focus:outline-none focus:border-border-default" />
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Notes (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              placeholder="Agenda or context — included in the invite."
              className="w-full px-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[12px] text-ink resize-y focus:outline-none focus:border-border-default" />
          </div>

          {error && <p className="text-[12px] text-signal-red-text">{error}</p>}
        </div>

        <div className="px-5 py-3.5 border-t border-border-subtle shrink-0 flex items-center justify-between gap-3">
          <span className="text-[11px] text-ink-faint">Invites go to everyone with a {video ? videoLabel : "location"} link.</span>
          <button onClick={submit} disabled={submitting || capableAccounts.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-signal-blue text-signal-blue-text text-[12px] font-semibold hover:bg-signal-blue/80 disabled:opacity-50 transition-colors">
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <CalendarPlus size={13} />}
            {submitting ? "Booking…" : "Send invite"}
          </button>
        </div>
      </div>
    </SlideOver>
  );
}
