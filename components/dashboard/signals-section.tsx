"use client";

import { useState } from "react";
import {
  Users,
  DollarSign,
  Cpu,
  Newspaper,
  UserCheck,
  Globe,
  Search,
  MessageSquareMore,
  Building2,
  GitFork,
  Zap,
  X,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { mockSignals } from "@/lib/mock-data";
import type { Signal } from "@/lib/types";

const sourceConfig: Record<Signal["source"], { icon: typeof Users; label: string; bg: string; text: string }> = {
  hiring: { icon: Users, label: "Hiring", bg: "bg-signal-blue", text: "text-signal-blue-text" },
  funding: { icon: DollarSign, label: "Funding", bg: "bg-signal-green", text: "text-signal-green-text" },
  tech_adoption: { icon: Cpu, label: "Tech", bg: "bg-signal-blue", text: "text-signal-blue-text" },
  news: { icon: Newspaper, label: "News", bg: "bg-signal-slate", text: "text-signal-slate-text" },
  job_change: { icon: UserCheck, label: "Job Change", bg: "bg-signal-slate", text: "text-signal-slate-text" },
  expansion: { icon: Globe, label: "Expansion", bg: "bg-signal-blue", text: "text-signal-blue-text" },
  intent: { icon: Search, label: "Intent", bg: "bg-signal-red", text: "text-signal-red-text" },
  social: { icon: MessageSquareMore, label: "Social", bg: "bg-signal-slate", text: "text-signal-slate-text" },
};

function getScoreColor(score: number) {
  if (score >= 90) return "bg-signal-green text-signal-green-text";
  if (score >= 80) return "bg-signal-blue text-signal-blue-text";
  if (score >= 70) return "bg-signal-slate text-signal-slate-text";
  return "bg-signal-slate text-signal-slate-text";
}

function SignalCard({ signal, onDismiss }: { signal: Signal; onDismiss: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const config = sourceConfig[signal.source];
  const SourceIcon = config.icon;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="bg-surface rounded-[14px] border border-border-subtle p-3 transition-colors hover:border-border-default relative"
    >
      <div className="flex items-start gap-3">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
          <SourceIcon size={14} strokeWidth={1.5} className={config.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-medium text-ink truncate">{signal.company}</span>
            <span className={cn("text-[10px] font-medium rounded-full px-1.5 py-0.5 leading-none shrink-0", getScoreColor(signal.relevanceScore))}>
              {signal.relevanceScore}
            </span>
          </div>
          <p className="text-[11px] text-ink-secondary leading-relaxed mt-0.5 line-clamp-2">{signal.summary}</p>
          <div className="flex items-center justify-between mt-2">
            <span className={cn("text-[10px] font-medium rounded-full px-1.5 py-0.5", config.bg, config.text)}>
              {config.label}
            </span>
            <span className="text-[10px] text-ink-faint">{formatRelativeTime(signal.timestamp)}</span>
          </div>
        </div>
      </div>

      {/* Hover actions */}
      {hovered && (
        <div className="absolute inset-x-0 bottom-0 bg-surface rounded-b-[14px] border-t border-border-subtle px-3 py-2 flex items-center gap-1.5">
          <button className="flex items-center gap-1 px-2 py-1 rounded-[16px] bg-section text-[10px] text-ink-secondary hover:bg-hover transition-colors">
            <Building2 size={10} strokeWidth={1.5} />
            Enrich
          </button>
          <button className="flex items-center gap-1 px-2 py-1 rounded-[16px] bg-section text-[10px] text-ink-secondary hover:bg-hover transition-colors">
            <GitFork size={10} strokeWidth={1.5} />
            Add to Funnel
          </button>
          <button className="flex items-center gap-1 px-2 py-1 rounded-[16px] bg-section text-[10px] text-ink-secondary hover:bg-hover transition-colors">
            <Zap size={10} strokeWidth={1.5} />
            Generate Sequence
          </button>
          <button
            onClick={() => onDismiss(signal.id)}
            className="ml-auto flex items-center justify-center w-6 h-6 rounded-full hover:bg-hover transition-colors"
          >
            <X size={12} strokeWidth={1.5} className="text-ink-muted" />
          </button>
        </div>
      )}
    </div>
  );
}

export function SignalsSection() {
  const [signals, setSignals] = useState(mockSignals);
  const visible = signals.filter((s) => !s.dismissed);

  function handleDismiss(id: string) {
    setSignals((prev) => prev.map((s) => (s.id === id ? { ...s, dismissed: true } : s)));
  }

  return (
    <section className="sticky top-20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-semibold text-ink">Signals</h2>
          <span className="text-[11px] font-medium bg-signal-blue text-signal-blue-text rounded-full px-2 py-0.5 leading-none">
            {visible.length} new
          </span>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-ink-muted">
          View All
          <ArrowRight size={12} strokeWidth={1.5} />
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {visible.map((signal) => (
          <SignalCard key={signal.id} signal={signal} onDismiss={handleDismiss} />
        ))}
        {visible.length === 0 && (
          <div className="bg-surface rounded-[14px] border border-border-subtle p-8 text-center">
            <p className="text-[13px] text-ink-muted">No new signals</p>
          </div>
        )}
      </div>
    </section>
  );
}
