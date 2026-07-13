"use client";

import { useState, useCallback } from "react";
import { Download, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadCallRecording } from "@/lib/api/phone-lines";

/** Build a friendly, filesystem-safe file name for a downloaded call. */
export function recordingFileName(parts: { contact?: string | null; timestamp?: string | null }): string {
  const who = (parts.contact || "call").trim() || "call";
  const day = parts.timestamp ? new Date(parts.timestamp) : null;
  const stamp = day && !Number.isNaN(day.getTime()) ? day.toISOString().slice(0, 10) : "";
  const raw = [`Call`, who, stamp].filter(Boolean).join(" - ");
  // Strip characters that browsers/OSes dislike in file names.
  return raw.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) + ".mp3";
}

/**
 * Downloads a call recording as an MP3. The audio stream is org-scoped behind
 * auth, so this fetches the bytes with the session token and saves them locally
 * — unlike the Share link (a dashboard page), the file can be handed to anyone
 * (e.g. dropped into a training doc).
 */
export function DownloadRecordingButton({
  recordId,
  fileName,
  variant = "icon",
  className,
}: {
  recordId: string;
  fileName: string;
  /** "icon" = compact icon button (table rows); "button" = labelled pill. */
  variant?: "icon" | "button";
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const run = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (state === "loading") return;
      setState("loading");
      try {
        await downloadCallRecording(recordId, fileName);
        setState("done");
        window.setTimeout(() => setState("idle"), 1600);
      } catch (err) {
        console.error("Failed to download recording:", err);
        setState("error");
        window.setTimeout(() => setState("idle"), 2500);
      }
    },
    [recordId, fileName, state],
  );

  const icon =
    state === "loading" ? <Loader2 size={variant === "button" ? 12 : 13} className="animate-spin" />
    : state === "done" ? <Check size={variant === "button" ? 12 : 13} />
    : <Download size={variant === "button" ? 12 : 13} />;

  if (variant === "button") {
    return (
      <button
        onClick={run}
        title="Download this recording as an MP3"
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[11px] font-medium border transition-colors",
          state === "done"
            ? "bg-signal-green/15 text-signal-green-text border-signal-green-text/20"
            : state === "error"
              ? "bg-signal-red/15 text-signal-red-text border-signal-red-text/20"
              : "bg-section text-ink-secondary border-border-subtle hover:bg-hover",
          className,
        )}
      >
        {icon}
        {state === "loading" ? "Preparing…" : state === "done" ? "Downloaded" : state === "error" ? "Failed" : "Download"}
      </button>
    );
  }

  return (
    <button
      onClick={run}
      title="Download this recording as an MP3"
      className={cn(
        "inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors",
        state === "done" ? "text-signal-green-text"
          : state === "error" ? "text-signal-red-text"
          : "text-ink-muted hover:bg-hover hover:text-ink",
        className,
      )}
    >
      {icon}
    </button>
  );
}
