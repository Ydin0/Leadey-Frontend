"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { CalendarPlus, Loader2, X, Video, ChevronLeft, ChevronRight, Clock, Globe, Check, CheckCircle2, ExternalLink, Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { NativeSelect } from "@/components/ui/native-select";
import { TagInput } from "@/components/shared/tag-input";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { TimezoneSelect } from "@/components/shared/timezone-select";
import { guessLeadTimezone } from "@/lib/utils/lead-timezone";
import { browserTimezone } from "@/lib/utils/timezones";
import { monthGrid, dateKey, dateKeyInTz, timeInTz, groupSlotsByTz, CAL_WEEKDAYS, CAL_MONTHS } from "@/lib/utils/booking-calendar";
import { listAllBookingPages, getPageAvailability, type BookingPageSummary } from "@/lib/api/booking-pages";
import { bookMeeting, type BookedMeeting } from "@/lib/api/meetings";
import type { FunnelLead } from "@/lib/types/funnel";

interface Contact { id: string; name: string; email: string | null; extraEmails?: { label: string; value: string }[] }
interface BookMeetingModalProps {
  open: boolean;
  onClose: () => void;
  funnelId: string;
  leadId: string;
  lead: FunnelLead;
  contacts: Contact[];
  onBooked: () => void;
}

