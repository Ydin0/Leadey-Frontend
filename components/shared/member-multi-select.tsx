"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { MemberAvatar } from "./member-avatar";

export interface MemberOption {
  id: string;
  name: string;
  email?: string;
}

interface MemberMultiSelectProps {
  label?: string;
  options: MemberOption[];
  /** Selected member ids. */
  selected: string[];
  onChange: (ids: string[]) => void;
  /** Fixed, non-removable pills shown first (e.g. the campaign owner). */
  pinned?: { id: string; name: string; note?: string }[];
  placeholder?: string;
}

/** Searchable id+avatar multi-select for team members — used by the campaign
 *  wizard (assigned people) and the Team analytics rep filter. Mirrors
 *  MultiSelectPills but carries ids + avatars instead of plain strings. */
export function MemberMultiSelect({ label, options, selected, onChange, pinned = [], placeholder }: MemberMultiSelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const pinnedIds = useMemo(() => new Set(pinned.map((p) => p.id)), [pinned]);
  const q = search.trim().toLowerCase();
  const filtered = options.filter(
    (o) =>
      !selected.includes(o.id) &&
      !pinnedIds.has(o.id) &&
      (o.name.toLowerCase().includes(q) || (o.email || "").toLowerCase().includes(q)),
  );

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
    setSearch("");
  }

  return (
    <div>
      {label && <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">{label}</label>}
      {(pinned.length > 0 || selected.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {pinned.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary">
              <MemberAvatar id={p.id} name={p.name} size="xs" />
              {p.name}{p.note ? ` (${p.note})` : ""}
            </span>
          ))}
          {selected.map((id) => {
            const m = byId.get(id);
            return (
              <button
                key={id}
                onClick={() => toggle(id)}
                className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-signal-blue text-signal-blue-text text-[11px] font-medium hover:bg-signal-blue/80 transition-colors"
              >
                <MemberAvatar id={id} name={m?.name} size="xs" />
                {m?.name ?? "Unknown"}
                <X size={10} strokeWidth={2} />
              </button>
            );
          })}
        </div>
      )}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder || "Search people…"}
          className="w-full px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink outline-none placeholder:text-ink-faint border border-border-subtle focus:border-signal-blue-text/30"
        />
        {open && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface rounded-[10px] border border-border-subtle shadow-sm max-h-56 overflow-y-auto z-20">
            {filtered.slice(0, 50).map((o) => (
              <button
                key={o.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggle(o.id)}
                className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-[12px] text-ink hover:bg-hover transition-colors"
              >
                <MemberAvatar id={o.id} name={o.name} size="xs" />
                <span className="truncate">{o.name}</span>
                {o.email && <span className="ml-auto pl-2 text-[10px] text-ink-faint truncate max-w-[45%]">{o.email}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
