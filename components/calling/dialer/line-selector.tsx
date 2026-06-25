"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, ChevronsUpDown, Check, Search } from "lucide-react";
import { cn, formatPhoneIntl } from "@/lib/utils";
import { useCallContext } from "@/components/calling/call-context";

/** Returns the line's friendly name only when it's a real label —
 *  not just the phone number repeated (a very common case). */
function lineLabel(friendlyName: string | undefined, number: string): string | null {
  if (!friendlyName) return null;
  const digits = (s: string) => s.replace(/\D/g, "");
  if (digits(friendlyName) === digits(number)) return null;
  return friendlyName;
}

export function LineSelector() {
  const { phoneLines, selectedLineId, setSelectedLineId } = useCallContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const activeLines = phoneLines.filter((l) => l.status === "active");
  const q = query.trim().toLowerCase();
  const visibleLines = q
    ? activeLines.filter(
        (l) =>
          l.number.replace(/\D/g, "").includes(q.replace(/\D/g, "")) ||
          (l.friendlyName || "").toLowerCase().includes(q),
      )
    : activeLines;

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (activeLines.length === 0) return null;

  const selected = activeLines.find((l) => l.id === selectedLineId) ?? null;
  const canSwitch = activeLines.length > 1;

  return (
    <div ref={ref}>
      <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1">
        Calling from
      </label>

      <button
        type="button"
        onClick={() => { if (canSwitch) { setQuery(""); setOpen((v) => !v); } }}
        className={cn(
          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[12px] bg-section border border-border-subtle text-left transition-colors",
          canSwitch && "hover:bg-hover focus:outline-none focus:border-signal-blue-text/30",
          !canSwitch && "cursor-default",
        )}
      >
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-signal-green/15 shrink-0">
          <Phone size={13} strokeWidth={2} className="text-signal-green-text" />
        </span>
        <span className="min-w-0 flex-1">
          {selected ? (
            <>
              <span className="block text-[13px] font-semibold text-ink leading-tight tabular-nums truncate">
                {formatPhoneIntl(selected.number)}
              </span>
              <span className="block text-[10px] text-ink-muted truncate">
                {lineLabel(selected.friendlyName, selected.number) ?? "Your number"}
              </span>
            </>
          ) : (
            <span className="block text-[12px] text-ink-muted">Select a number</span>
          )}
        </span>
        {canSwitch && (
          <ChevronsUpDown size={14} strokeWidth={2} className="text-ink-faint shrink-0" />
        )}
      </button>

      {open && canSwitch && (
        <div className="relative">
          <div className="absolute left-0 right-0 top-1.5 z-50 bg-surface rounded-[12px] border border-border-default shadow-xl py-1.5 max-h-72 overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Your numbers</span>
              <span className="text-[10px] text-ink-faint tabular-nums">{visibleLines.length}/{activeLines.length}</span>
            </div>
            {activeLines.length > 6 && (
              <div className="px-2 pb-1.5">
                <div className="flex items-center gap-1.5 bg-section border border-border-subtle rounded-[8px] px-2 py-1.5">
                  <Search size={12} className="text-ink-faint shrink-0" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search number or label…"
                    className="bg-transparent border-0 outline-0 text-[12px] text-ink placeholder:text-ink-faint w-full"
                  />
                </div>
              </div>
            )}
            {visibleLines.length === 0 && (
              <div className="px-3 py-3 text-[11px] text-ink-faint">No numbers match.</div>
            )}
            {visibleLines.map((line) => {
              const label = lineLabel(line.friendlyName, line.number);
              const isSelected = line.id === selectedLineId;
              return (
                <button
                  key={line.id}
                  type="button"
                  onClick={() => {
                    setSelectedLineId(line.id);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-hover transition-colors text-left"
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-section shrink-0">
                    <Phone size={13} strokeWidth={2} className="text-ink-muted" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-ink leading-tight tabular-nums truncate">
                      {formatPhoneIntl(line.number)}
                    </span>
                    {label && (
                      <span className="block text-[10px] text-ink-muted truncate">{label}</span>
                    )}
                  </span>
                  {isSelected && (
                    <Check size={14} strokeWidth={2.5} className="text-signal-green-text shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