export function BookMeetingModal({ open, onClose, funnelId, leadId, lead, contacts, onBooked }: BookMeetingModalProps) {
  const [pages, setPages] = useState<BookingPageSummary[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const [selection, setSelection] = useState(""); // selected pageId

  const [displayTz, setDisplayTz] = useState(() => guessLeadTimezone(lead) || browserTimezone());
  const [view, setView] = useState(() => { const n = new Date(); return { y: n.getUTCFullYear(), m: n.getUTCMonth() }; });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [availByDate, setAvailByDate] = useState<Map<string, string[]>>(new Map());
  const [availMeta, setAvailMeta] = useState({ durationMin: 30, video: true });
  const [hostsBySlot, setHostsBySlot] = useState<Record<string, string[]>>({});
  const [hostNameById, setHostNameById] = useState<Map<string, string>>(new Map());
  const [hostIssues, setHostIssues] = useState<{ userId: string; name: string; reason: "no-account" | "no-calendar" }[]>([]);
  const [loadingAvail, setLoadingAvail] = useState(false);

  const [title, setTitle] = useState("Meeting");
  const [inviteeName, setInviteeName] = useState(lead.name || "");
  const [inviteeEmail, setInviteeEmail] = useState(lead.email || "");
  const [guests, setGuests] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<BookedMeeting | null>(null);

  const selectedPage = pages.find((p) => p.id === selection);
  const meta = { durationMin: selectedPage?.durationMin ?? availMeta.durationMin, video: selectedPage?.video ?? availMeta.video };

  useEffect(() => {
    let alive = true;
    listAllBookingPages()
      .then((ps) => { if (!alive) return; setPages(ps); if (ps[0]) { setSelection(ps[0].id); setTitle(ps[0].name); } })
      .catch(() => setPages([]))
      .finally(() => { if (alive) setLoadingPages(false); });
    return () => { alive = false; };
  }, []);

  const guestSuggestions = useMemo(() => {
    const s = new Set<string>();
    for (const c of contacts) { if (c.email) s.add(c.email); for (const x of c.extraEmails ?? []) s.add(x.value); }
    return [...s];
  }, [contacts]);

  const loadAvailability = useCallback(async (y: number, m: number) => {
    if (!selection) return;
    setLoadingAvail(true);
    const cells = monthGrid(y, m);
    const todayKey = dateKeyInTz(new Date().toISOString(), displayTz);
    const from = [dateKey(cells[0]), todayKey].sort()[1];
    const to = dateKey(cells[41]);
    try {
      const res = await getPageAvailability(selection, from, to);
      setAvailMeta({ durationMin: res.durationMin, video: res.video });
      setAvailByDate(groupSlotsByTz(res.days.flatMap((d) => d.slots), displayTz));
      setHostsBySlot(res.hostsBySlot || {});
      setHostNameById(new Map((res.hosts || []).map((h) => [h.userId, h.name])));
      setHostIssues(res.hostIssues || []);
    } catch {
      setAvailByDate(new Map());
      setHostsBySlot({});
      setHostIssues([]);
    } finally {
      setLoadingAvail(false);
    }
  }, [displayTz, selection]);

  useEffect(() => {
    if (loadingPages || !selection) return;
    setSelectedDate(null); setSelectedSlot(null);
    void loadAvailability(view.y, view.m);
  }, [loadingPages, selection, view.y, view.m, loadAvailability]);

  const cells = useMemo(() => monthGrid(view.y, view.m), [view]);
  const todayKey = dateKeyInTz(new Date().toISOString(), displayTz);
  const daySlots = selectedDate ? (availByDate.get(selectedDate) || []) : [];

  function pickPage(id: string) {
    setSelection(id);
    setTitle(pages.find((x) => x.id === id)?.name || "Meeting");
  }

  async function submit() {
    setError(null);
    if (!selectedSlot) { setError("Pick a time slot."); return; }
    const email = inviteeEmail.trim();
    if (!email && guests.length === 0) { setError("Add an invitee email."); return; }
    setSubmitting(true);
    try {
      const result = await bookMeeting(funnelId, leadId, {
        bookingPageId: selection,
        startISO: selectedSlot,
        title: title.trim() || selectedPage?.name || "Meeting",
        description: notes.trim() || undefined,
        inviteeEmails: email ? [email] : [],
        guestEmails: guests,
      });
      onBooked();
      setConfirmed(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not book the meeting.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const overlay = (children: React.ReactNode, wide = true) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className={cn("bg-surface rounded-[16px] border border-border-subtle shadow-2xl w-full flex overflow-hidden", wide ? "max-w-5xl max-h-[88vh]" : "max-w-md")} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );

  if (confirmed) {
    const whenLabel = `${new Intl.DateTimeFormat("en-US", { timeZone: displayTz, weekday: "long", month: "long", day: "numeric" }).format(new Date(confirmed.startTime))} · ${timeInTz(confirmed.startTime, displayTz)}–${timeInTz(confirmed.endTime, displayTz)}`;
    const attendees = [inviteeEmail.trim(), ...guests].filter(Boolean);
    return overlay(
      <div className="flex-1 flex flex-col items-center text-center px-8 py-10">
        <span className="flex items-center justify-center w-14 h-14 rounded-full bg-signal-green/15 text-signal-green-text mb-4"><CheckCircle2 size={30} /></span>
        <h2 className="text-[18px] font-semibold text-ink">You&apos;re booked</h2>
        <p className="text-[13px] text-ink-muted mt-1">Calendar invites are on their way to everyone.</p>
        <div className="mt-6 w-full max-w-[380px] rounded-[12px] border border-border-subtle bg-section/40 p-4 text-left space-y-2.5">
          <p className="text-[14px] font-semibold text-ink">{confirmed.title}</p>
          <p className="text-[12px] text-ink-secondary inline-flex items-center gap-1.5"><Clock size={13} className="text-ink-muted" /> {whenLabel}</p>
          <p className="text-[11px] text-ink-faint">{displayTz.replace(/_/g, " ")}</p>
          {attendees.length > 0 && <p className="text-[12px] text-ink-secondary inline-flex items-start gap-1.5"><Users size={13} className="text-ink-muted mt-0.5" /> {attendees.join(", ")}</p>}
          {confirmed.joinUrl && (
            <a href={confirmed.joinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-signal-blue-text hover:underline pt-1 break-all">
              <Video size={13} /> {confirmed.joinUrl} <ExternalLink size={11} />
            </a>
          )}
        </div>
        <button onClick={onClose} className="mt-6 px-6 py-2.5 rounded-[12px] bg-ink text-on-ink text-[13px] font-semibold hover:bg-ink/90 transition-colors">Done</button>
      </div>,
      false,
    );
  }

  if (loadingPages) return overlay(<div className="flex-1 flex items-center justify-center py-24"><Loader2 size={22} className="animate-spin text-ink-muted" /></div>);
  if (pages.length === 0) {
    return overlay(
      <div className="flex-1 flex flex-col items-center justify-center text-center py-24 px-8">
        <CalendarPlus size={22} className="text-ink-muted mb-3" />
        <p className="text-[13px] font-medium text-ink">No booking pages yet</p>
        <p className="text-[12px] text-ink-muted mt-1 max-w-[360px]">Create one in Settings → Booking Pages (and connect a Google/Outlook mailbox) to start booking meetings.</p>
        <button onClick={onClose} className="mt-5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[12px] font-medium">Close</button>
      </div>,
      false,
    );
  }

  return overlay(
    <>
      {/* ── Left: details ── */}
      <div className="w-[360px] shrink-0 border-r border-border-subtle flex flex-col">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <span className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold">Meeting details</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full text-[17px] font-semibold text-ink bg-transparent border-0 border-b border-transparent hover:border-border-subtle focus:border-border-default focus:outline-none pb-1" />
          <div className="flex items-center gap-3 text-[12px] text-ink-secondary">
            <span className="inline-flex items-center gap-1.5"><Clock size={13} className="text-ink-muted" /> {meta.durationMin} min</span>
            {meta.video && <span className="inline-flex items-center gap-1.5 text-signal-blue-text"><Video size={13} /> Video</span>}
          </div>

          <div className="h-px bg-border-subtle" />

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Booking page</label>
            <NativeSelect value={selection} onChange={(e) => pickPage(e.target.value)} className="w-full text-[12.5px] bg-section border border-border-subtle rounded-[10px] px-3 py-2 text-ink">
              {pages.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · {p.durationMin}m · {p.memberCount > 0 ? "Team (round robin)" : p.ownerName || "You"}</option>
              ))}
            </NativeSelect>
            {(selectedPage?.memberCount ?? 0) > 0 && <p className="text-[11.5px] text-ink-faint mt-1.5 inline-flex items-center gap-1.5"><Users size={13} /> A free rep from the team is auto-assigned for the time you pick.</p>}
          </div>

          <div className="h-px bg-border-subtle" />

          <div>
            <span className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold">Invitee</span>
            <div className="mt-2 space-y-2">
              <input value={inviteeName} onChange={(e) => setInviteeName(e.target.value)} placeholder="Name"
                className="w-full px-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[12.5px] text-ink focus:outline-none focus:border-border-default" />
              <input value={inviteeEmail} onChange={(e) => setInviteeEmail(e.target.value)} placeholder="Email"
                className="w-full px-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[12.5px] text-ink focus:outline-none focus:border-border-default" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Add guests</label>
            <TagInput tags={guests} onChange={setGuests} placeholder="guest@company.com" suggestions={guestSuggestions} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Agenda / context (in the invite)"
              className="w-full px-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[12px] text-ink resize-y focus:outline-none focus:border-border-default" />
          </div>

          {error && <p className="text-[12px] text-signal-red-text">{error}</p>}
        </div>
        <div className="p-4 border-t border-border-subtle">
          <button onClick={submit} disabled={submitting || !selectedSlot}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[12px] bg-ink text-on-ink text-[13px] font-semibold hover:bg-ink/90 disabled:opacity-50 transition-colors">
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <CalendarPlus size={14} />}
            {submitting ? "Booking…" : "Book meeting"}
          </button>
        </div>
      </div>

      {/* ── Right: calendar + slots ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-[15px] font-semibold text-ink">Select a time to book</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-ink-muted hover:bg-hover hover:text-ink"><X size={16} /></button>
        </div>
        <div className="px-6 py-3 border-b border-border-subtle flex items-center gap-2">
          <Globe size={13} className="text-ink-muted" />
          <span className="text-[12px] text-ink-secondary">Time zone</span>
          <TimezoneSelect value={displayTz} onChange={setDisplayTz} className="w-[240px]" />
        </div>

        {/* Explain a dead calendar: a host with no calendar-capable mailbox can't
            offer any times, so every date is disabled. Tell the user who + how. */}
        {!loadingAvail && availByDate.size === 0 && hostIssues.length > 0 && (
          <div className="mx-6 mt-4 rounded-[10px] border border-signal-amber/40 bg-signal-amber/10 px-4 py-3">
            <p className="text-[12.5px] font-semibold text-signal-amber-text inline-flex items-center gap-1.5">
              <AlertTriangle size={14} /> No times can be offered on this page
            </p>
            <p className="text-[12px] text-ink-secondary mt-1.5">
              {hostIssues.some((h) => h.reason === "no-calendar")
                ? <>{hostIssues.filter((h) => h.reason === "no-calendar").map((h) => h.name).join(", ")} connected a mailbox without <strong>Calendar access</strong>. They need to reconnect their Google/Outlook account (Settings → Integrations → reconnect) and grant calendar permission so meetings can be booked.</>
                : <>{hostIssues.map((h) => h.name).join(", ")} hasn&apos;t connected a Google/Outlook mailbox yet. Connect one in Settings → Integrations to enable booking.</>}
            </p>
          </div>
        )}

        <div className="flex-1 flex min-h-0">
          <div className="p-6 w-[360px] shrink-0">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setView((v) => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 })} className="p-1.5 rounded-md text-ink-muted hover:bg-hover"><ChevronLeft size={16} /></button>
              <span className="text-[13px] font-semibold text-ink">{CAL_MONTHS[view.m]} {view.y}</span>
              <button onClick={() => setView((v) => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 })} className="p-1.5 rounded-md text-ink-muted hover:bg-hover"><ChevronRight size={16} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {CAL_WEEKDAYS.map((w) => <div key={w} className="text-center text-[10px] text-ink-muted font-medium py-1">{w}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d) => {
                const k = dateKey(d);
                const inMonth = d.getUTCMonth() === view.m;
                const hasSlots = (availByDate.get(k)?.length ?? 0) > 0;
                const enabled = inMonth && hasSlots && k >= todayKey;
                const sel = selectedDate === k;
                return (
                  <button key={k} disabled={!enabled} onClick={() => { setSelectedDate(k); setSelectedSlot(null); }}
                    className={cn(
                      "aspect-square rounded-full text-[12px] flex items-center justify-center transition-colors",
                      sel ? "bg-accent text-on-ink font-semibold"
                        : enabled ? "text-accent font-semibold bg-accent/15 hover:bg-accent/25"
                        : !inMonth ? "text-ink-faint/40 cursor-default" : "text-ink-faint cursor-default",
                    )}>
                    {d.getUTCDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 border-l border-border-subtle p-6 overflow-y-auto min-w-0">
            {loadingAvail ? (
              <div className="flex items-center gap-2 text-[12px] text-ink-muted"><Loader2 size={14} className="animate-spin" /> Loading availability…</div>
            ) : !selectedDate ? (
              <p className="text-[13px] text-ink-faint">Select a date to book</p>
            ) : daySlots.length === 0 ? (
              <p className="text-[13px] text-ink-faint">No open times on this day.</p>
            ) : (
              <>
                <p className="text-[12px] font-medium text-ink-secondary mb-3">
                  {new Intl.DateTimeFormat("en-US", { timeZone: displayTz, weekday: "long", month: "short", day: "numeric" }).format(new Date(daySlots[0]))}
                </p>
                <div className="space-y-2 max-w-[260px]">
                  {daySlots.map((iso) => {
                    const ids = hostsBySlot[iso] || [];
                    const chosen = selectedSlot === iso;
                    return (
                      <button key={iso} onClick={() => setSelectedSlot(iso)}
                        className={cn(
                          "w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-[10px] border text-[13px] font-semibold transition-colors",
                          chosen ? "bg-accent text-on-ink border-transparent" : "border-border-default text-accent hover:border-accent/50 hover:bg-accent/5",
                        )}>
                        <span className="inline-flex items-center gap-1.5">{chosen && <Check size={13} />}{timeInTz(iso, displayTz)}</span>
                        {ids.length > 0 && !chosen && (
                          <span className="flex -space-x-1.5" title={ids.map((u) => hostNameById.get(u)).filter(Boolean).join(", ")}>
                            {ids.slice(0, 3).map((u) => (
                              <MemberAvatar key={u} id={u} name={hostNameById.get(u)} className="w-[18px] h-[18px] text-[8px] ring-1 ring-surface" />
                            ))}
                            {ids.length > 3 && <span className="w-[18px] h-[18px] rounded-full bg-section border border-border-subtle text-[8px] text-ink-muted flex items-center justify-center ring-1 ring-surface">+{ids.length - 3}</span>}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>,
  );
}
