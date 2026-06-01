"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeamMembers } from "@/hooks/use-team-members";

interface OpportunityFiltersProps {
  ownerFilter: string | "all";
  searchQuery: string;
  onOwnerChange: (value: string | "all") => void;
  onSearchChange: (value: string) => void;
}

/** Filter strip above the kanban. Stage filtering is implicit via the
 *  columns themselves, so this only exposes owner + free-text search. */
export function OpportunityFilters({
  ownerFilter,
  searchQuery,
  onOwnerChange,
  onSearchChange,
}: OpportunityFiltersProps) {
  const { members } = useTeamMembers();

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="flex items-center gap-2 bg-section border border-border-subtle rounded-full px-3 py-1.5 min-w-[260px]">
        <Search size={13} strokeWidth={1.5} className="text-ink-muted shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search opportunities…"
          className="bg-transparent text-[12px] text-ink outline-none w-full placeholder:text-ink-faint"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="text-ink-faint hover:text-ink-muted"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
          Owner
        </span>
        <button
          type="button"
          onClick={() => onOwnerChange("all")}
          className={pillClass(ownerFilter === "all")}
        >
          All
        </button>
        {members.slice(0, 6).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onOwnerChange(m.id)}
            className={pillClass(ownerFilter === m.id)}
          >
            {m.name || m.email || "—"}
          </button>
        ))}
      </div>
    </div>
  );
}

function pillClass(active: boolean): string {
  return cn(
    "px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors",
    active
      ? "bg-ink text-on-ink"
      : "bg-section text-ink-secondary hover:bg-hover",
  );
}
