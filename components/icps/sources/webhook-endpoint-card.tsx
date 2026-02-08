"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { WebhookEndpoint } from "@/lib/types/pipeline";

export function WebhookEndpointCard({ endpoint }: { endpoint: WebhookEndpoint }) {
  const [copied, setCopied] = useState(false);

  function copyUrl() {
    navigator.clipboard.writeText(endpoint.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-[12px] font-medium text-ink">{endpoint.funnel}</h4>
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            endpoint.paused ? "bg-ink-faint" : "bg-signal-green-text"
          )} />
          <span className="text-[10px] text-ink-faint">{endpoint.paused ? "Paused" : "Live"}</span>
        </div>
      </div>

      {/* URL */}
      <div className="flex items-center gap-2 mb-3">
        <code className="flex-1 px-3 py-1.5 rounded-[8px] bg-section text-[10px] text-ink-secondary font-mono truncate">
          {endpoint.url}
        </code>
        <button
          onClick={copyUrl}
          className="p-1.5 rounded-lg hover:bg-hover transition-colors shrink-0"
        >
          {copied ? (
            <Check size={13} strokeWidth={1.5} className="text-signal-green-text" />
          ) : (
            <Copy size={13} strokeWidth={1.5} className="text-ink-muted" />
          )}
        </button>
      </div>

      {/* Connected Sources */}
      {endpoint.sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {endpoint.sources.map((source) => (
            <span key={source} className="px-2 py-0.5 rounded-full bg-signal-blue text-signal-blue-text text-[10px] font-medium">
              {source}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-[10px] text-ink-muted">
        <span>{endpoint.totalReceived} total received</span>
        <span>{endpoint.todayReceived} today</span>
        {endpoint.lastHit && <span>Last: {formatRelativeTime(endpoint.lastHit)}</span>}
      </div>
    </div>
  );
}
