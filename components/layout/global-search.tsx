"use client";

import {
  Search,
  Send,
  UserRound,
  Briefcase,
  Building2,
  Contact,
  Users,
  Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { globalSearch } from "@/lib/api/search";
import type { SearchResult, SearchResultType } from "@/lib/types/search";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { cn } from "@/lib/utils";

const TYPE_META: Record<
  SearchResultType,
  { label: string; icon: typeof Search }
> = {
  campaign: { label: "Campaigns", icon: Send },
  lead: { label: "Leads", icon: UserRound },
  opportunity: { label: "Opportunities", icon: Briefcase },
  company: { label: "Companies", icon: Building2 },
  contact: { label: "Contacts", icon: Contact },
  member: { label: "Members", icon: Users },
};

const GROUP_ORDER: SearchResultType[] = [
  "campaign",
  "lead",
  "opportunity",
  "company",
  "contact",
  "member",
];

export function GlobalSearch() {
  const router = useRouter();
  const isAuthReady = useAuthReady();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced, abortable fetch driven by the query.
  useEffect(() => {
    const trimmed = query.trim();
    if (!isAuthReady || trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await globalSearch(trimmed, controller.signal);
        setResults(res.results);
        setActiveIndex(0);
      } catch {
        // Aborted or failed — leave previous results in place.
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, isAuthReady]);

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // ⌘K / Ctrl+K focuses the search from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function go(result: SearchResult) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(result.href);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[activeIndex];
      if (target) go(target);
    }
  }

  const showDropdown = open && query.trim().length >= 2;

  // Group results while preserving a flat index for keyboard nav.
  let flatIndex = -1;

  return (
    <div ref={containerRef} className="relative w-[320px] max-w-[40vw]">
      <div className="flex items-center gap-2 bg-section border border-border-subtle rounded-full px-4 py-1.5 transition-colors focus-within:border-border-default">
        <Search size={13} strokeWidth={1.5} className="text-ink-muted shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          placeholder="Search leads, companies, campaigns…"
          className="bg-transparent text-[12px] text-ink outline-none w-full placeholder:text-ink-faint"
        />
        {loading ? (
          <Loader2 size={13} className="text-ink-muted shrink-0 animate-spin" />
        ) : (
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-ink-faint border border-border-subtle rounded px-1 py-0.5 shrink-0">
            ⌘K
          </kbd>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 top-[calc(100%+6px)] w-[420px] max-w-[80vw] bg-surface border border-border-subtle rounded-[14px] shadow-xl overflow-hidden z-50">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12px] text-ink-muted">
              {loading ? "Searching…" : `No results for “${query.trim()}”`}
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto py-1.5">
              {GROUP_ORDER.map((type) => {
                const group = results.filter((r) => r.type === type);
                if (!group.length) return null;
                const Meta = TYPE_META[type];
                const GroupIcon = Meta.icon;
                return (
                  <div key={type} className="mb-1 last:mb-0">
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-ink-muted font-medium">
                      {Meta.label}
                    </div>
                    {group.map((r) => {
                      flatIndex += 1;
                      const idx = flatIndex;
                      return (
                        <button
                          key={`${r.type}-${r.id}`}
                          type="button"
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => go(r)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                            idx === activeIndex ? "bg-hover" : "hover:bg-hover",
                          )}
                        >
                          <span className="flex items-center justify-center size-7 rounded-full bg-section border border-border-subtle shrink-0">
                            <GroupIcon
                              size={13}
                              strokeWidth={1.5}
                              className="text-ink-secondary"
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12px] text-ink truncate">
                              {r.title}
                            </span>
                            {r.subtitle && (
                              <span className="block text-[11px] text-ink-muted truncate">
                                {r.subtitle}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
