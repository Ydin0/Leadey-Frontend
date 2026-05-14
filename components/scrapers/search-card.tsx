"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Play, Copy, Pencil, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { formatRelativeTime } from "@/lib/utils";
import type { SavedSearch, TheirStackFilters } from "@/lib/types/scraper";

interface SearchCardProps {
  search: SavedSearch;
  onRun: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  isRunning?: boolean;
}

function getFilterSummaryPills(filters: TheirStackFilters): string[] {
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

const statusDot: Record<string, string> = {
  running: "bg-signal-blue animate-pulse",
  completed: "bg-signal-green",
  idle: "bg-ink-faint",
  error: "bg-signal-red",
};

export function SearchCard({ search, onRun, onDuplicate, onDelete, isRunning }: SearchCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const pills = getFilterSummaryPills(search.filters);
  const displayStatus = isRunning ? "running" : search.status;

  return (
    <div
      className="bg-surface rounded-[14px] border border-border-subtle p-4 hover:border-border-default transition-colors cursor-pointer group"
      onClick={() => router.push(`/dashboard/scrapers/${search.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[displayStatus] || statusDot.idle}`} />
          <h3 className="text-[13px] font-medium text-ink truncate">{search.searchName}</h3>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="p-1 rounded-md hover:bg-hover/50 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-20 w-36 bg-surface rounded-lg border border-border-subtle shadow-lg py-1">
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
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1 mb-3">
        {pills.map((pill, i) => (
          <span
            key={i}
            className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-section text-ink-secondary"
          >
            {pill}
          </span>
        ))}
        {pills.length === 0 && (
          <span className="text-[10px] text-ink-faint">No filters configured</span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-[10px] text-ink-muted">
        <span>{search.signalsFound.toLocaleString()} results</span>
        <span className="text-border-default">&middot;</span>
        <span>{search.companiesFound.toLocaleString()} companies</span>
        {search.lastRunAt && (
          <>
            <span className="text-border-default">&middot;</span>
            <span>{formatRelativeTime(search.lastRunAt)}</span>
          </>
        )}
      </div>
    </div>
  );
}
