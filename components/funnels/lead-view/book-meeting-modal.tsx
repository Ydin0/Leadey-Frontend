"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { CalendarPlus, Loader2, X, Video, ChevronLeft, ChevronRight, Clock, Globe, AlertTriangle, Check, CheckCircle2, ExternalLink, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { NativeSelect } from "@/components/ui/native-select";
import { TagInput } from "@/components/shared/tag-input";
import { guessLeadTimezone } from "@/lib/utils/lead-timezone";
import { allTimezones, browserTimezone, tzOffsetLabel } from "@/lib/utils/timezones";
import { listBookingHosts, getPageAvailability, getRoundRobinAvailability, type BookingHost, type BookingPage } from "@/lib/api/booking-pages";
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

const ALL = "all";
const TZ_LIST = allTimezones();
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function monthGrid(year: number, month: number): Date[] {
  const firstDow = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month, 1 - firstDow));
  return Array.from({ length: 42 }, (_, i) => new Date(start.getTime() + i * 86_400_000));
}
const dateKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
function dateKeyInTz(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}
function timeInTz(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
}

export function BookMeetingModal({ open, onClose, funnelId, leadId, lead, contacts, onBooked }: BookMeetingModalProps) {
  const [hosts, setHosts] = useState<BookingHost[]>([]);
  const [loadingHosts, setLoadingHosts] = useState(true);
  const [hostUserId, setHostUserId] = useState(ALL);
  const [pageId, setPageId] = useState("");

  const [displayTz, setDisplayTz] = useState(() => guessLeadTimezone(lead) || browserTimezone());
  const [view, setView] = useState(() => { const n = new Date(); return { y: n.getUTCFullYear(), m: n.getUTCMonth() }; });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [availByDate, setAvailByDate] = useState<Map<string, string[]>>(new Map());
  const [availMeta, setAvailMeta] = useState({ durationMin: 30, video: true });
  const [loadingAvail, setLoadingAvail] = useState(false);

  const [title, setTitle] = useState("Meeting");
  const [inviteeName, setInviteeName] = useState(lead.name || "");
  const [inviteeEmail, setInviteeEmail] = useState(lead.email || "");
  const [guests, setGuests] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<BookedMeeting | null>(null);

  const isPool = hostUserId === ALL;
  const host = hosts.find((h) => h.userId === hostUserId);
  const page: BookingPage | undefined = host?.pages.find((p) => p.id === pageId);
  const meta = isPool ? availMeta : { durationMin: page?.durationMin ?? availMeta.durationMin, video: page?.video ?? availMeta.video };

  useEffect(() => {
    let alive = true;
    listBookingHosts()
      .then((hs) => {
        if (!alive) return;
        setHosts(hs);
        // Default to the round-robin pool when any rep has a page, else first rep.
        if (hs.some((h) => h.pages.length > 0)) setTitle("Meeting");
        else if (hs[0]) { setHostUserId(hs[0].userId); }
      })
      .catch(() => setHosts([]))
      .finally(() => { if (alive) setLoadingHosts(false); });
    return () => { alive = false; };
  }, []);

  const guestSuggestions = useMemo(() => {
    const s = new Set<string>();
    for (const c of contacts) { if (c.email) s.add(c.email); for (const x of c.extraEmails ?? []) s.add(x.value); }
    return [...s];
  }, [contacts]);

  const loadAvailability = useCallback(async (y: number, m: number) => {
    setLoadingAvail(true);
    const cells = monthGrid(y, m);
    const todayKey = dateKeyInTz(new Date().toISOString(), displayTz);
    const from = [dateKey(cells[0]), todayKey].sort()[1];
    const to = dateKey(cells[41]);
    try {
      const res = isPool ? await getRoundRobinAvailability(from, to) : page ? await getPageAvailability(page.id, from, to) : null;
      if (!res) { setAvailByDate(new Map()); return; }
      setAvailMeta({ durationMin: res.durationMin, video: res.video });
      const map = new Map<string, string[]>();
      for (const day of res.days) for (const iso of day.slots) {
        const k = dateKeyInTz(iso, displayTz);
        (map.get(k) ?? map.set(k, []).get(k)!).push(iso);
      }
      for (const arr of map.values()) arr.sort();
      setAvailByDate(map);
    } catch {
      setAvailByDate(new Map());
    } finally {
      setLoadingAvail(false);
    }
  }, [displayTz, isPool, page]);

  useEffect(() => {
    if (!isPool && !page) return;
    setSelectedDate(null); setSelectedSlot(null);
    void loadAvailability(view.y, view.m);
  }, [isPool, page, view.y, view.m, loadAvailability]);

  const cells = useMemo(() => monthGrid(view.y, view.m), [view]);
  const todayKey = dateKeyInTz(new Date().toISOString(), displayTz);
  const daySlots = selectedDate ? (availByDate.get(selectedDate) || []) : [];

  function pickHost(uid: string) {
    setHostUserId(uid);
    if (uid === ALL) { setPageId(""); return; }
    const firstPage = hosts.find((x) => x.userId === uid)?.pages[0];
    setPageId(firstPage?.id || "");
    if (firstPage) setTitle(firstPage.name);
  }

  async function submit() {
    setError(null);
    if (!isPool && !page) { setError("Pick a host and a booking page."); return; }
    if (!selectedSlot) { setError("Pick a time slot."); return; }
    const email = inviteeEmail.trim();
    if (!email && guests.length === 0) { setError("Add an invitee email."); return; }
    setSubmitting(true);
    try {
      const result = await bookMeeting(funnelId, leadId, {
        ...(isPool ? { roundRobin: true } : { bookingPageId: page!.id }),
        startISO: selectedSlot,
        title: title.trim() || page?.name || "Meeting",
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

  // ── Confirmation ──
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
            <a href={confirmed.joinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-signal-blue-text hover:underline pt-1">
              <Video size={13} /> {confirmed.joinUrl} <ExternalLink size={11} />
            </a>
          )}
        </div>
        <button onClick={onClose} className="mt-6 px-6 py-2.5 rounded-[12px] bg-ink text-on-ink text-[13px] font-semibold hover:bg-ink/90 transition-colors">Done</button>
      </div>,
      false,
    );
  }

  if (loadingHosts) return overlay(<div className="flex-1 flex items-center justify-center py-24"><Loader2 size={22} className="animate-spin text-ink-muted" /></div>);
  if (hosts.length === 0) {
    return overlay(
      <div className="flex-1 flex flex-col items-center justify-center text-center py-24 px-8">
        <AlertTriangle size={22} className="text-signal-amber-text mb-3" />
        <p className="text-[13px] font-medium text-ink">No calendar-connected mailbox</p>
        <p className="text-[12px] text-ink-muted mt-1 max-w-[360px]">Connect (or reconnect) a Google/Outlook account in Settings → Email Accounts, then set up a booking page under Settings → Booking Pages.</p>
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
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Host</label>
            <NativeSelect value={hostUserId} onChange={(e) => pickHost(e.target.value)} className="w-full text-[12.5px] bg-section border border-border-subtle rounded-[10px] px-3 py-2 text-ink">
              <option value={ALL}>All hosts · round robin</option>
              {hosts.map((h) => <option key={h.userId} value={h.userId}>{h.name} · {h.email}</option>)}
            </NativeSelect>
          </div>
          {isPool ? (
            <p className="text-[11.5px] text-ink-faint inline-flex items-center gap-1.5"><Users size={13} /> A free rep is auto-assigned for the time you pick.</p>
          ) : host && host.pages.length > 0 ? (
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Booking page</label>
              <NativeSelect value={pageId} onChange={(e) => { setPageId(e.target.value); const p = host.pages.find((x) => x.id === e.target.value); if (p) setTitle(p.name); }}
                className="w-full text-[12.5px] bg-section border border-border-subtle rounded-[10px] px-3 py-2 text-ink">
                {host.pages.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.durationMin}m)</option>)}
              </NativeSelect>
            </div>
          ) : (
            <p className="text-[11.5px] text-ink-faint">This rep hasn&apos;t set up a booking page yet (Settings → Booking Pages).</p>
          )}

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
          <NativeSelect value={displayTz} onChange={(e) => setDisplayTz(e.target.value)}
            className="text-[12px] bg-section border border-border-subtle rounded-[8px] px-2.5 py-1.5 text-ink max-w-[280px]">
            {TZ_LIST.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")} ({tzOffsetLabel(tz)})</option>)}
          </NativeSelect>
        </div>

        <div className="flex-1 flex min-h-0">
          <div className="p-6 w-[360px] shrink-0">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setView((v) => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 })} className="p-1.5 rounded-md text-ink-muted hover:bg-hover"><ChevronLeft size={16} /></button>
              <span className="text-[13px] font-semibold text-ink">{MONTHS[view.m]} {view.y}</span>
              <button onClick={() => setView((v) => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 })} className="p-1.5 rounded-md text-ink-muted hover:bg-hover"><ChevronRight size={16} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((w) => <div key={w} className="text-center text-[10px] text-ink-muted font-medium py-1">{w}</div>)}
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
                <div className="space-y-2 max-w-[220px]">
                  {daySlots.map((iso) => (
                    <button key={iso} onClick={() => setSelectedSlot(iso)}
                      className={cn(
                        "w-full text-center py-2.5 rounded-[10px] border text-[13px] font-semibold transition-colors",
                        selectedSlot === iso ? "bg-accent text-on-ink border-transparent" : "border-border-default text-accent hover:border-accent/50 hover:bg-accent/5",
                      )}>
                      {selectedSlot === iso ? <span className="inline-flex items-center gap-1.5"><Check size={13} /> {timeInTz(iso, displayTz)}</span> : timeInTz(iso, displayTz)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>,
  );
}
