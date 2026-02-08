"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  label?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}

export function TagInput({ label, tags, onChange, placeholder, suggestions }: TagInputProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = suggestions?.filter(
    (s) => !tags.includes(s) && s.toLowerCase().includes(input.toLowerCase())
  ) ?? [];

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && input === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div>
      {label && <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">{label}</label>}
      <div className="flex flex-wrap gap-1.5 p-2 rounded-[10px] bg-section border border-border-subtle focus-within:border-signal-blue-text/30">
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-signal-blue text-signal-blue-text text-[11px] font-medium">
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-signal-blue-text/70">
              <X size={10} strokeWidth={2} />
            </button>
          </span>
        ))}
        <div className="relative flex-1 min-w-[100px]">
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder={tags.length === 0 ? (placeholder || "Type and press Enter...") : ""}
            className="w-full bg-transparent text-[12px] text-ink outline-none placeholder:text-ink-faint py-0.5"
          />
          {showSuggestions && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-surface rounded-[10px] border border-border-subtle shadow-sm max-h-36 overflow-y-auto z-10">
              {filtered.map((s) => (
                <button
                  key={s}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTag(s)}
                  className="w-full text-left px-3 py-1.5 text-[12px] text-ink hover:bg-hover transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
