"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Clock, Video, Globe, ChevronLeft, ChevronRight, Check, CheckCircle2, ExternalLink, CalendarX } from "lucide-react";
import { LeadeyLogomark } from "@/components/brand/leadey-mark";
import { getPublicPage, getPublicAvailability, publicBook, type PublicBookingPage } from "@/lib/api/public-booking";
import { browserTimezone } from "@/lib/utils/timezones";
import { TimezoneSelect } from "@/components/shared/timezone-select";
import { monthGrid, dateKey, dateKeyInTz, timeInTz, groupSlotsByTz, CAL_WEEKDAYS, CAL_MONTHS } from "@/lib/utils/booking-calendar";

const BACKDROP: React.CSSProperties = {
  backgroundImage: [
    "radial-gradient(80% 80% at 18% 100%, rgba(151, 164, 214, 0.22) 0%, rgba(151, 164, 214, 0) 60%)",
    "radial-gradient(70% 60% at 100% 0%, rgba(74, 84, 120, 0.30) 0%, rgba(74, 84, 120, 0) 65%)",
    "linear-gradient(135deg, #070A19 0%, #0C1122 35%, #141A30 65%, #1A2347 100%)",
  ].join(", "),
};

function cx(...c: (string | false | undefined)[]) { return c.filter(Boolean).join(" "); }

