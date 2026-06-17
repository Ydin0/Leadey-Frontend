"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Play, Copy, Pencil, Trash2, Search as SearchIcon, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { SavedSearch, TheirStackFilters } from "@/lib/types/scraper";

// ── Status presentation (mirrors the campaigns list status styling) ──────────
export type ScraperStatus = "running" | "completed" | "idle" | "error";

export const SCRAPER_STATUS_META: Record<ScraperStatus, { label: string; badge: string; dot: string }> = {
  running: { label: "Running", badge: "bg-signal-blue text-signal-blue-text", dot: "bg-signal-blue-text animate-pulse" },
  completed: { label: "Completed", badge: "bg-signal-green text-signal-green-text", dot: "bg-signal-green-text" },
  idle: { label: "Idle", badge: "bg-section text-ink-muted", dot: "bg-ink-muted" },
  error: { label: "Error", badge: "bg-signal-red text-signal-red-text", dot: "bg-signal-red-text" },
};

export function ScraperStatusBadge({ status }: { status: ScraperStatus }) {
  const m = SCRAPER_STATUS_META[status] ?? SCRAPER_STATUS_META.idle;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-medium rounded-full px-2 py-0.5", m.badge)}>
      <span className={cn("w-[5px] h-[5px] rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

export function getFilterSummaryPills(filters: TheirStackFilters): string[] {
  const pills: string[] = [];
  const titles = filters.job_title_pattern_or ?? filters.job_title_or;
  if (titles?.length) {
    pills.push(...titles.slice(0, 3));
    if (titles.length > 3) pills.push(`+${titles.length - 3}`);
  }
  if (filters.job_country_code_or?.length) {
    pills.push(...filters.job_country_code_or.slice(0, 3));
    if (filters.job_country_code_or.length > 3) pills.push(`+${filters.job_country_code_or.length - 3}`);
  }
  if (filters.job_seniority_or?.length) {
    pills.push(...filters.job_seniority_or.slice(0, 2).map((s) => s.charAt(0).toUpperCase() + s.slice(1)));
  }
  if (filters.remote === true) pills.push("Remote");
  if (filters.industry_or?.length) pills.push(filters.industry_or[0]);
  return pills;
}

export function FilterPills({ filters }: { filters: TheirStackFilters }) {
  const pills = getFilterSummaryPills(filters);
  if (pills.length === 0) {
    return <span className="text-[10px] text-ink-faint">No filters configured</span>;
  }
  return (
    <div className="flex items-center min-w-0 overflow-hidden flex-wrap gap-1">
      {pills.map((pill, i) => (
        <span
          key={i}
          className="inline-flex items-center bg-surface border border-border-subtle rounded-full px-2 py-[3px] text-[10px] text-ink-secondary whitespace-nowrap"
        >
          {pill}
        </span>
      ))}
    </div>
  );
}

interface SearchActionsMenuProps {
  search: SavedSearch;
  onRun: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

/** The "…" dropdown shared by the list rows and grid cards. */
export function SearchActionsMenu({ search, onRun, onDuplicate, onDelete }: SearchActionsMenuProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
        className="p-1.5 rounded-md hover:bg-hover/50 text-ink-muted transition-colors"
      >
        <MoreHorizontal size={15} />
      </button>
      {menuOpen && (
        <div className="absolute right-0 top-9 z-30 w-36 bg-surface rounded-[10px] border border-border-default shadow-lg shadow-black/20 py-1">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); router.push(`/dashboard/scrapers/${search.id}/edit`); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-ink hover:bg-hover/50"
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onRun(search.id); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-ink hover:bg-hover/50"
          >
            <Play size={12} /> Run Now
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDuplicate(search.id); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-ink hover:bg-hover/50"
          >
            <Copy size={12} /> Duplicate
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(search.id); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-signal-red-text hover:bg-hover/50"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function freqLabel(frequency: SavedSearch["frequency"]): string {
  if (!frequency) return "Manual run";
  return frequency.charAt(0).toUpperCase() + frequency.slice(1);
}

interface SearchCardProps {
  search: SavedSearch;
  onRun: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  isRunning?: boolean;
}

/** Grid-view card — mirrors the campaigns grid card layout. */
export function SearchCard({ search, onRun, onDuplicate, onDelete, isRunning }: SearchCardProps) {
  const router = useRouter();
  const displayStatus = (isRunning ? "running" : search.status) as ScraperStatus;

  return (
    <div
      onClick={() => router.push(`/dashboard/scrapers/${search.id}`)}
      className="rounded-[14px] border border-border-subtle bg-surface p-[18px] block hover:border-border-default transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-[11px] min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-[10px] bg-section shrink-0">
            <SearchIcon size={16} strokeWidth={1.5} className="text-ink-muted" />
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-ink truncate">{search.searchName}</div>
            <div className="text-[12px] text-ink-muted truncate mt-0.5">{freqLabel(search.frequency)}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ScraperStatusBadge status={displayStatus} />
          <SearchActionsMenu search={search} onRun={onRun} onDuplicate={onDuplicate} onDelete={onDelete} />
        </div>
      </div>

      <div className="mt-3.5">
        <FilterPills filters={search.filters} />
      </div>

      <div className="flex items-center gap-7 mt-4 pt-3.5 border-t border-border-subtle">
        {[
          { v: search.signalsFound.toLocaleString(), l: "Results", c: "text-ink" },
          { v: search.companiesFound.toLocaleString(), l: "Companies", c: "text-ink" },
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
            {search.lastRunAt ? `Last run ${formatRelativeTime(search.lastRunAt)}` : "Never run"}
          </div>
          <div className="text-[11px] text-ink-faint mt-0.5">
            {new Date(search.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRun(search.id); }}
          disabled={isRunning}
          className="inline-flex items-center gap-1.5 rounded-full bg-section border border-border-subtle px-3 py-1.5 text-[11px] font-medium text-ink-secondary hover:border-border-default transition-colors disabled:opacity-50"
        >
          {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          {isRunning ? "Running" : "Run"}
        </button>
      </div>
    </div>
  );
}
