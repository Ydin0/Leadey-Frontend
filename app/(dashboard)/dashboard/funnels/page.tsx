"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Search, ArrowUpDown, ChevronDown, Check, List, LayoutGrid,
  GitFork, Phone, Mail, Linkedin, MessageSquare, ArrowRight, X, SearchX, CheckSquare,
} from "lucide-react";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { useFunnels } from "@/lib/queries/use-funnels";
import { usePrefetchFunnel } from "@/lib/queries/use-prefetch";
import { useTeamMembers } from "@/hooks/use-team-members";
import { cn } from "@/lib/utils";
import type { Funnel, FunnelChannel, FunnelStatus } from "@/lib/types/funnel";

// ── Channel + status presentation ────────────────────────────────────────────
const STEP_META: Record<FunnelChannel, { icon: typeof Mail; color: string }> = {
  call: { icon: Phone, color: "text-signal-green-text" },
  email: { icon: Mail, color: "text-ink-muted" },
  linkedin: { icon: Linkedin, color: "text-linkedin" },
  whatsapp: { icon: MessageSquare, color: "text-signal-green-text" },
  sms: { icon: MessageSquare, color: "text-signal-green-text" },
  task: { icon: CheckSquare, color: "text-ink-secondary" },
};

const CHANNEL_DEFS: { id: FunnelChannel; label: string; icon: typeof Mail }[] = [
  { id: "linkedin", label: "LinkedIn", icon: Linkedin },
  { id: "email", label: "Email", icon: Mail },
  { id: "call", label: "Calling", icon: Phone },
];

const STATUS_META: Record<FunnelStatus, { label: string; badge: string; dot: string }> = {
  active: { label: "Active", badge: "bg-signal-green text-signal-green-text", dot: "bg-signal-green-text" },
  paused: { label: "Paused", badge: "bg-signal-slate text-signal-slate-text", dot: "bg-signal-slate-text" },
  draft: { label: "Draft", badge: "bg-section text-ink-muted", dot: "bg-ink-muted" },
};

const STATUS_TABS: { id: FunnelStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "draft", label: "Draft" },
  { id: "paused", label: "Paused" },
];

type SortKey = "recent" | "name" | "leads" | "reply";

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "recent", label: "Most recent" },
  { id: "name", label: "Name A–Z" },
  { id: "leads", label: "Most leads" },
  { id: "reply", label: "Reply rate" },
];

function channelsOf(f: Funnel): FunnelChannel[] {
  return [...new Set(f.steps.map((s) => s.channel))];
}

