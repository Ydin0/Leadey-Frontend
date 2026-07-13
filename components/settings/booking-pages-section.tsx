"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, CalendarClock, ArrowLeft, Check, Video, CalendarCheck, Users, Globe, Link2, Copy, Star } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { NativeSelect } from "@/components/ui/native-select";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { WeeklyHoursEditor } from "@/components/shared/weekly-hours-editor";
import { MemberMultiSelect } from "@/components/shared/member-multi-select";
import { useTeamMembers } from "@/hooks/use-team-members";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { browserTimezone } from "@/lib/utils/timezones";
import { TimezoneSelect } from "@/components/shared/timezone-select";
import {
  listMyBookingPages, createBookingPage, updateBookingPage, deleteBookingPage,
  type BookingPage, type WeeklyAvailability,
} from "@/lib/api/booking-pages";

const DURATIONS = [15, 30, 45, 60, 90];
/** Round-robin priority tiers (Calendly-style). Higher value = booked first. */
const PRIORITY_TIERS = [
  { v: 4, label: "Highest" },
  { v: 3, label: "High" },
  { v: 2, label: "Low" },
  { v: 1, label: "Lowest" },
];
const DEFAULT_AVAIL: WeeklyAvailability = {
  mon: [{ start: "09:00", end: "17:00" }], tue: [{ start: "09:00", end: "17:00" }], wed: [{ start: "09:00", end: "17:00" }],
  thu: [{ start: "09:00", end: "17:00" }], fri: [{ start: "09:00", end: "17:00" }], sat: [], sun: [],
};

