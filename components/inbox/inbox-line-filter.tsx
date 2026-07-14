"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, X, Check, Phone, Search } from "lucide-react";
import { cn, formatPhoneNumber } from "@/lib/utils";
import { MemberAvatar } from "@/components/shared/member-avatar";
import type { PhoneLine } from "@/lib/types/calling";

/** Row marker showing which of our numbers a call/text hit + whose it is. */
export function LineMarker({ number, ownerId, ownerName, currentUserId }: {
  number?: string | null;
  ownerId?: string | null;
  ownerName?: string | null;
  currentUserId?: string | null;
}) {
  if (!number) return null;
  const who = ownerId && ownerId === currentUserId ? "You" : ownerName || (ownerId ? "Assigned" : "Unassigned");
  return (
    <span
      title={`To ${formatPhoneNumber(number)} · ${who}`}
      className="hidden sm:inline-flex items-center gap-1.5 shrink-0 pl-1 pr-2 py-0.5 rounded-full bg-section border border-border-subtle max-w-[190px]"
    >
      {ownerId ? (
        <MemberAvatar id={ownerId} name={ownerName || undefined} className="w-[16px] h-[16px] text-[7px]" />
      ) : (
        <span className="w-[16px] h-[16px] rounded-full bg-surface border border-border-subtle flex items-center justify-center text-ink-faint"><Phone size={9} /></span>
      )}
      <span className="text-[10px] text-ink-secondary tabular-nums truncate">{formatPhoneNumber(number)}</span>
    </span>
  );
}

/** Multi-select "Numbers" filter for the inbox. Empty `selected` = All numbers.
 *  Each line is shown with the owner's avatar + name (or "Unassigned") so reps
 *  can see who owns each number and focus on their own line(s). */
export function InboxLineFilter({
  lines,
  selected,
  onChange,
  currentUserId,
}: {
  lines: PhoneLine[];
  selected: string[];
  onChange: (ids: string[]) => void;
  currentUserId: string | null;
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

  const selectedSet = new Set(selected);
  const myLineIds = lines.filter((l) => l.assignedTo && l.assignedTo === currentUserId).map((l) => l.id);
  const isMine = myLineIds.length > 0 && selected.length === myLineIds.length && myLineIds.every((id) => selectedSet.has(id));

  const label =
    selected.length === 0 ? "All numbers"
    : isMine ? "My numbers"
    : selected.length === 1 ? (formatPhoneNumber(lines.find((l) => l.id === selected[0])?.number || "") || "1 number")
    : `${selected.length} numbers`;

  const ownerLabel = (l: PhoneLine) =>
    l.assignedTo === currentUserId ? "You" : l.assignedToName || (l.assignedTo ? "Assigned" : "Unassigned");

  const filtered = q.trim()
    ? lines.filter((l) =>
        formatPhoneNumber(l.number).toLowerCase().includes(q.trim().toLowerCase()) ||
        (l.assignedToName || "").toLowerCase().includes(q.trim().toLowerCase()))
    : lines;

  function toggle(id: string) {
    onChange(selectedSet.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full pl-3 pr-2 py-1.5 border text-[12px] font-medium transition-colors",
          selected.length > 0
            ? "bg-section border-border-default text-ink"
            : "bg-transparent border-border-subtle text-ink-secondary hover:border-border-default",
        )}
      >
        <Phone size={12} className="text-ink-muted" />
        <span className="max-w-[160px] truncate">{label}</span>
        {selected.length > 0 && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange([]); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onChange([]); } }}
            className="-mr-0.5 p-0.5 rounded-full hover:bg-hover"
            title="Show all numbers"
          >
            <X size={11} />
          </span>
        )}
        <ChevronDown size={13} className={cn("text-ink-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-30 w-[300px] bg-surface rounded-[12px] border border-border-subtle shadow-lg overflow-hidden">
          {lines.length > 6 && (
            <div className="p-2 border-b border-border-subtle">
              <div className="flex items-center gap-2 bg-section rounded-[8px] px-2.5 py-1.5">
                <Search size={12} className="text-ink-faint shrink-0" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Find a number or rep…"
                  className="bg-transparent text-[11.5px] text-ink outline-none w-full placeholder:text-ink-faint"
                />
              </div>
            </div>
          )}

          {/* Quick scopes */}
          <div className="py-1 border-b border-border-subtle">
            <button
              type="button"
              onClick={() => { onChange([]); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-hover transition-colors text-left"
            >
              <span className={cn("w-4 h-4 rounded-full border flex items-center justify-center shrink-0", selected.length === 0 ? "bg-signal-blue-text border-signal-blue-text" : "border-border-default")}>
                {selected.length === 0 && <Check size={11} className="text-on-ink" strokeWidth={3} />}
              </span>
              <span className="text-[12px] text-ink flex-1">All numbers</span>
            </button>
            {myLineIds.length > 0 && (
              <button
                type="button"
                onClick={() => { onChange(myLineIds); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-hover transition-colors text-left"
              >
                <span className={cn("w-4 h-4 rounded-full border flex items-center justify-center shrink-0", isMine ? "bg-signal-blue-text border-signal-blue-text" : "border-border-default")}>
                  {isMine && <Check size={11} className="text-on-ink" strokeWidth={3} />}
                </span>
                <span className="text-[12px] text-ink flex-1">My numbers</span>
                <span className="text-[10.5px] text-ink-faint">{myLineIds.length}</span>
              </button>
            )}
          </div>

          <div className="max-h-[320px] overflow-y-auto overscroll-contain py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-ink-muted">No numbers found.</p>
            ) : (
              filtered.map((l) => {
                const checked = selectedSet.has(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggle(l.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-hover transition-colors text-left"
                  >
                    <span className={cn(
                      "w-4 h-4 rounded-[5px] border flex items-center justify-center shrink-0 transition-colors",
                      checked ? "bg-signal-blue-text border-signal-blue-text" : "border-border-default bg-section",
                    )}>
                      {checked && <Check size={11} className="text-on-ink" strokeWidth={3} />}
                    </span>
                    {l.assignedTo ? (
                      <MemberAvatar id={l.assignedTo} name={l.assignedToName || undefined} className="w-[22px] h-[22px] text-[9px]" />
                    ) : (
                      <span className="w-[22px] h-[22px] rounded-full bg-section border border-border-subtle flex items-center justify-center shrink-0 text-ink-faint"><Phone size={11} /></span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] text-ink truncate">{formatPhoneNumber(l.number)}</span>
                      <span className={cn("block text-[10px] truncate", l.assignedTo ? "text-ink-muted" : "text-ink-faint italic")}>{ownerLabel(l)}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