export default function PublicBookingPage() {
  const slug = String(useParams().slug || "");
  const [info, setInfo] = useState<PublicBookingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [displayTz, setDisplayTz] = useState(() => browserTimezone());
  const [view, setView] = useState(() => { const n = new Date(); return { y: n.getUTCFullYear(), m: n.getUTCMonth() }; });
  const [availByDate, setAvailByDate] = useState<Map<string, string[]>>(new Map());
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [guestsStr, setGuestsStr] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ title: string; joinUrl: string | null; startTime: string; endTime: string } | null>(null);

  useEffect(() => {
    let alive = true;
    getPublicPage(slug)
      .then((d) => { if (alive) setInfo(d); })
      .catch(() => { if (alive) setNotFound(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [slug]);

  const loadAvailability = useCallback(async (y: number, m: number) => {
    setLoadingAvail(true);
    const cells = monthGrid(y, m);
    const todayKey = dateKeyInTz(new Date().toISOString(), displayTz);
    const from = [dateKey(cells[0]), todayKey].sort()[1];
    const to = dateKey(cells[41]);
    try {
      const res = await getPublicAvailability(slug, from, to);
      setAvailByDate(groupSlotsByTz(res.days.flatMap((d) => d.slots), displayTz));
    } catch {
      setAvailByDate(new Map());
    } finally {
      setLoadingAvail(false);
    }
  }, [slug, displayTz]);

  useEffect(() => {
    if (!info) return;
    setSelectedDate(null); setSelectedSlot(null);
    void loadAvailability(view.y, view.m);
  }, [info, view.y, view.m, loadAvailability]);

  const cells = useMemo(() => monthGrid(view.y, view.m), [view]);
  const todayKey = dateKeyInTz(new Date().toISOString(), displayTz);
  const daySlots = selectedDate ? (availByDate.get(selectedDate) || []) : [];

  async function submit() {
    setError(null);
    if (!selectedSlot) { setError("Pick a time."); return; }
    if (!/.+@.+\..+/.test(email.trim())) { setError("Enter a valid email."); return; }
    setSubmitting(true);
    try {
      const guests = guestsStr.split(/[,\s]+/).map((g) => g.trim()).filter((g) => /.+@.+\..+/.test(g));
      const r = await publicBook(slug, { startISO: selectedSlot, name: name.trim(), email: email.trim(), guests, notes: notes.trim() || undefined });
      setConfirmed(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not book — try another time.");
    } finally {
      setSubmitting(false);
    }
  }

  const Brand = (
    <div className="flex flex-col items-center gap-1.5 mb-6">
      <LeadeyLogomark variant="white" height={30} />
      <span className="text-[13px] tracking-[0.28em] uppercase text-white/55 font-medium">Bookings</span>
    </div>
  );

  return (
    <div className="min-h-screen w-full flex flex-col items-center px-4 py-10" style={BACKDROP}>
      {Brand}

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-white/50" /></div>
      ) : notFound || !info ? (
        <div className="mt-16 flex flex-col items-center text-center text-white/80">
          <CalendarX size={26} className="mb-3 text-white/50" />
          <p className="text-[15px] font-medium">This booking link isn&apos;t available</p>
          <p className="text-[13px] text-white/50 mt-1">The link may have been disabled or is incorrect.</p>
        </div>
      ) : confirmed ? (
        <div className="w-full max-w-md rounded-[18px] bg-white shadow-2xl px-8 py-10 flex flex-col items-center text-center">
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mb-4"><CheckCircle2 size={30} /></span>
          <h1 className="text-[19px] font-semibold text-slate-900">You&apos;re booked</h1>
          <p className="text-[13px] text-slate-500 mt-1">A calendar invite is on its way to your inbox.</p>
          <div className="mt-6 w-full rounded-[12px] border border-slate-200 bg-slate-50 p-4 text-left space-y-2">
            <p className="text-[15px] font-semibold text-slate-900">{confirmed.title}</p>
            <p className="text-[13px] text-slate-600 inline-flex items-center gap-1.5"><Clock size={14} className="text-slate-400" />
              {new Intl.DateTimeFormat("en-US", { timeZone: displayTz, weekday: "long", month: "long", day: "numeric" }).format(new Date(confirmed.startTime))} · {timeInTz(confirmed.startTime, displayTz)}–{timeInTz(confirmed.endTime, displayTz)}
            </p>
            <p className="text-[11px] text-slate-400">{displayTz.replace(/_/g, " ")}</p>
            {confirmed.joinUrl && (
              <a href={confirmed.joinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-indigo-600 hover:underline pt-1 break-all">
                <Video size={13} /> {confirmed.joinUrl} <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-4xl rounded-[18px] bg-white shadow-2xl flex flex-col md:flex-row overflow-hidden">
          {/* Left: details */}
          <div className="md:w-[300px] shrink-0 border-b md:border-b-0 md:border-r border-slate-200 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{info.orgName}</p>
            <h1 className="text-[20px] font-semibold text-slate-900 mt-1.5 leading-tight">{info.page.name}</h1>
            <div className="mt-4 space-y-2.5 text-[13px] text-slate-600">
              <p className="inline-flex items-center gap-2"><Clock size={15} className="text-slate-400" /> {info.page.durationMin} min</p>
              {info.page.video && <p className="inline-flex items-center gap-2 text-indigo-600"><Video size={15} /> Video call</p>}
              {info.hostLabel && <p className="text-slate-500">with {info.hostLabel}</p>}
            </div>
          </div>

          {/* Right: calendar / slots / form */}
          <div className="flex-1 min-w-0 p-6">
            {!confirmed && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[15px] font-semibold text-slate-900">Select a time</h2>
                  <div className="flex items-center gap-1.5">
                    <Globe size={13} className="text-slate-400" />
                    <TimezoneSelect value={displayTz} onChange={setDisplayTz} light align="right" className="w-[210px]" />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Month */}
                  <div className="sm:w-[300px] shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <button onClick={() => setView((v) => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 })} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100"><ChevronLeft size={16} /></button>
                      <span className="text-[13px] font-semibold text-slate-800">{CAL_MONTHS[view.m]} {view.y}</span>
                      <button onClick={() => setView((v) => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 })} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100"><ChevronRight size={16} /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {CAL_WEEKDAYS.map((w) => <div key={w} className="text-center text-[10px] text-slate-400 font-medium py-1">{w}</div>)}
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
                            className={cx(
                              "aspect-square rounded-full text-[12px] flex items-center justify-center transition-colors",
                              sel ? "bg-indigo-600 text-white font-semibold"
                                : enabled ? "text-indigo-700 font-semibold bg-indigo-50 hover:bg-indigo-100"
                                : !inMonth ? "text-slate-300 cursor-default" : "text-slate-300 cursor-default",
                            )}>
                            {d.getUTCDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Slots + form */}
                  <div className="flex-1 min-w-0">
                    {loadingAvail ? (
                      <div className="flex items-center gap-2 text-[12px] text-slate-500"><Loader2 size={14} className="animate-spin" /> Loading times…</div>
                    ) : !selectedDate ? (
                      <p className="text-[13px] text-slate-400">Pick a day to see open times.</p>
                    ) : !selectedSlot ? (
                      daySlots.length === 0 ? <p className="text-[13px] text-slate-400">No open times this day.</p> : (
                        <>
                          <p className="text-[12px] font-medium text-slate-600 mb-3">{new Intl.DateTimeFormat("en-US", { timeZone: displayTz, weekday: "long", month: "short", day: "numeric" }).format(new Date(daySlots[0]))}</p>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 max-w-[220px]">
                            {daySlots.map((iso) => (
                              <button key={iso} onClick={() => setSelectedSlot(iso)}
                                className="w-full text-center py-2.5 rounded-[10px] border border-slate-200 text-[13px] font-semibold text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                                {timeInTz(iso, displayTz)}
                              </button>
                            ))}
                          </div>
                        </>
                      )
                    ) : (
                      // Booking form for the chosen slot
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[13px] font-semibold text-slate-800 inline-flex items-center gap-1.5"><Check size={14} className="text-indigo-600" /> {timeInTz(selectedSlot, displayTz)}</p>
                          <button onClick={() => setSelectedSlot(null)} className="text-[12px] text-slate-500 hover:text-slate-800">Change</button>
                        </div>
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                          className="w-full px-3 py-2 rounded-[10px] bg-slate-50 border border-slate-200 text-[13px] text-slate-900 focus:outline-none focus:border-indigo-400" />
                        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" type="email"
                          className="w-full px-3 py-2 rounded-[10px] bg-slate-50 border border-slate-200 text-[13px] text-slate-900 focus:outline-none focus:border-indigo-400" />
                        <input value={guestsStr} onChange={(e) => setGuestsStr(e.target.value)} placeholder="Guest emails (comma separated) — optional"
                          className="w-full px-3 py-2 rounded-[10px] bg-slate-50 border border-slate-200 text-[13px] text-slate-900 focus:outline-none focus:border-indigo-400" />
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything to share? (optional)"
                          className="w-full px-3 py-2 rounded-[10px] bg-slate-50 border border-slate-200 text-[13px] text-slate-900 resize-y focus:outline-none focus:border-indigo-400" />
                        {error && <p className="text-[12px] text-red-600">{error}</p>}
                        <button onClick={submit} disabled={submitting}
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[12px] bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                          {submitting ? <Loader2 size={14} className="animate-spin" /> : null} Confirm booking
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <p className="text-[11px] text-white/35 mt-8">Powered by Leadey</p>
    </div>
  );
}
