"use client";

import { useState } from "react";
import { Linkedin, Copy, ExternalLink, SkipForward, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CockpitLinkedInItem } from "@/lib/types/funnel";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
}

function LinkedInCard({ item }: { item: CockpitLinkedInItem }) {
  const [status, setStatus] = useState<"pending" | "copied" | "skipped" | "done">("pending");

  function handleCopy() {
    navigator.clipboard.writeText(item.message);
    setStatus("copied");
  }

  if (status === "skipped" || status === "done") return null;

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-section flex items-center justify-center shrink-0">
          <span className="text-[11px] font-medium text-ink-muted">{getInitials(item.name)}</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + type badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] font-medium text-ink">{item.name}</span>
            <span className={cn(
              "text-[10px] font-medium rounded-full px-2 py-0.5",
              item.type === "connect"
                ? "bg-signal-blue text-signal-blue-text"
                : "bg-signal-slate text-signal-slate-text"
            )}>
              {item.type === "connect" ? "Connect" : "Message"}
            </span>
          </div>
          <p className="text-[11px] text-ink-muted mb-0.5">{item.title} at {item.company}</p>

          {/* Message preview */}
          <p className="text-[11px] text-ink-secondary mt-2 leading-relaxed line-clamp-2">{item.message}</p>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-ink text-on-ink text-[10px] font-medium hover:bg-ink/90 transition-colors"
            >
              {status === "copied" ? <Check size={11} /> : <Copy size={11} />}
              {status === "copied" ? "Copied" : "Copy & Open"}
            </button>
            <button
              onClick={() => setStatus("skipped")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section text-ink-muted text-[10px] font-medium hover:bg-hover transition-colors"
            >
              <SkipForward size={11} />
              Skip
            </button>
            <button
              onClick={() => setStatus("done")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-signal-green text-signal-green-text text-[10px] font-medium hover:bg-signal-green/80 transition-colors"
            >
              <Check size={11} />
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LinkedInQueue({ items }: { items: CockpitLinkedInItem[] }) {
  if (items.length === 0) {
    return (
      <div className="bg-surface rounded-[14px] border border-border-subtle p-6 text-center">
        <Linkedin size={20} strokeWidth={1.5} className="text-ink-faint mx-auto mb-2" />
        <p className="text-[12px] text-ink-muted">No LinkedIn actions queued</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Linkedin size={14} strokeWidth={1.5} className="text-linkedin" />
        <h3 className="text-[13px] font-semibold text-ink">LinkedIn Queue</h3>
        <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-section text-ink-muted">{items.length}</span>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <LinkedInCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