function StatusBadge({ status }: { status: FunnelStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-medium rounded-full px-2 py-0.5", m.badge)}>
      <span className={cn("w-[5px] h-[5px] rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

function StepFlow({ funnel, gap = 6 }: { funnel: Funnel; gap?: number }) {
  return (
    <div className="flex items-center min-w-0 overflow-hidden flex-wrap gap-y-1.5">
      {funnel.steps.map((step, i) => {
        const meta = STEP_META[step.channel] ?? STEP_META.email;
        const Icon = meta.icon;
        return (
          <div key={step.id} className="flex items-center shrink-0">
            {i > 0 && <span className="h-px bg-border-default shrink-0" style={{ width: gap }} />}
            <span className="inline-flex items-center gap-1 bg-surface border border-border-subtle rounded-full px-2 py-[3px] text-[10px] text-ink-secondary whitespace-nowrap shrink-0">
              <Icon size={11} strokeWidth={1.5} className={meta.color} />
              Day {step.dayOffset}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Overlapping avatar facepile (up to 4) + "+N" overflow.
function Facepile({ reps, size = "md" }: { reps: { id: string; name: string }[]; size?: "sm" | "md" }) {
  if (reps.length === 0) {
    return <span className="text-[11px] text-ink-faint">Unassigned</span>;
  }
  const shown = reps.slice(0, 4);
  const overflow = reps.slice(4);
  const dim = size === "md" ? "w-7 h-7 text-[10px]" : "w-6 h-6 text-[9px]";
  return (
    <div className="flex items-center pl-2" title={reps.map((r) => r.name).join(", ")}>
      {shown.map((r) => (
        <MemberAvatar
          key={r.id}
          id={r.id}
          name={r.name}
          className={cn("-ml-2 border-2 border-page transition-transform hover:-translate-y-0.5", dim)}
        />
      ))}
      {overflow.length > 0 && (
        <span
          className={cn(
            "-ml-2 rounded-full border-2 border-page bg-section text-ink-muted flex items-center justify-center shrink-0 font-semibold",
            dim,
          )}
          title={overflow.map((r) => r.name).join(", ")}
        >
          +{overflow.length}
        </span>
      )}
    </div>
  );
}

const LIST_COLS = "minmax(220px,1.4fr) 282px repeat(4,54px) 130px 148px";

export default function FunnelsPage() {
  const router = useRouter();
  // Shared funnels cache (same entry the sidebar uses) — repeat visits paint
  // instantly and campaign clicks reuse these rows as placeholders.
  const { data: funnelsData, isPending, error: funnelsError, refetch } = useFunnels();
  const prefetchFunnel = usePrefetchFunnel();
  const funnels = useMemo(() => funnelsData ?? [], [funnelsData]);
  const loading = isPending;
  const error = funnelsError
    ? funnelsError instanceof Error
      ? funnelsError.message
      : "Failed to load campaigns"
    : null;
  const { members: allMembers, resolveMember } = useTeamMembers();

  // Filter state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FunnelStatus | "all">("all");
  const [channels, setChannels] = useState<FunnelChannel[]>([]);
  const [reps, setReps] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("recent");
  const [sortOpen, setSortOpen] = useState(false);
  const [view, setView] = useState<"list" | "grid">("list");
  const sortRef = useRef<HTMLDivElement>(null);

  // Close the sort menu on outside click.
  useEffect(() => {
    if (!sortOpen) return;
    const onDown = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [sortOpen]);

  // Resolve each campaign's assigned reps to {id, name}.
  const repsByFunnel = useMemo(() => {
    const map = new Map<string, { id: string; name: string }[]>();
    for (const f of funnels) {
      map.set(
        f.id,
        f.members.map((m) => ({ id: m.teamMemberId, name: resolveMember(m.teamMemberId)?.name ?? "Unknown" })),
      );
    }
    return map;
  }, [funnels, resolveMember]);

  // The rep universe = the whole team roster (so you can filter by any rep to
  // see their campaigns), each annotated with how many campaigns they own.
  // Falls back to anyone assigned to a campaign but not in the roster.
  const repUniverse = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of funnels) {
      for (const m of f.members) counts.set(m.teamMemberId, (counts.get(m.teamMemberId) ?? 0) + 1);
    }
    const seen = new Set<string>();
    const list: { id: string; name: string; count: number }[] = [];
    for (const m of allMembers) {
      seen.add(m.id);
      list.push({ id: m.id, name: m.name, count: counts.get(m.id) ?? 0 });
    }
    for (const [id, count] of counts) {
      if (!seen.has(id)) list.push({ id, name: resolveMember(id)?.name ?? "Unknown", count });
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [funnels, allMembers, resolveMember]);

  // Apply search / channel / rep filters (status applied after, so tab counts reflect the rest).
  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return funnels.filter((f) => {
      const matchSearch = !q || f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q);
      const fChannels = channelsOf(f);
      const matchChannel = channels.length === 0 || channels.some((c) => fChannels.includes(c));
      const matchRep = reps.length === 0 || reps.some((id) => f.members.some((m) => m.teamMemberId === id));
      return matchSearch && matchChannel && matchRep;
    });
  }, [funnels, search, channels, reps]);

  const statusCount = (id: FunnelStatus | "all") =>
    id === "all" ? baseFiltered.length : baseFiltered.filter((f) => f.status === id).length;

  const visible = useMemo(() => {
    const list = baseFiltered.filter((f) => status === "all" || f.status === status);
    const cmp: Record<SortKey, (a: Funnel, b: Funnel) => number> = {
      recent: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      name: (a, b) => a.name.localeCompare(b.name),
      leads: (a, b) => b.metrics.total - a.metrics.total,
      reply: (a, b) => b.metrics.replyRate - a.metrics.replyRate,
    };
    return [...list].sort(cmp[sort]);
  }, [baseFiltered, status, sort]);

  const toggleChannel = (id: FunnelChannel) =>
    setChannels((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleRep = (id: string) =>
    setReps((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const clearAll = () => { setSearch(""); setStatus("all"); setChannels([]); setReps([]); };

  // Active filter chips
  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (status !== "all") chips.push({ key: "status", label: STATUS_META[status].label, onRemove: () => setStatus("all") });
  channels.forEach((c) => chips.push({ key: `ch-${c}`, label: CHANNEL_DEFS.find((d) => d.id === c)?.label ?? c, onRemove: () => toggleChannel(c) }));
  reps.forEach((id) => chips.push({ key: `rep-${id}`, label: repUniverse.find((r) => r.id === id)?.name ?? "Rep", onRemove: () => toggleRep(id) }));
  if (search.trim()) chips.push({ key: "q", label: `“${search.trim()}”`, onRemove: () => setSearch("") });

  const resultText = visible.length === funnels.length
    ? `${funnels.length} campaign${funnels.length === 1 ? "" : "s"}`
    : `${visible.length} of ${funnels.length} campaigns`;

  return (
    <div className="max-w-[1640px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Campaigns</h1>
          <p className="text-[13px] text-ink-muted mt-0.5">Multi-channel outreach sequences to engage and convert leads</p>
        </div>
        <Link
          href="/dashboard/funnels/new"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-ink text-on-ink text-[12px] font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={14} strokeWidth={2} />
          Create Campaign
        </Link>
      </div>

      {/* Filter bar */}
      <div className="rounded-[14px] border border-border-subtle bg-surface/60 backdrop-blur-sm px-4 py-3.5">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-2 bg-surface border border-border-default rounded-full px-3.5 py-2 w-[280px]">
            <Search size={15} className="text-ink-muted shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns…"
              className="bg-transparent border-0 outline-0 text-[13px] text-ink placeholder:text-ink-faint w-full"
            />
          </div>

          {/* Status tabs */}
          <div className="flex items-center bg-section border border-border-subtle rounded-full p-[3px]">
            {STATUS_TABS.map((tab) => {
              const active = status === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatus(tab.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12px] font-medium transition-all",
                    active ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink-secondary",
                  )}
                >
                  {tab.label}
                  <span className="opacity-55 ml-1.5">{statusCount(tab.id)}</span>
                </button>
              );
            })}
          </div>

          <div className="grow" />

          {/* Sort dropdown */}
          <div ref={sortRef} className="relative">
            <button
              onClick={() => setSortOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-full bg-section border border-border-subtle px-3 py-2 text-[12px] text-ink-secondary hover:border-border-default transition-colors"
            >
              <ArrowUpDown size={13} />
              {SORT_OPTIONS.find((o) => o.id === sort)?.label}
              <ChevronDown size={13} className={cn("transition-transform", sortOpen && "rotate-180")} />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-11 z-50 min-w-[180px] bg-surface border border-border-default rounded-[10px] shadow-lg shadow-black/20 p-1.5">
                {SORT_OPTIONS.map((opt) => {
                  const active = sort === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => { setSort(opt.id); setSortOpen(false); }}
                      className={cn(
                        "flex items-center justify-between w-full rounded-md px-2.5 py-2 text-[12px] transition-colors",
                        active ? "bg-section text-ink" : "text-ink-secondary hover:bg-hover",
                      )}
                    >
                      {opt.label}
                      {active && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-section border border-border-subtle rounded-full p-[3px]">
            {[
              { id: "list" as const, icon: List, title: "List view" },
              { id: "grid" as const, icon: LayoutGrid, title: "Grid view" },
            ].map(({ id, icon: Icon, title }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                title={title}
                className={cn(
                  "flex items-center justify-center w-[30px] h-[26px] rounded-full transition-all",
                  view === id ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink-secondary",
                )}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>

        {/* Channel + rep filters */}
        <div className="flex items-center gap-3.5 flex-wrap mt-3 pt-3 border-t border-border-subtle">
          <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium whitespace-nowrap">Channel</span>
          <div className="flex items-center gap-2">
            {CHANNEL_DEFS.map(({ id, label, icon: Icon }) => {
              const active = channels.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleChannel(id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium border transition-colors",
                    active
                      ? "bg-section border-border-default text-ink"
                      : "bg-transparent border-border-subtle text-ink-muted hover:border-border-default",
                  )}
                >
                  <Icon size={13} strokeWidth={1.5} />
                  {label}
                </button>
              );
            })}
          </div>

          {repUniverse.length > 0 && (
            <>
              <div className="w-px h-[22px] bg-border-subtle" />
              <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium whitespace-nowrap">Assigned rep</span>
              <RepFilterDropdown reps={reps} universe={repUniverse} onToggle={toggleRep} onClear={() => setReps([])} />
            </>
          )}
        </div>
      </div>

      {/* Result line + active chips */}
      <div className="flex items-center justify-between mt-4 mb-3 px-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[13px] text-ink-secondary font-medium whitespace-nowrap">{resultText}</span>
          {chips.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  onClick={chip.onRemove}
                  className="inline-flex items-center gap-1.5 text-[11px] bg-section text-ink-secondary rounded-full px-2.5 py-1 hover:bg-hover transition-colors"
                >
                  {chip.label}
                  <X size={11} />
                </button>
              ))}
              <button onClick={clearAll} className="text-[11px] text-ink-muted px-1.5 py-1 hover:text-ink-secondary transition-colors">
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading / error */}
      {loading && (
        <div className="rounded-[14px] border border-border-subtle bg-surface p-6">
          <p className="text-[12px] text-ink-muted">Loading campaigns…</p>
        </div>
      )}
      {error && !loading && (
        <div className="rounded-[14px] border border-signal-red-text/25 bg-signal-red/10 p-5">
          <p className="text-[12px] font-medium text-signal-red-text mb-2">Could not load campaigns</p>
          <p className="text-[11px] text-ink-secondary mb-3">{error}</p>
          <button onClick={() => void refetch()} className="px-4 py-1.5 rounded-full bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 transition-opacity">
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && visible.length === 0 && (
        <div className="rounded-[14px] border border-border-subtle bg-surface px-10 py-14 text-center">
          <div className="flex items-center justify-center w-[52px] h-[52px] rounded-[14px] bg-section mx-auto mb-4">
            <SearchX size={22} className="text-ink-muted" />
          </div>
          <div className="text-[16px] font-semibold text-ink">No campaigns match your filters</div>
          <p className="text-[13px] text-ink-muted mt-1.5 max-w-[360px] mx-auto">
            Try removing a rep, channel, or status filter — or search a different term.
          </p>
          {chips.length > 0 && (
            <button onClick={clearAll} className="mt-4 inline-flex items-center rounded-full bg-section border border-border-subtle px-4 py-2 text-[12px] text-ink-secondary hover:border-border-default transition-colors">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* List view */}
      {!loading && !error && visible.length > 0 && view === "list" && (
        <div className="rounded-[14px] border border-border-subtle bg-surface overflow-hidden">
          {/* Column headers */}
          <div
            className="grid items-center gap-4 px-5 py-3 border-b border-border-subtle"
            style={{ gridTemplateColumns: LIST_COLS }}
          >
            {["Campaign", "Sequence", "Total", "Active", "Reply", "Done", "Source"].map((h) => (
              <span key={h} className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{h}</span>
            ))}
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted text-right">Assigned</span>
          </div>

          {visible.map((f) => {
            const fReps = repsByFunnel.get(f.id) ?? [];
            const primarySource = f.sources[0];
            return (
              <div
                key={f.id}
                onClick={() => router.push(`/dashboard/funnels/${f.id}`)}
                // Warm the route chunk + campaign data before the click.
                onMouseEnter={() => {
                  router.prefetch(`/dashboard/funnels/${f.id}`);
                  prefetchFunnel(f.id);
                }}
                className="group grid items-center gap-4 px-5 py-4 border-b border-border-subtle last:border-b-0 cursor-pointer hover:bg-accent/[0.05] transition-colors"
                style={{ gridTemplateColumns: LIST_COLS }}
              >
                {/* Campaign */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-section shrink-0">
                    <GitFork size={17} strokeWidth={1.5} className="text-ink-muted" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-ink truncate">{f.name}</span>
                      <StatusBadge status={f.status} />
                    </div>
                    <div className="text-[12px] text-ink-muted truncate mt-0.5">{f.description}</div>
                  </div>
                </div>

                {/* Sequence */}
                <StepFlow funnel={f} />

                {/* Metrics */}
                <div className="text-[14px] font-semibold text-ink">{f.metrics.total.toLocaleString()}</div>
                <div className="text-[14px] font-semibold text-ink">{f.metrics.active.toLocaleString()}</div>
                <div className={cn("text-[14px] font-semibold", f.metrics.replyRate > 0 ? "text-signal-green-text" : "text-ink-faint")}>
                  {f.metrics.replyRate}%
                </div>
                <div className="text-[14px] font-semibold text-ink-secondary">{f.metrics.completed}</div>

                {/* Source */}
                <div className="min-w-0">
                  <div className="text-[11px] text-ink-secondary truncate">
                    {primarySource ? `${primarySource.label} (${primarySource.count})` : "No sources"}
                  </div>
                  <div className="text-[11px] text-ink-faint mt-0.5">
                    {f.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </div>
                </div>

                {/* Assigned */}
                <div className="flex items-center justify-end gap-2">
                  <Facepile reps={fReps} />
                  <ArrowRight size={15} className="text-ink-muted opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Grid view */}
      {!loading && !error && visible.length > 0 && view === "grid" && (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(440px,1fr))" }}>
          {visible.map((f) => {
            const fReps = repsByFunnel.get(f.id) ?? [];
            const primarySource = f.sources[0];
            return (
              <Link
                key={f.id}
                href={`/dashboard/funnels/${f.id}`}
                onMouseEnter={() => prefetchFunnel(f.id)}
                className="rounded-[14px] border border-border-subtle bg-surface p-[18px] block hover:border-border-default transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-[11px] min-w-0">
                    <div className="flex items-center justify-center w-9 h-9 rounded-[10px] bg-section shrink-0">
                      <GitFork size={16} strokeWidth={1.5} className="text-ink-muted" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-ink truncate">{f.name}</div>
                      <div className="text-[12px] text-ink-muted truncate mt-0.5">{f.description}</div>
                    </div>
                  </div>
                  <StatusBadge status={f.status} />
                </div>

                <div className="mt-3.5">
                  <StepFlow funnel={f} gap={9} />
                </div>

                <div className="flex items-center gap-7 mt-4 pt-3.5 border-t border-border-subtle">
                  {[
                    { v: f.metrics.total.toLocaleString(), l: "Total", c: "text-ink" },
                    { v: f.metrics.active.toLocaleString(), l: "Active", c: "text-ink" },
                    { v: `${f.metrics.replyRate}%`, l: "Reply", c: f.metrics.replyRate > 0 ? "text-signal-green-text" : "text-ink-faint" },
                    { v: String(f.metrics.completed), l: "Done", c: "text-ink-secondary" },
                  ].map((m) => (
                    <div key={m.l}>
                      <div className={cn("text-[18px] font-semibold", m.c)}>{m.v}</div>
                      <div className="text-[10px] uppercase tracking-[0.06em] text-ink-muted mt-0.5">{m.l}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-border-subtle">
                  <div className="min-w-0">
                    <div className="text-[11px] text-ink-secondary truncate">
                      {primarySource ? `${primarySource.label} (${primarySource.count})` : "No sources"}
                    </div>
                    <div className="text-[11px] text-ink-faint mt-0.5">
                      {f.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-wider text-ink-muted font-medium">Team</span>
                    <Facepile reps={fReps} size="sm" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Leadey-styled multi-select for the "Assigned rep" filter — replaces the row
 *  of rep pills that got crowded with large teams. */
function RepFilterDropdown({ reps, universe, onToggle, onClear }: {
  reps: string[];
  universe: { id: string; name: string; count: number }[];
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const selectedSet = new Set(reps);
  const label =
    reps.length === 0 ? "All reps"
    : reps.length === 1 ? (universe.find((u) => u.id === reps[0])?.name ?? "1 rep")
    : `${reps.length} reps`;
  const filtered = q.trim()
    ? universe.filter((u) => u.name.toLowerCase().includes(q.trim().toLowerCase()))
    : universe;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full pl-3 pr-2 py-1.5 border text-[12px] font-medium transition-colors",
          reps.length > 0
            ? "bg-section border-border-default text-ink"
            : "bg-transparent border-border-subtle text-ink-secondary hover:border-border-default",
        )}
      >
        <span className="max-w-[160px] truncate">{label}</span>
        {reps.length > 0 && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onClear(); } }}
            className="-mr-0.5 p-0.5 rounded-full hover:bg-hover"
            title="Clear rep filter"
          >
            <X size={11} />
          </span>
        )}
        <ChevronDown size={13} className={cn("text-ink-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-30 w-[260px] bg-surface rounded-[12px] border border-border-subtle shadow-lg overflow-hidden">
          {universe.length > 6 && (
            <div className="p-2 border-b border-border-subtle">
              <div className="flex items-center gap-2 bg-section rounded-[8px] px-2.5 py-1.5">
                <Search size={12} className="text-ink-faint shrink-0" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Find a rep…"
                  className="bg-transparent text-[11.5px] text-ink outline-none w-full placeholder:text-ink-faint"
                />
              </div>
            </div>
          )}
          <div className="max-h-[300px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-ink-muted">No reps found.</p>
            ) : (
              filtered.map((r) => {
                const checked = selectedSet.has(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onToggle(r.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-hover transition-colors text-left"
                  >
                    <span className={cn(
                      "w-4 h-4 rounded-[5px] border flex items-center justify-center shrink-0 transition-colors",
                      checked ? "bg-signal-blue-text border-signal-blue-text" : "border-border-default bg-section",
                    )}>
                      {checked && <Check size={11} className="text-on-ink" strokeWidth={3} />}
                    </span>
                    <MemberAvatar id={r.id} name={r.name} className="w-[22px] h-[22px] text-[9px]" />
                    <span className="text-[12px] text-ink truncate flex-1">{r.name}</span>
                    <span className="text-[10.5px] text-ink-faint shrink-0">{r.count}</span>
                  </button>
                );
              })
            )}
          </div>
          {reps.length > 0 && (
            <div className="p-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={onClear}
                className="w-full text-[11px] font-medium text-ink-muted hover:text-ink-secondary py-1 transition-colors"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
