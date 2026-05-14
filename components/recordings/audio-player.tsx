"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  src: string;
  compact?: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ src, compact = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnded = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  }, [playing]);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
  }, [duration]);

  const cycleSpeed = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    audio.playbackRate = next;
    setSpeed(next);
  }, [speed]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn("flex items-center gap-2", compact ? "gap-1.5" : "gap-2")} onClick={(e) => e.stopPropagation()}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        onClick={toggle}
        className={cn(
          "flex items-center justify-center rounded-full transition-colors flex-shrink-0",
          compact ? "w-6 h-6" : "w-7 h-7",
          playing
            ? "bg-signal-blue-text text-white"
            : "bg-signal-blue/10 text-signal-blue-text hover:bg-signal-blue/20"
        )}
      >
        {playing ? <Pause size={compact ? 10 : 12} /> : <Play size={compact ? 10 : 12} className="ml-0.5" />}
      </button>

      <div
        className={cn("relative rounded-full bg-section cursor-pointer flex-1", compact ? "h-1 min-w-[60px]" : "h-1.5 min-w-[80px]")}
        onClick={seek}
      >
        <div
          className="absolute top-0 left-0 h-full rounded-full bg-signal-blue-text transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <span className={cn("text-ink-muted flex-shrink-0 tabular-nums", compact ? "text-[9px]" : "text-[10px]")}>
        {formatTime(currentTime)}/{formatTime(duration)}
      </span>

      {!compact && (
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
