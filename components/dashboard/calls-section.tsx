"use client";

import { useState } from "react";
import { Phone, ChevronDown, ChevronUp, Copy, Check, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhoneNumber } from "@/lib/utils";
import { mockCallQueue } from "@/lib/mock-data";
import type { CallQueueItem } from "@/lib/types";

const outcomeOptions = [
  { value: "interested", label: "Interested", color: "bg-signal-green text-signal-green-text" },
  { value: "not_interested", label: "Not Interested", color: "bg-section text-ink-secondary" },
  { value: "voicemail", label: "Voicemail", color: "bg-signal-slate text-signal-slate-text" },
  { value: "no_answer", label: "No Answer", color: "bg-signal-slate text-signal-slate-text" },
  { value: "busy", label: "Busy", color: "bg-signal-slate text-signal-slate-text" },
] as const;

function CallCard({
  item,
  onLog,
  onSkip,
}: {
  item: CallQueueItem;
  onLog: (id: string, outcome: CallQueueItem["outcome"]) => void;
  onSkip: (id: string) => void;
}) {
  const [scriptOpen, setScriptOpen] = useState(false);
  const [showOutcomes, setShowOutcomes] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopyPhone() {
    navigator.clipboard.writeText(item.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-signal-green flex items-center justify-center shrink-0">
            <Phone size={14} strokeWidth={1.5} className="text-signal-green-text" />
          </div>
          <div className="min-w-0">
            <span className="text-[13px] font-medium text-ink truncate block">{item.contact.name}</span>
            <p className="text-[11px] text-ink-muted truncate">
              {item.contact.title} at {item.contact.company}
            </p>
          </div>
        </div>

        {/* Phone number with copy */}
        <button
          onClick={handleCopyPhone}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-section hover:bg-hover transition-colors shrink-0"
        >
          <span className="text-[12px] text-ink-secondary font-medium">{formatPhoneNumber(item.phone)}</span>
          {copied ? (
            <Check size={12} strokeWidth={1.5} className="text-signal-green-text" />
          ) : (
            <Copy size={12} strokeWidth={1.5} className="text-ink-muted" />
          )}
        </button>
      </div>

      {/* Call Script Toggle */}
      <button
        onClick={() => setScriptOpen(!scriptOpen)}
        className="flex items-center gap-1.5 mt-3 text-[11px] text-ink-muted hover:text-ink transition-colors"
      >
        {scriptOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {scriptOpen ? "Hide Script" : "View Call Script"}
      </button>

      {/* Call Script */}
      {scriptOpen && (
        <div className="mt-3 p-3 bg-section rounded-lg space-y-3">
          <div>
            <h4 className="text-[10px] font-medium text-ink-muted uppercase tracking-wider mb-1">Opening Hook</h4>
            <p className="text-[12px] text-ink-secondary leading-relaxed">{item.script.hook}</p>
          </div>
          <div>
            <h4 className="text-[10px] font-medium text-ink-muted uppercase tracking-wider mb-1">Talking Points</h4>
            <ul className="space-y-1">
              {item.script.talkingPoints.map((point, i) => (
                <li key={i} className="text-[12px] text-ink-secondary leading-relaxed flex gap-2">
                  <span className="text-ink-faint shrink-0">-</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] font-medium text-ink-muted uppercase tracking-wider mb-1">Objection Handlers</h4>
            <div className="space-y-2">
              {item.script.objectionHandlers.map((handler, i) => (
                <div key={i}>
                  <p className="text-[11px] font-medium text-ink-secondary">&quot;{handler.objection}&quot;</p>
                  <p className="text-[12px] text-ink-muted leading-relaxed mt-0.5">{handler.response}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-medium text-ink-muted uppercase tracking-wider mb-1">Qualifying Questions</h4>
            <ul className="space-y-1">
              {item.script.qualifyingQuestions.map((q, i) => (
                <li key={i} className="text-[12px] text-ink-secondary leading-relaxed flex gap-2">
                  <span className="text-ink-faint shrink-0">{i + 1}.</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle relative">
        <div className="relative">
          <button
            onClick={() => setShowOutcomes(!showOutcomes)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
          >
            <Phone size={12} strokeWidth={1.5} />
            Log Call
            <ChevronDown size={10} />
          </button>
          {showOutcomes && (
            <div className="absolute left-0 top-full mt-1 bg-surface rounded-[10px] border border-border-subtle py-1 z-10 min-w-[140px]">
              {outcomeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onLog(item.id, option.value);
                    setShowOutcomes(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-hover transition-colors flex items-center gap-2"
                >
                  <span className={cn("w-2 h-2 rounded-full", option.color.split(" ")[0])} />
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => onSkip(item.id)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
        >
          <SkipForward size={12} strokeWidth={1.5} />
          Skip
        </button>
      </div>
    </div>
  );
}

export function CallsSection() {
  const [calls, setCalls] = useState(mockCallQueue);
  const pending = calls.filter((c) => c.status === "pending");

  function handleLog(id: string, outcome: CallQueueItem["outcome"]) {
    setCalls((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "completed" as const, outcome } : c))
    );
  }

  function handleSkip(id: string) {
    setCalls((prev) => prev.map((c) => (c.id === id ? { ...c, status: "skipped" as const } : c)));
  }

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[15px] font-semibold text-ink">Cold Calls</h2>
        <span className="text-[11px] font-medium bg-signal-green text-signal-green-text rounded-full px-2 py-0.5 leading-none">
          {pending.length} remaining
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {pending.map((item) => (
          <CallCard key={item.id} item={item} onLog={handleLog} onSkip={handleSkip} />
        ))}
        {pending.length === 0 && (
          <div className="bg-surface rounded-[14px] border border-border-subtle p-8 text-center">
            <p className="text-[13px] text-ink-muted">All calls completed</p>
          </div>
        )}
      </div>
    </section>
  );
}
