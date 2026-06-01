"use client";

import { useEffect, useRef, useState } from "react";
import { PhoneCall, ChevronDown, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { DialerConfigModal } from "./dialer-config-modal";
import type { FunnelStep } from "@/lib/types/funnel";

interface DialerLauncherButtonProps {
  /** All steps in the campaign. The launcher filters to call-channel
   *  steps internally. Pass the whole steps array — that way the
   *  caller doesn't need to know about channel logic. */
  steps: FunnelStep[];
  className?: string;
}

/** Prominent CTA for launching the power dialer on a campaign. Shows
 *  nothing when no call steps exist. Single call step: opens the
 *  config modal directly. Multiple call steps: opens a picker dropdown
 *  so the rep can choose which step's queue to load. */
export function DialerLauncherButton({ steps, className }: DialerLauncherButtonProps) {
  const callSteps = steps.filter((s) => s.channel === "call");
  const [selectedStep, setSelectedStep] = useState<FunnelStep | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    function onClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [pickerOpen]);

  if (callSteps.length === 0) return null;

  const buttonBaseClass = cn(
    "flex items-center gap-2 px-4 py-2 rounded-[20px] text-[12px] font-medium",
    "bg-signal-green text-signal-green-text border border-signal-green-text/20",
    "hover:bg-signal-green/80 hover:border-signal-green-text/40 transition-all",
    "shadow-sm hover:shadow-md",
    className,
  );

  // Single call step — clicking the button opens the config modal directly.
  if (callSteps.length === 1) {
    const step = callSteps[0];
    return (
      <>
        <button
          type="button"
          onClick={() => setSelectedStep(step)}
          className={buttonBaseClass}
        >
          <PhoneCall size={14} strokeWidth={2} />
          Start Dialer
        </button>
        {selectedStep && (
          <DialerConfigModal step={selectedStep} onClose={() => setSelectedStep(null)} />
        )}
      </>
    );
  }

  // Multiple call steps — show a picker dropdown.
  return (
    <div className="relative" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setPickerOpen((o) => !o)}
        className={buttonBaseClass}
      >
        <PhoneCall size={14} strokeWidth={2} />
        Start Dialer
        <ChevronDown size={12} strokeWidth={2} className={cn("transition-transform", pickerOpen && "rotate-180")} />
      </button>

      {pickerOpen && (
        <div className="absolute right-0 mt-1.5 z-30 min-w-[240px] rounded-[12px] border border-border-subtle bg-surface shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-border-subtle">
            <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
              Pick a call step
            </p>
          </div>
          <ul className="py-1">
            {callSteps.map((step) => (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPickerOpen(false);
                    setSelectedStep(step);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-hover transition-colors"
                >
                  <span className="w-7 h-7 rounded-lg bg-signal-green/15 text-signal-green-text flex items-center justify-center shrink-0">
                    <Phone size={12} strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-ink truncate">{step.label}</p>
                    <p className="text-[10px] text-ink-muted">Day {step.dayOffset}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedStep && (
        <DialerConfigModal step={selectedStep} onClose={() => setSelectedStep(null)} />
      )}
    </div>
  );
}
