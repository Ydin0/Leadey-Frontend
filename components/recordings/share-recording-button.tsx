"use client";

import { useState, useCallback } from "react";
import { Link2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Builds the absolute deep link to a recording (same-origin, org-scoped). */
export function recordingShareUrl(id: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/dashboard/recordings/${id}`;
}

/**
 * Copies a shareable link to a specific call recording to the clipboard.
 * Teammates in the same org can open it to view the call + transcript.
 */
export function ShareRecordingButton({
  recordId,
  variant = "icon",
  className,
}: {
  recordId: string;
  /** "icon" = compact icon button (table rows); "button" = labelled pill. */
  variant?: "icon" | "button";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const url = recordingShareUrl(recordId);
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // Fallback for older browsers / insecure contexts.
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch { /* ignore */ }
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    },
    [recordId],
  );

  if (variant === "button") {
    return (
      <button
        onClick={copy}
        title="Copy a shareable link to this recording"
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[11px] font-medium border transition-colors",
          copied
            ? "bg-signal-green/15 text-signal-green-text border-signal-green-text/20"
            : "bg-section text-ink-secondary border-border-subtle hover:bg-hover",
          className,
        )}
      >
        {copied ? <Check size={12} /> : <Link2 size={12} />}
        {copied ? "Link copied" : "Share"}
      </button>
    );
  }

  return (
    <button
      onClick={copy}
      title="Copy a shareable link to this recording"
      className={cn(
        "inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors",
        copied ? "text-signal-green-text" : "text-ink-muted hover:bg-hover hover:text-ink",
        className,
      )}
    >
      {copied ? <Check size={13} /> : <Link2 size={13} />}
    </button>
  );
}
