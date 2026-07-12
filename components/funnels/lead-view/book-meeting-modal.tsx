"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { CalendarPlus, Loader2, X, Video, ChevronLeft, ChevronRight, Clock, Globe, AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { NativeSelect } from "@/components/ui/native-select";
import { TagInput } from "@/components/shared/tag-input";
import { guessLeadTimezone } from "@/lib/utils/lead-timezone";
import { allTimezones, browserTimezone, tzOffsetLabel } from "@/lib/utils/timezones";
import { listBookingHosts, getPageAvailability, type BookingHost, type BookingPage } from "@/lib/api/booking-pages";
import { bookMeeting } from "@/lib/api/meetings";
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

const TZ_LIST = allTimezones();
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Monday-first 42-cell grid of the month, as UTC-midnight calendar days. */
function monthGrid(year: number, month: number): Date[] {
  const firstDow = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7; // Mon=0
  const start = new Date(Date.UTC(year, month, 1 - firstDow));
  return Array.from({ length: 42 }, (_, i) => new Date(start.getTime() + i * 86_400_000));
}
const dateKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
/** The calendar date (YYYY-MM-DD) a UTC instant falls on in a timezone. */
function dateKeyInTz(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}
function timeInTz(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
}

export function BookMeetingModal({ open, onClose, funnelId, leadId, lead, contacts, onBooked }: BookMeetingModalProps) {
  const [hosts, setHosts] = useState<BookingHost[]>([]);
  const [loadingHosts, setLoadingHosts] = useState(true);
  const [hostUserId, setHostUserId] = useState("");
  const [pageId, setPageId] = useState("");

  const [displayTz, setDisplayTz] = useState(() => guessLeadTimezone(lead) || browserTimezone());
  const now = new Date();
  const [view, setView] = useState({ y: now.getUTCFullYear(), m: now.getUTCMonth() });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [availByDate, setAvailByDate] = useState<Map<string, string[]>>(new Map());
  const [loadingAvail, setLoadingAvail] = useState(false);

  const [title, setTitle] = useState("");
  const [inviteeName, setInviteeName] = useState(lead.name || "");
  const [inviteeEmail, setInviteeEmail] = useState(lead.email || "");
  const [guests, setGuests] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const host = hosts.find((h) => h.userId === hostUserId);
  const page: BookingPage | undefined = host?.pages.find((p) => p.id === pageId);

  // Load hosts + their pages on mount.
  useEffect(() => {
    let alive = true;
    listBookingHosts()
      .then((hs) => {
        if (!alive) return;
        setHosts(hs);
        const firstWithPage = hs.find((h) => h.pages.length > 0) || hs[0];
        if (firstWithPage) {
          setHostUserId(firstWithPage.userId);
          setPageId(firstWithPage.pages[0]?.id || "");
          setTitle(firstWithPage.pages[0]?.name || `Meeting with ${lead.name}`);
        }
      })
      .catch(() => setHosts([]))
      .finally(() => { if (alive) setLoadingHosts(false); });
    return () => { alive = false; };
  }, [lead.name]);

  const guestSuggestions = useMemo(() => {
    const s = new Set<string>();
    for (const c of contacts) { if (c.email) s.add(c.email); for (const x of c.extraEmails ?? []) s.add(x.value); }
    return [...s];
  }, [contacts]);

  // Fetch availability whenever page or month changes.
  const loadAvailability = useCallback(async (p: BookingPage, y: number, m: number) => {
    setLoadingAvail(true);
    const cells = monthGrid(y, m);
    const todayKey = dateKeyInTz(new Date().toISOString(), displayTz);
    const from = [dateKey(cells[0]), todayKey].sort()[1]; // max(gridStart, today)
    const to = dateKey(cells[41]);
    try {
      const res = await getPageAvailability(p.id, from, to);
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
  }, [displayTz]);

  useEffect(() => {
    if (!page) return;
    setSelectedDate(null); setSelectedSlot(null);
    void loadAvailability(page, view.y, view.m);
  }, [page, view.y, view.m, loadAvailability]);

  const cells = useMemo(() => monthGrid(view.y, view.m), [view]);
  const todayKey = dateKeyInTz(new Date().toISOString(), displayTz);
  const daySlots = selectedDate ? (availByDate.get(selectedDate) || []) : [];

  function pickHost(uid: string) {
    setHostUserId(uid);
    const h = hosts.find((x) => x.userId === uid);
    const firstPage = h?.pages[0];
    setPageId(firstPage?.id || "");
    if (firstPage) setTitle(firstPage.name);
  }

  async function submit() {
    setError(null);
    if (!page) { setError("Pick a host and a booking page."); return; }
    if (!selectedSlot) { setError("Pick a time slot."); return; }
    const email = inviteeEmail.trim();
    if (!email && guests.length === 0) { setError("Add an invitee email."); return; }
    setSubmitting(true);
    try {
      await bookMeeting(funnelId, leadId, {
        bookingPageId: page.id,
        startISO: selectedSlot,
        title: title.trim() || page.name,
        description: notes.trim() || undefined,
        inviteeEmails: email ? [email] : [],
        guestEmails: guests,
      });
      onBooked();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not book the meeting.");
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-[16px] border border-border-subtle shadow-2xl w-full max-w-5xl max-h-[88vh] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {loadingHosts ? (
          <div className="flex-1 flex items-center justify-center py-24"><Loader2 size={22} className="animate-spin text-ink-muted" /></div>
        ) : hosts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-24 px-8">
            <AlertTriangle size={22} className="text-signal-amber-text mb-3" />
            <p className="text-[13px] font-medium text-ink">No calendar-connected mailbox</p>
            <p className="text-[12px] text-ink-muted mt-1 max-w-[360px]">Connect (or reconnect) a Google/Outlook account in Settings → Email Accounts, then set up a booking page under Settings → Booking Pages.</p>
            <button onClick={onClose} className="mt-5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[12px] font-medium">Close</button>
          </div>
        ) : (
          <>
            {/* ── Left: details ── */}
            <div className="w-[360px] shrink-0 border-r border-border-subtle flex flex-col">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold">Meeting details</span>
                </div>
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-[17px] font-semibold text-ink bg-transparent border-0 border-b border-transparent hover:border-border-subtle focus:border-border-default focus:outline-none pb-1" />
                <div className="flex items-center gap-3 text-[12px] text-ink-secondary">
                  <span className="inline-flex items-center gap-1.5"><Clock size={13} className="text-ink-muted" /> {page?.durationMin ?? 30} min</span>
                  {page?.video && <span className="inline-flex items-center gap-1.5 text-signal-blue-text"><Video size={13} /> Video</span>}
                </div>

                <div className="h-px bg-border-subtle" />

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Host</label>
                  <NativeSelect value={hostUserId} onChange={(e) => pickHost(e.target.value)} className="w-full text-[12.5px] bg-section border border-border-subtle rounded-[10px] px-3 py-2 text-ink">
                    {hosts.map((h) => <option key={h.userId} value={h.userId}>{h.name} · {h.email}</option>)}
                  </NativeSelect>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Booking page</label>
                  {host && host.pages.length > 0 ? (
                    <NativeSelect value={pageId} onChange={(e) => { setPageId(e.target.value); const p = host.pages.find((x) => x.id === e.target.value); if (p) setTitle(p.name); }}
                      className="w-full text-[12.5px] bg-section border border-border-subtle rounded-[10px] px-3 py-2 text-ink">
                      {host.pages.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.durationMin}m)</option>)}
                    </NativeSelect>
                  ) : (
                    <p className="text-[11.5px] text-ink-faint">This rep hasn&apos;t set up a booking page yet (Settings → Booking Pages).</p>
                  )}
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
                <NativeSelect value={displayTz} onChange={(e) => setDisplayTz(e.target.value)}
                  className="text-[12px] bg-section border border-border-subtle rounded-[8px] px-2.5 py-1.5 text-ink max-w-[280px]">
                  {TZ_LIST.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")} ({tzOffsetLabel(tz)})</option>)}
                </NativeSelect>
              </div>

              <div className="flex-1 flex min-h-0">
                {/* Month calendar */}
                <div className="p-6 w-[360px] shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => setView((v) => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 })}
                      className="p-1.5 rounded-md text-ink-muted hover:bg-hover" ><ChevronLeft size={16} /></button>
                    <span className="text-[13px] font-semibold text-ink">{MONTHS[view.m]} {view.y}</span>
                    <button onClick={() => setView((v) => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 })}
                      className="p-1.5 rounded-md text-ink-muted hover:bg-hover"><ChevronRight size={16} /></button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {WEEKDAYS.map((w) => <div key={w} className="text-center text-[10px] text-ink-muted font-medium py-1">{w}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((d) => {
                      const k = dateKey(d);
                      const inMonth = d.getUTCMonth() === view.m;
                      const hasSlots = (availByDate.get(k)?.length ?? 0) > 0;
                      const isPast = k < todayKey;
                      const sel = selectedDate === k;
                      const enabled = inMonth && hasSlots && !isPast;
                      return (
                        <button key={k} disabled={!enabled}
                          onClick={() => { setSelectedDate(k); setSelectedSlot(null); }}
                          className={cn(
                            "aspect-square rounded-full text-[12px] flex items-center justify-center transition-colors",
                            !inMonth ? "text-ink-faint/40" : "",
                            sel ? "bg-signal-blue text-signal-blue-text font-semibold"
                              : enabled ? "text-signal-blue-text font-medium bg-signal-blue/10 hover:bg-signal-blue/20"
                              : "text-ink-faint cursor-default",
                          )}>
                          {d.getUTCDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Slots for the selected day */}
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
                              "w-full text-center py-2.5 rounded-[10px] border text-[13px] font-medium transition-colors",
                              selectedSlot === iso
                                ? "bg-signal-blue text-signal-blue-text border-transparent"
                                : "border-border-default text-signal-blue-text hover:border-signal-blue-text/40",
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
          </>
        )}
      </div>
    </div>
  );
}
