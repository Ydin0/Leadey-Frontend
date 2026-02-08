"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectPillsProps {
  label?: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  grouped?: Record<string, string[]>;
  placeholder?: string;
}

export function MultiSelectPills({ label, options, selected, onChange, grouped, placeholder }: MultiSelectPillsProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const allOptions = grouped ? Object.values(grouped).flat() : options;
  const filtered = allOptions.filter(
    (o) => !selected.includes(o) && o.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
    setSearch("");
  }

  return (
    <div>
      {label && <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">{label}</label>}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {selected.map((item) => (
          <button
            key={item}
            onClick={() => toggle(item)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-signal-blue text-signal-blue-text text-[11px] font-medium hover:bg-signal-blue/80 transition-colors"
          >
            {item}
            <X size={10} strokeWidth={2} />
          </button>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder || "Type to search..."}
          className="w-full px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink outline-none placeholder:text-ink-faint border border-border-subtle focus:border-signal-blue-text/30"
        />
        {open && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface rounded-[10px] border border-border-subtle shadow-sm max-h-48 overflow-y-auto z-10">
            {grouped
              ? Object.entries(grouped).map(([group, items]) => {
                  const groupFiltered = items.filter(
                    (i) => !selected.includes(i) && i.toLowerCase().includes(search.toLowerCase())
                  );
                  if (groupFiltered.length === 0) return null;
                  return (
                    <div key={group}>
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-ink-muted font-medium bg-section/50">{group}</div>
                      {groupFiltered.map((item) => (
                        <button
                          key={item}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => toggle(item)}
                          className="w-full text-left px-3 py-1.5 text-[12px] text-ink hover:bg-hover transition-colors"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  );
                })
              : filtered.map((item) => (
                  <button
                    key={item}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggle(item)}
                    className="w-full text-left px-3 py-1.5 text-[12px] text-ink hover:bg-hover transition-colors"
                  >
                    {item}
                  </button>
                ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
