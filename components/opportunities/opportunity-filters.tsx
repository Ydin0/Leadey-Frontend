"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, ChevronDown, Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeamMembers } from "@/hooks/use-team-members";

interface OpportunityFiltersProps {
  /** Selected owner ids. Empty array = all owners. */
  ownerFilter: string[];
  searchQuery: string;
  onOwnerChange: (value: string[]) => void;
  onSearchChange: (value: string) => void;
}

/** Filter strip above the kanban. Stage filtering is implicit via the
 *  columns themselves, so this only exposes owner (multi-select) + search. */
export function OpportunityFilters({
  ownerFilter,
  searchQuery,
  onOwnerChange,
  onSearchChange,
}: OpportunityFiltersProps) {
  const { members } = useTeamMembers();
  const [open, setOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectedSet = new Set(ownerFilter);
  function toggle(id: string) {
    if (selectedSet.has(id)) onOwnerChange(ownerFilter.filter((x) => x !== id));
    else onOwnerChange([...ownerFilter, id]);
  }

  const filteredMembers = memberSearch.trim()
    ? members.filter((m) =>
        `${m.name || ""} ${m.email || ""}`.toLowerCase().includes(memberSearch.trim().toLowerCase()),
      )
    : members;

  const label =
    ownerFilter.length === 0
      ? "All owners"
      : ownerFilter.length === 1
        ? members.find((m) => m.id === ownerFilter[0])?.name ||
          members.find((m) => m.id === ownerFilter[0])?.email ||
          "1 owner"
        : `${ownerFilter.length} owners`;

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

      {/* Owner multi-select */}
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors",
            ownerFilter.length > 0
              ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
              : "bg-section text-ink-secondary border-border-subtle hover:bg-hover",
          )}
        >
          <Users size={12} />
          <span className="max-w-[160px] truncate">{label}</span>
          {ownerFilter.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onOwnerChange([]); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onOwnerChange([]); } }}
              className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-signal-blue/20"
              title="Clear owner filter"
            >
              <X size={11} />
            </span>
          )}
          <ChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1.5 w-[260px] bg-surface rounded-[12px] border border-border-subtle shadow-lg z-30 overflow-hidden">
            <div className="p-2 border-b border-border-subtle">
              <div className="flex items-center gap-2 bg-section rounded-[8px] px-2.5 py-1.5">
                <Search size={12} className="text-ink-faint shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Find a member…"
                  className="bg-transparent text-[11.5px] text-ink outline-none w-full placeholder:text-ink-faint"
                />
              </div>
            </div>

            <div className="max-h-[280px] overflow-y-auto py-1">
              {filteredMembers.length === 0 ? (
                <p className="px-3 py-2 text-[11px] text-ink-muted">No members found.</p>
              ) : (
                filteredMembers.map((m) => {
                  const checked = selectedSet.has(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggle(m.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-hover transition-colors text-left"
                    >
                      <span
                        className={cn(
                          "w-4 h-4 rounded-[5px] border flex items-center justify-center shrink-0 transition-colors",
                          checked
                            ? "bg-signal-blue-text border-signal-blue-text"
                            : "border-border-default bg-section",
                        )}
                      >
                        {checked && <Check size={11} className="text-on-ink" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[12px] text-ink truncate">
                          {m.name || m.email || "—"}
                        </span>
                        {m.name && m.email && (
                          <span className="block text-[10.5px] text-ink-muted truncate">{m.email}</span>
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {ownerFilter.length > 0 && (
              <div className="p-2 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => onOwnerChange([])}
                  className="w-full text-[11px] font-medium text-ink-muted hover:text-ink-secondary py-1 transition-colors"
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
