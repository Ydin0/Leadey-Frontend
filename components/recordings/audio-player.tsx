"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchCallRecordingBlobUrl } from "@/lib/api/phone-lines";

interface AudioPlayerProps {
  /** Call record id — audio is streamed through the authenticated backend
   *  proxy (Twilio media URLs need Basic Auth and can't load in a bare tag). */
  recordId: string;
  compact?: boolean;
  /** Known length (seconds) shown immediately, before the media loads, so the
   *  duration isn't blank until the user presses play. */
  initialDuration?: number;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ recordId, compact = false, initialDuration = 0 }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    // Prefer the media's real duration once known; keep the supplied length
    // when the stream doesn't report a finite duration.
    const onMeta = () =>
      setDuration(audio.duration && Number.isFinite(audio.duration) ? audio.duration : initialDuration);
    const onEnded = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
    };
  }, [initialDuration]);

  // Revoke the object URL on unmount to avoid leaking memory.
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const ensureLoaded = useCallback(async (): Promise<boolean> => {
    if (loaded) return true;
    setLoading(true);
    setError(false);
    try {
      const url = await fetchCallRecordingBlobUrl(recordId);
      blobUrlRef.current = url;
      const audio = audioRef.current;
      if (audio) {
        audio.src = url;
        audio.load();
      }
      setLoaded(true);
      return true;
    } catch (err) {
      console.error("Failed to load recording:", err);
      setError(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loaded, recordId]);

  const toggle = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const audio = audioRef.current;
      if (!audio) return;

      if (playing) {
        audio.pause();
        setPlaying(false);
        return;
      }

      const ok = await ensureLoaded();
      if (!ok) return;
      try {
        await audio.play();
        setPlaying(true);
      } catch (err) {
        console.error("Playback failed:", err);
        setError(true);
        setPlaying(false);
      }
    },
    [playing, ensureLoaded],
  );

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      const audio = audioRef.current;
      if (!audio || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = pct * duration;
    },
    [duration],
  );

  const cycleSpeed = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const audio = audioRef.current;
      if (!audio) return;
      const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
      audio.playbackRate = next;
      setSpeed(next);
    },
    [speed],
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={cn("flex items-center gap-2", compact ? "gap-1.5" : "gap-2")}
      onClick={(e) => e.stopPropagation()}
    >
      <audio ref={audioRef} preload="none" />

      <button
        onClick={toggle}
        disabled={error}
        title={error ? "Recording unavailable" : playing ? "Pause" : "Play"}
        className={cn(
          "flex items-center justify-center rounded-full transition-colors flex-shrink-0",
          compact ? "w-6 h-6" : "w-7 h-7",
          error
            ? "bg-signal-red/10 text-signal-red-text cursor-not-allowed"
            : playing
              ? "bg-signal-blue-text text-white"
              : "bg-signal-blue/10 text-signal-blue-text hover:bg-signal-blue/20",
        )}
      >
        {loading ? (
          <Loader2 size={compact ? 10 : 12} className="animate-spin" />
        ) : error ? (
          <AlertCircle size={compact ? 10 : 12} />
        ) : playing ? (
          <Pause size={compact ? 10 : 12} />
        ) : (
          <Play size={compact ? 10 : 12} className="ml-0.5" />
        )}
      </button>

      <div
        className={cn(
          "relative rounded-full bg-section cursor-pointer flex-1",
          compact ? "h-1 min-w-[60px]" : "h-1.5 min-w-[80px]",
        )}
        onClick={seek}
      >
        <div
          className="absolute top-0 left-0 h-full rounded-full bg-signal-blue-text transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <span
        className={cn(
          "text-ink-muted flex-shrink-0 tabular-nums",
          compact ? "text-[9px]" : "text-[10px]",
        )}
      >
        {error ? "—" : `${formatTime(currentTime)}/${formatTime(duration)}`}
      </span>

      {!compact && !error && (
        <button
          onClick={cycleSpeed}
          className="text-[9px] font-medium text-ink-muted hover:text-ink px-1 py-0.5 rounded transition-colors flex-shrink-0"
        >
          {speed}x
        </button>
      )}
    </div>
  );
}
