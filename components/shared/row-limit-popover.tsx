"use client";

import { useState, useRef, useEffect } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface RowLimitPopoverProps {
  startingRow: number;
  rowLimit: number | null;
  totalItems: number;
  onApply: (startingRow: number, rowLimit: number | null) => void;
  /** Where the popover opens relative to the trigger. Default: "above" */
  position?: "above" | "below";
}

export function RowLimitPopover({
  startingRow,
  rowLimit,
  totalItems,
  onApply,
  position = "above",
}: RowLimitPopoverProps) {
  const [open, setOpen] = useState(false);
  const [localStart, setLocalStart] = useState(startingRow);
  const [localLimit, setLocalLimit] = useState<string>(
    rowLimit !== null ? String(rowLimit) : ""
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setLocalStart(startingRow);
      setLocalLimit(rowLimit !== null ? String(rowLimit) : "");
    }
  }, [open, startingRow, rowLimit]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  function handleSave() {
    const parsedLimit = localLimit.trim() === "" ? null : Math.max(1, parseInt(localLimit, 10) || 1);
    const parsedStart = Math.max(0, Math.floor(localStart) || 0);
    onApply(parsedStart, parsedLimit);
    setOpen(false);
  }

  function handleShowAll() {
    onApply(0, null);
    setOpen(false);
  }

  const isActive = startingRow > 0 || rowLimit !== null;

  const visibleCount =
    rowLimit !== null
      ? Math.min(rowLimit, Math.max(0, totalItems - startingRow))
      : Math.max(0, totalItems - startingRow);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[11px] font-medium border transition-colors",
          isActive
            ? "bg-signal-blue/10 text-signal-blue-text border-signal-blue/30"
            : "text-ink-secondary border-border-subtle hover:bg-hover"
        )}
      >
        <SlidersHorizontal size={11} strokeWidth={1.5} />
        {isActive
          ? `${visibleCount.toLocaleString()}/${totalItems.toLocaleString()} rows`
          : `${totalItems.toLocaleString()} rows`}
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 w-[220px] bg-surface rounded-[12px] border border-border-subtle shadow-lg p-3 z-30",
            position === "above" ? "bottom-full mb-2" : "top-full mt-2"
          )}
        >
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-ink mb-1 block">
                Starting row
              </label>
              <input
                type="number"
                min={0}
                value={localStart}
                onChange={(e) => setLocalStart(parseInt(e.target.value, 10) || 0)}
                className="w-full px-2.5 py-1.5 rounded-[8px] border border-border-subtle bg-surface text-[12px] text-ink focus:outline-none focus:border-border-default"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-ink mb-0.5 block">
                Row limit
              </label>
              <p className="text-[10px] text-ink-muted mb-1">
                Leave empty to remove limit
              </p>
              <input
                type="number"
                min={1}
                value={localLimit}
                onChange={(e) => setLocalLimit(e.target.value)}
                placeholder=""
                className="w-full px-2.5 py-1.5 rounded-[8px] border border-border-subtle bg-surface text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleShowAll}
                className="px-3 py-1.5 rounded-[8px] text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors"
              >
                Show all rows
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 rounded-[8px] bg-signal-blue-text text-white text-[11px] font-medium hover:opacity-90 transition-opacity"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