export function BookingPagesSection() {
  const [pages, setPages] = useState<BookingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BookingPage | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPages(await listMyBookingPages()); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={20} className="animate-spin text-ink-muted" /></div>;
  }
  if (editing) {
    return <PageEditor page={editing === "new" ? null : editing} onBack={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[12px] text-ink-muted max-w-[560px]">
          Booking pages define your availability — like Calendly event types. Reps pick a page when booking a meeting from a lead, and open slots respect these hours (and your calendar, if enabled).
        </p>
        <button onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors shrink-0">
          <Plus size={14} strokeWidth={2} /> New page
        </button>
      </div>

      {pages.length === 0 ? (
        <div className="py-16 text-center">
          <CalendarClock size={22} className="text-ink-faint mx-auto mb-2.5" />
          <p className="text-[13px] font-medium text-ink">No booking pages yet</p>
          <p className="text-[12px] text-ink-muted mt-1">Create one to set the times you&apos;re available for meetings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pages.map((p) => (
            <button key={p.id} onClick={() => setEditing(p)}
              className="group text-left rounded-[14px] border border-border-subtle bg-surface p-4 hover:border-border-default transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-ink truncate">{p.name}</span>
                <Pencil size={13} className="text-ink-faint group-hover:text-ink-muted" />
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11px] text-ink-muted">
                <span className="inline-flex items-center gap-1"><CalendarClock size={12} /> {p.durationMin} min</span>
                {p.video && <span className="inline-flex items-center gap-1"><Video size={12} /> Video</span>}
                {p.respectCalendar && <span className="inline-flex items-center gap-1 text-signal-green-text"><CalendarCheck size={12} /> Checks calendar</span>}
                <span className="text-ink-faint">· {p.timezone.replace(/_/g, " ")}</span>
                {!p.owned && <span className="inline-flex items-center gap-1 text-signal-blue-text"><Users size={12} /> Shared by {p.ownerName || "a teammate"}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("relative w-9 h-[20px] rounded-full transition-colors shrink-0", on ? "bg-signal-green-text" : "bg-border-default")}>
      <span className={cn("absolute top-[2px] w-4 h-4 rounded-full bg-surface shadow-sm transition-all", on ? "left-[18px]" : "left-[2px]")} />
    </button>
  );
}

const lab = "block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5";
const inp = "w-full px-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[12.5px] text-ink focus:outline-none focus:border-border-default";

const NOTICE_UNITS = [
  { key: "minutes", label: "minutes", min: 1 },
  { key: "hours", label: "hours", min: 60 },
  { key: "days", label: "days", min: 1440 },
];
const NOTICE_PRESETS = [
  { label: "None", m: 0 }, { label: "1 hour", m: 60 }, { label: "4 hours", m: 240 },
  { label: "1 day", m: 1440 }, { label: "2 days", m: 2880 }, { label: "1 week", m: 10080 },
];
function noticeUnitOf(m: number): string {
  if (m > 0 && m % 1440 === 0) return "days";
  if (m > 0 && m % 60 === 0) return "hours";
  return "minutes";
}

/** Fully-customisable minimum-notice control: a value + unit (minutes/hours/
 *  days) with quick presets — or type any custom value. Emits total minutes. */
function MinNoticeField({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  const [unit, setUnit] = useState(() => noticeUnitOf(value));
  const unitMin = NOTICE_UNITS.find((u) => u.key === unit)!.min;
  const num = unit === "minutes" ? value : Math.round((value / unitMin) * 100) / 100;
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="number" min={0} value={num}
          onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)) * unitMin)}
          className={cn(inp, "w-24")}
        />
        <NativeSelect
          value={unit}
          onChange={(e) => { const nu = e.target.value; const nm = NOTICE_UNITS.find((u) => u.key === nu)!.min; setUnit(nu); onChange(num * nm); }}
          className={cn(inp, "flex-1")}
        >
          {NOTICE_UNITS.map((u) => <option key={u.key} value={u.key}>{u.label}</option>)}
        </NativeSelect>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {NOTICE_PRESETS.map((p) => (
          <button
            type="button" key={p.label}
            onClick={() => { setUnit(noticeUnitOf(p.m)); onChange(p.m); }}
            className={cn(
              "px-2 py-1 rounded-full text-[10.5px] font-medium border transition-colors",
              value === p.m ? "bg-accent/15 text-link border-accent/30" : "bg-section text-ink-secondary border-border-subtle hover:bg-hover",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PageEditor({ page, onBack, onSaved }: { page: BookingPage | null; onBack: () => void; onSaved: () => void }) {
  const [name, setName] = useState(page?.name || "30 Minute Meeting");
  const [durationMin, setDurationMin] = useState(page?.durationMin ?? 30);
  const [video, setVideo] = useState(page?.video ?? true);
  const [timezone, setTimezone] = useState(page?.timezone || browserTimezone());
  const [availability, setAvailability] = useState<WeeklyAvailability>(page?.availability || DEFAULT_AVAIL);
  const [respectCalendar, setRespectCalendar] = useState(page?.respectCalendar ?? true);
  const [roundRobin, setRoundRobin] = useState(page?.roundRobin ?? true);
  const [memberIds, setMemberIds] = useState<string[]>(page?.members ?? []);
  // Round-robin priority per host (userId → 1 Lowest … 4 Highest). Owner keyed
  // by page.userId; falls back to 3 (High) for anyone unset.
  const [priorities, setPriorities] = useState<Record<string, number>>(page?.priorities ?? {});
  const [distribution, setDistribution] = useState<"equal" | "priority">(page?.distribution ?? "equal");
  const [isPublic, setIsPublic] = useState(page?.isPublic ?? false);
  const [copied, setCopied] = useState(false);
  const { has } = usePermissions();
  const { userId: myId } = useAuth();
  const ownerId = page?.userId ?? myId ?? "";
  const canManage = has("settings.manageTeam");
  // You're a host on this page but not the owner (and can't manage the team) → view-only.
  const readOnly = !!page && !page.owned && !canManage;
  const { members: teamMembers } = useTeamMembers();
  const publicUrl = page?.publicSlug ? `${typeof window !== "undefined" ? window.location.origin : ""}/book/${page.publicSlug}` : "";
  const [minNoticeMin, setMinNoticeMin] = useState(page?.minNoticeMin ?? 240);
  const [bufferBeforeMin, setBufferBeforeMin] = useState(page?.bufferBeforeMin ?? 0);
  const [bufferAfterMin, setBufferAfterMin] = useState(page?.bufferAfterMin ?? 0);
  const [maxDaysAhead, setMaxDaysAhead] = useState(page?.maxDaysAhead ?? 60);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) { setError("Give the page a name."); return; }
    setSaving(true); setError(null);
    const payload = { name: name.trim(), durationMin, video, timezone, availability, respectCalendar, roundRobin, minNoticeMin, bufferBeforeMin, bufferAfterMin, maxDaysAhead, distribution, priorities, ...(canManage ? { members: memberIds, isPublic } : {}) };
    try {
      if (page) await updateBookingPage(page.id, payload);
      else await createBookingPage(payload);
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to save"); setSaving(false); }
  }
  async function remove() {
    if (!page) return;
    if (!confirm(`Delete "${page.name}"?`)) return;
    setSaving(true);
    try { await deleteBookingPage(page.id); onSaved(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to delete"); setSaving(false); }
  }

  return (
    <div className="max-w-[640px]">
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] text-ink-secondary hover:text-ink">
          <ArrowLeft size={14} /> Back to booking pages
        </button>
        {readOnly ? (
          <span className="text-[11px] text-ink-muted inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[16px] bg-section border border-border-subtle"><Users size={12} /> View only</span>
        ) : (
          <div className="flex items-center gap-2">
            {page && page.owned && (
              <button onClick={remove} disabled={saving} className="p-2 rounded-[16px] text-ink-muted hover:text-signal-red-text hover:bg-signal-red/10" title="Delete">
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save page
            </button>
          </div>
        )}
      </div>

      {readOnly && (
        <div className="mb-5 rounded-[12px] border border-border-subtle bg-section/50 p-3.5 text-[12px] text-ink-secondary flex items-start gap-2">
          <Users size={15} className="text-signal-blue-text mt-0.5 shrink-0" />
          <span>You&apos;re a host on <span className="font-medium text-ink">{page?.name}</span>, shared by {page?.ownerName || "a teammate"}. Bookings round-robin to whoever&apos;s free — only the owner can change its settings.</span>
        </div>
      )}

      <fieldset disabled={readOnly} className="space-y-5 min-w-0 disabled:opacity-70">
        <div>
          <label className={lab}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inp} placeholder="e.g. 30-min intro" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lab}>Duration</label>
            <NativeSelect value={String(durationMin)} onChange={(e) => setDurationMin(Number(e.target.value))} className={inp}>
              {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
            </NativeSelect>
          </div>
          <div>
            <label className={lab}>Timezone</label>
            <TimezoneSelect value={timezone} onChange={setTimezone} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-[12px] border border-border-subtle p-3.5">
          <div>
            <p className="text-[12.5px] font-medium text-ink flex items-center gap-1.5"><Video size={14} /> Add a video link</p>
            <p className="text-[11px] text-ink-muted mt-0.5">Google Meet or Teams, based on your mailbox.</p>
          </div>
          <Toggle on={video} onClick={() => setVideo((v) => !v)} />
        </div>

        <div className="flex items-center justify-between rounded-[12px] border border-border-subtle p-3.5">
          <div>
            <p className="text-[12.5px] font-medium text-ink flex items-center gap-1.5"><CalendarCheck size={14} /> Respect my Google/Outlook calendar</p>
            <p className="text-[11px] text-ink-muted mt-0.5">Hide times you&apos;re already busy. Off = purely the hours below.</p>
          </div>
          <Toggle on={respectCalendar} onClick={() => setRespectCalendar((v) => !v)} />
        </div>

        <div className="flex items-center justify-between rounded-[12px] border border-border-subtle p-3.5">
          <div>
            <p className="text-[12.5px] font-medium text-ink flex items-center gap-1.5"><CalendarClock size={14} /> Include in team round robin</p>
            <p className="text-[11px] text-ink-muted mt-0.5">Add this page to the shared &quot;All&quot; pool — bookings auto-assign to a free rep.</p>
          </div>
          <Toggle on={roundRobin} onClick={() => setRoundRobin((v) => !v)} />
        </div>

        {canManage && (
          <div className="space-y-3 rounded-[12px] border border-border-subtle p-3.5">
            <p className="text-[12.5px] font-medium text-ink flex items-center gap-1.5"><Users size={14} /> Assigned hosts (round robin)</p>
            <p className="text-[11px] text-ink-muted -mt-1.5">Add teammates as hosts on this page. Bookings auto-assign a free one. You&apos;re always a host.</p>
            <MemberMultiSelect
              options={teamMembers.map((m) => ({ id: m.id, name: m.name, email: m.email }))}
              selected={memberIds}
              onChange={setMemberIds}
              placeholder="Search teammates to add…"
            />

            {/* Distribution method — equal vs priority-weighted. */}
            <div className="pt-1">
              <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Distribution method</p>
              <div className="flex items-center rounded-[10px] bg-section border border-border-subtle p-0.5">
                {([["equal", "Equal distribution"], ["priority", "Allocate on priority"]] as const).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setDistribution(v)}
                    className={cn(
                      "flex-1 px-2.5 py-1.5 rounded-[8px] text-[11.5px] font-medium transition-colors",
                      distribution === v ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink-secondary",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-ink-muted mt-1.5">
                {distribution === "equal"
                  ? "Bookings spread evenly across free hosts (least-loaded first). No priorities needed."
                  : "Higher-priority hosts are booked first; lower tiers only fill in when no higher one is free."}
              </p>
            </div>

            {/* Priority per host — only when allocating on priority. */}
            {distribution === "priority" && (
            <div className="space-y-1 pt-1">
              <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Priority</p>
              {[ownerId, ...memberIds.filter((id) => id !== ownerId)].filter(Boolean).map((id) => {
                const m = teamMembers.find((x) => x.id === id);
                const name = m?.name || (id === myId ? "You" : "Teammate");
                return (
                  <div key={id} className="flex items-center gap-2.5 py-1">
                    <MemberAvatar id={id} name={name} className="w-[22px] h-[22px] text-[9px]" />
                    <span className="flex-1 min-w-0 text-[12.5px] text-ink truncate">
                      {name}{id === myId && <span className="text-ink-muted"> (you)</span>}
                    </span>
                    <span className="inline-flex items-center gap-1 text-ink-faint">
                      <Star size={12} className="fill-current text-accent" />
                    </span>
                    <NativeSelect
                      value={String(priorities[id] ?? 3)}
                      onChange={(e) => setPriorities((prev) => ({ ...prev, [id]: Number(e.target.value) }))}
                      className="w-[110px] px-2 py-1 rounded-[8px] bg-section border border-border-subtle text-[11.5px] text-ink focus:outline-none focus:border-border-default"
                    >
                      {PRIORITY_TIERS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                    </NativeSelect>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}

        {canManage && (
          <div className="rounded-[12px] border border-border-subtle p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12.5px] font-medium text-ink flex items-center gap-1.5"><Globe size={14} /> Public booking link</p>
                <p className="text-[11px] text-ink-muted mt-0.5">Anyone with the link can book — no login needed.</p>
              </div>
              <Toggle on={isPublic} onClick={() => setIsPublic((v) => !v)} />
            </div>
            {isPublic && (publicUrl ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] bg-section border border-border-subtle text-[11.5px] text-ink-secondary min-w-0">
                  <Link2 size={12} className="text-ink-muted shrink-0" />
                  <span className="truncate">{publicUrl}</span>
                </div>
                <button type="button"
                  onClick={() => { navigator.clipboard.writeText(publicUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90">
                  {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-ink-faint">Save the page to generate the shareable link.</p>
            ))}
          </div>
        )}

        <div>
          <label className={lab}>Weekly hours ({timezone.replace(/_/g, " ")})</label>
          <WeeklyHoursEditor value={availability} onChange={setAvailability} />
        </div>

        <div>
          <label className={lab}>Minimum notice</label>
          <p className="text-[11px] text-ink-muted -mt-1 mb-2">How far in advance a slot must be booked. Pick a preset or set your own.</p>
          <MinNoticeField value={minNoticeMin} onChange={setMinNoticeMin} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lab}>Bookable up to</label>
            <NativeSelect value={String(maxDaysAhead)} onChange={(e) => setMaxDaysAhead(Number(e.target.value))} className={inp}>
              <option value={14}>2 weeks</option><option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days</option>
            </NativeSelect>
          </div>
          <div>
            <label className={lab}>Buffer before</label>
            <NativeSelect value={String(bufferBeforeMin)} onChange={(e) => setBufferBeforeMin(Number(e.target.value))} className={inp}>
              <option value={0}>None</option><option value={5}>5 min</option><option value={10}>10 min</option><option value={15}>15 min</option><option value={30}>30 min</option>
            </NativeSelect>
          </div>
          <div>
            <label className={lab}>Buffer after</label>
            <NativeSelect value={String(bufferAfterMin)} onChange={(e) => setBufferAfterMin(Number(e.target.value))} className={inp}>
              <option value={0}>None</option><option value={5}>5 min</option><option value={10}>10 min</option><option value={15}>15 min</option><option value={30}>30 min</option>
            </NativeSelect>
          </div>
        </div>

        {error && <p className="text-[12px] text-signal-red-text">{error}</p>}
      </fieldset>
    </div>
  );
}
