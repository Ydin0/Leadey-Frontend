"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Play, Pause, Loader2, AlertCircle, Sparkles, ListTree, ArrowRight, Wand2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchCallRecordingBlobUrl } from "@/lib/api/phone-lines";
import type { CallRecord } from "@/lib/types/calling";

// Soft, on-brand pastels (the Leadey avatar palette) so the two speakers read as
// part of the design rather than loud violet/blue.
const SPEAKER_COLORS = ["#8C9AE0", "#E0A878", "#6FBEA8", "#E08FA8", "#9B8FE0", "#7FA8D6"];

function fmt(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function CallReview({
  record,
  initialDuration,
  onRegenerate,
  regenerating,
}: {
  record: CallRecord;
  initialDuration?: number;
  /** Re-run the (new) diarized pipeline — shown for legacy plain transcripts. */
  onRegenerate?: () => void;
  regenerating?: boolean;
}) {
  const segments = useMemo(() => record.transcriptSegments ?? [], [record.transcriptSegments]);
  const speakers = useMemo(() => record.speakers ?? [], [record.speakers]);
  const summary = record.summaryStructured;
  // A legacy record: has plain text but no diarized segments / structured summary.
  const isLegacy = segments.length === 0 && !summary;

  const audioRef = useRef<HTMLAudioElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration ?? record.recordingDuration ?? record.duration ?? 0);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<"summary" | "transcript">(summary ? "summary" : "transcript");
  const [copied, setCopied] = useState(false);

  // Stable colour per speaker id.
  const colorById = useMemo(() => {
    const map: Record<string, string> = {};
    (speakers.length ? speakers.map((s) => s.id) : [...new Set(segments.map((s) => s.speaker))]).forEach((id, i) => {
      map[id] = SPEAKER_COLORS[i % SPEAKER_COLORS.length];
    });
    return map;
  }, [speakers, segments]);
  const nameById = useMemo(() => {
    const map: Record<string, string> = {};
    speakers.forEach((s) => (map[s.id] = s.name));
    return map;
  }, [speakers]);

  // One-click transcript export: diarized segments become
  // "[m:ss] Speaker: text" lines; legacy records copy the plain transcript.
  const copyTranscript = useCallback(async () => {
    const text =
      segments.length > 0
        ? segments
            .map((seg) => `[${fmt(seg.start)}] ${nameById[seg.speaker] || `Speaker ${seg.speaker}`}: ${seg.text}`)
            .join("\n")
        : record.transcript || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy transcript:", err);
    }
  }, [segments, nameById, record.transcript]);

  // The currently-playing segment (last segment whose start ≤ currentTime).
  const activeIdx = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].start <= currentTime + 0.15) idx = i;
      else break;
    }
    return idx;
  }, [segments, currentTime]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => { if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration); };
    const onEnd = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  useEffect(() => () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); }, []);

  // Keep the active transcript line in view while playing.
  useEffect(() => {
    if (playing && activeRef.current) activeRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIdx, playing]);

  const ensureLoaded = useCallback(async (): Promise<boolean> => {
    if (loaded) return true;
    setLoading(true);
    setError(false);
    try {
      const url = await fetchCallRecordingBlobUrl(record.id);
      blobUrlRef.current = url;
      const audio = audioRef.current;
      if (audio) { audio.src = url; audio.load(); }
      setLoaded(true);
      return true;
    } catch {
      setError(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loaded, record.id]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); return; }
    if (!(await ensureLoaded())) return;
    try { await audio.play(); setPlaying(true); } catch { setError(true); }
  }, [playing, ensureLoaded]);

  const seekTo = useCallback(async (t: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!(await ensureLoaded())) return;
    audio.currentTime = t;
    setCurrentTime(t);
    if (!playing) { try { await audio.play(); setPlaying(true); } catch { /* ignore */ } }
  }, [ensureLoaded, playing]);

  const onScrub = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    void seekTo(pct * duration);
  }, [duration, seekTo]);

  const cycleSpeed = useCallback(() => {
    const audio = audioRef.current;
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    if (audio) audio.playbackRate = next;
    setSpeed(next);
  }, [speed]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
      <audio ref={audioRef} preload="none" />

      {/* Legacy transcript — offer an upgrade to the diarized/structured view. */}
      {isLegacy && onRegenerate && (
        <div className="flex items-center justify-between gap-3 rounded-[12px] border border-accent/25 bg-accent/[0.05] px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Wand2 size={15} className="text-accent shrink-0" />
            <span className="text-[12px] text-ink-secondary">
              This is an older transcript. Re-transcribe to get colour-coded speakers, a structured AI summary & click-to-jump.
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
            disabled={regenerating}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink text-on-ink px-3.5 py-1.5 text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
          >
            {regenerating ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
            {regenerating ? "Re-transcribing…" : "Re-transcribe with speakers"}
          </button>
        </div>
      )}

      {/* Player + talk-time */}
      <div className="rounded-[12px] border border-border-subtle bg-surface p-3">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            disabled={error}
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-full shrink-0 transition-colors",
              error ? "bg-signal-red/10 text-signal-red-text cursor-not-allowed"
                : playing ? "bg-accent text-on-ink" : "bg-accent/15 text-accent hover:bg-accent/25",
            )}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : error ? <AlertCircle size={15} /> : playing ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
          </button>
          <span className="text-[11px] text-ink-muted tabular-nums shrink-0 w-[84px]">{fmt(currentTime)} / {fmt(duration)}</span>
          <div className="relative flex-1 h-2 rounded-full bg-section cursor-pointer group" onClick={onScrub}>
            <div className="absolute top-0 left-0 h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-accent shadow opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `${progress}%` }} />
          </div>
          <button onClick={cycleSpeed} className="text-[10px] font-medium text-ink-muted hover:text-ink px-1.5 py-0.5 rounded transition-colors shrink-0">{speed}x</button>
        </div>

        {speakers.length > 0 && (
          <div className="mt-3">
            <div className="flex h-1.5 rounded-full overflow-hidden bg-section">
              {speakers.map((sp) => (
                <div key={sp.id} style={{ width: `${sp.talkPct}%`, background: colorById[sp.id] }} title={`${sp.name} · ${sp.talkPct}%`} />
              ))}
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {speakers.map((sp) => (
                <span key={sp.id} className="inline-flex items-center gap-1.5 text-[11px] text-ink-secondary">
                  <span className="w-2 h-2 rounded-full" style={{ background: colorById[sp.id] }} />
                  <span className="font-medium text-ink">{sp.name}</span>
                  {sp.role !== "other" && <span className="text-ink-faint capitalize">· {sp.role}</span>}
                  <span className="text-ink-muted tabular-nums">{sp.talkPct}%</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs + copy */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-section rounded-full p-[3px] w-fit">
          {summary && (
            <button onClick={() => setTab("summary")} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all", tab === "summary" ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink-secondary")}>
              <Sparkles size={13} /> AI Summary
            </button>
          )}
          <button onClick={() => setTab("transcript")} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all", tab === "transcript" ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink-secondary")}>
            <ListTree size={13} /> Transcript
          </button>
        </div>
        {(segments.length > 0 || record.transcript) && (
          <button
            onClick={() => void copyTranscript()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-3 py-1.5 text-[11px] font-medium text-ink-secondary hover:border-border-default transition-colors"
            title="Copy the full transcript to the clipboard"
          >
            {copied ? <Check size={12} className="text-signal-green-text" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy transcript"}
          </button>
        )}
      </div>

      {tab === "summary" && summary && <SummaryView summary={summary} />}

      {tab === "transcript" && (
        segments.length > 0 ? (
          <div ref={scrollRef} className="max-h-[420px] overflow-y-auto pr-1 flex flex-col gap-0.5">
            {segments.map((seg, i) => {
              const color = colorById[seg.speaker] || SPEAKER_COLORS[0];
              const active = i === activeIdx;
              return (
                <button
                  key={i}
                  ref={active ? activeRef : undefined}
                  onClick={() => void seekTo(seg.start)}
                  className={cn(
                    "group text-left rounded-[10px] px-3 py-2 transition-colors border-l-2",
                    active ? "border-l-current" : "border-l-transparent hover:bg-hover/40",
                  )}
                  style={active ? { background: `${color}14`, borderLeftColor: color } : undefined}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-[11px] font-semibold" style={{ color }}>{nameById[seg.speaker] || `Speaker ${seg.speaker}`}</span>
                    <span className="text-[10px] text-ink-faint tabular-nums">{fmt(seg.start)}</span>
                  </div>
                  <p className="text-[12.5px] text-ink-secondary leading-relaxed pl-4">{seg.text}</p>
                </button>
              );
            })}
          </div>
        ) : record.transcript ? (
          <div className="text-[12px] text-ink-muted leading-relaxed whitespace-pre-wrap max-h-[420px] overflow-y-auto">{record.transcript}</div>
        ) : (
          <p className="text-[12px] text-ink-muted">No transcript available.</p>
        )
      )}
    </div>
  );
}

function SummaryView({ summary }: { summary: NonNullable<CallRecord["summaryStructured"]> }) {
  return (
    <div className="flex flex-col gap-5">
      {summary.tldr.length > 0 && (
        <div className="rounded-[12px] border border-accent/20 bg-accent/[0.04] p-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sparkles size={13} className="text-accent" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Key takeaways</span>
          </div>
          <ul className="flex flex-col gap-2">
            {summary.tldr.map((t, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-ink leading-relaxed">
                <span className="text-accent mt-1.5 shrink-0 w-1 h-1 rounded-full bg-accent" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.sections.map((sec, i) => (
        <div key={i}>
          <h4 className="text-[13px] font-semibold text-ink mb-2">{sec.title}</h4>
          <ul className="flex flex-col gap-1.5">
            {sec.points.map((p, j) => (
              <li key={j} className="flex gap-2 text-[12.5px] text-ink-secondary leading-relaxed">
                <span className="text-ink-faint mt-2 shrink-0 w-1 h-1 rounded-full bg-ink-faint" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {summary.nextSteps && summary.nextSteps.length > 0 && (
        <div className="rounded-[12px] border border-signal-green-text/20 bg-signal-green/[0.06] p-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <ArrowRight size={13} className="text-signal-green-text" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-signal-green-text">Next steps</span>
          </div>
          <ul className="flex flex-col gap-2">
            {summary.nextSteps.map((s, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-ink leading-relaxed">
                <span className="text-signal-green-text mt-1.5 shrink-0 w-1 h-1 rounded-full bg-signal-green-text" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
