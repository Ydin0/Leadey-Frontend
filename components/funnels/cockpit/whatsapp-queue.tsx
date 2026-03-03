"use client";

import { useState } from "react";
import { MessageSquare, Copy, Check, SkipForward } from "lucide-react";
import type { CockpitWhatsAppItem } from "@/lib/types/funnel";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
}

function WhatsAppCard({ item }: { item: CockpitWhatsAppItem }) {
  const [status, setStatus] = useState<"pending" | "copied" | "skipped" | "done">("pending");

  function handleCopy() {
    navigator.clipboard.writeText(item.message);
    setStatus("copied");
  }

  if (status === "skipped" || status === "done") return null;

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-section flex items-center justify-center shrink-0">
          <span className="text-[11px] font-medium text-ink-muted">{getInitials(item.name)}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] font-medium text-ink">{item.name}</span>
          </div>
          <p className="text-[11px] text-ink-muted mb-0.5">{item.title} at {item.company}</p>
          <p className="text-[10px] text-ink-faint">{item.phone}</p>

          <p className="text-[11px] text-ink-secondary mt-2 leading-relaxed line-clamp-2">{item.message}</p>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-ink text-on-ink text-[10px] font-medium hover:bg-ink/90 transition-colors"
            >
              {status === "copied" ? <Check size={11} /> : <Copy size={11} />}
              {status === "copied" ? "Copied" : "Copy Message"}
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

export function WhatsAppQueue({ items }: { items: CockpitWhatsAppItem[] }) {
  if (items.length === 0) {
    return (
      <div className="bg-surface rounded-[14px] border border-border-subtle p-6 text-center">
        <MessageSquare size={20} strokeWidth={1.5} className="text-ink-faint mx-auto mb-2" />
        <p className="text-[12px] text-ink-muted">No WhatsApp messages queued</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare size={14} strokeWidth={1.5} className="text-signal-green-text" />
        <h3 className="text-[13px] font-semibold text-ink">WhatsApp Queue</h3>
        <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-section text-ink-muted">{items.length}</span>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <WhatsAppCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
