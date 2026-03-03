"use client";

import { useState, useRef, useEffect } from "react";
import { Phone, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallContext } from "@/components/calling/call-context";
import { DialPad } from "./dial-pad";
import { RecentCallsList } from "./recent-calls-list";
import { InCallControls } from "./in-call-controls";

type DialerView = "dialpad" | "recents";

export function DialerDropdown() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<DialerView>("dialpad");
  const ref = useRef<HTMLDivElement>(null);
  const { activeCall, phoneLines } = useCallContext();

  const hasActiveLines = phoneLines.some((l) => l.status === "active");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-hover transition-colors"
      >
        <Phone size={17} strokeWidth={1.5} className="text-ink-muted" />
        {/* Active call pulse indicator */}
        {activeCall && activeCall.state !== "ended" && (
          <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-signal-green-text animate-pulse" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface rounded-[14px] border border-border-subtle overflow-hidden z-50">
          {/* Show in-call view when active */}
          {activeCall && activeCall.state !== "ended" ? (
            <div className="px-4 py-3">
              <InCallControls />
            </div>
          ) : (
            <>
              {/* Tab toggle */}
              {hasActiveLines && (
                <div className="flex border-b border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setView("dialpad")}
                    className={cn(
                      "flex-1 py-2.5 text-[11px] font-medium text-center transition-colors",
                      view === "dialpad" ? "text-ink border-b-2 border-ink" : "text-ink-muted hover:text-ink-secondary"
                    )}
                  >
                    Dial Pad
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("recents")}
                    className={cn(
                      "flex-1 py-2.5 text-[11px] font-medium text-center transition-colors",
                      view === "recents" ? "text-ink border-b-2 border-ink" : "text-ink-muted hover:text-ink-secondary"
                    )}
                  >
                    Recents
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="px-4 py-3">
                {!hasActiveLines ? (
                  <div className="py-6 text-center">
                    <p className="text-[12px] text-ink-muted mb-1">No phone lines configured</p>
                    <p className="text-[11px] text-ink-faint">
                      Go to{" "}
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="text-signal-blue-text hover:underline"
                      >
                        Phone Settings
                      </button>{" "}
                      to provision a number.
                    </p>
                  </div>
                ) : view === "dialpad" ? (
                  <DialPad />
                ) : (
                  <RecentCallsList />
                )}
              </div>

              {/* Footer */}
              {hasActiveLines && (
                <div className="px-4 py-2.5 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-1.5 text-[11px] text-ink-muted hover:text-ink-secondary transition-colors"
                  >
                    <Settings size={12} strokeWidth={1.5} />
                    Phone Settings
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
