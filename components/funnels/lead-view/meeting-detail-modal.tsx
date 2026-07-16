"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  X, Play, ExternalLink, ListChecks, Clock, Loader2, Sparkles, RefreshCw,
  Gauge, FileText, CheckCircle2, TrendingUp, Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getMeetingTranscript, scoreMeetingTranscript,
  type MeetingTranscript, type CallScore,
} from "@/lib/api/meeting-transcripts";

const PROVIDER_LABEL: Record<string, string> = { fathom: "Fathom", fireflies: "Fireflies" };

function fmtDuration(s: number | null): string {
  if (!s) return "";
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}
function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function ts(sec: number): string {
  return `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, "0")}`;
}

/** Score → semantic color band (on a 0..1 fraction). */
function band(frac: number): { text: string; bar: string; ring: string } {
  if (frac >= 0.8) return { text: "text-signal-green-text", bar: "bg-signal-green-text", ring: "var(--color-signal-green-text)" };
  if (frac >= 0.6) return { text: "text-signal-blue-text", bar: "bg-signal-blue-text", ring: "var(--color-signal-blue-text)" };
  if (frac >= 0.4) return { text: "text-signal-amber-text", bar: "bg-signal-amber-text", ring: "var(--color-signal-amber-text)" };
  return { text: "text-signal-red-text", bar: "bg-signal-red-text", ring: "var(--color-signal-red-text)" };
}

type Tab = "scorecard" | "summary" | "transcript";

export function MeetingDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<MeetingTranscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("scorecard");
  const [score, setScore] = useState<CallScore | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoreErr, setScoreErr] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoScored = useRef(false);

  const runScore = useCallback(async (force: boolean) => {
    setScoring(true);
    setScoreErr(null);
    try {
      setScore(await scoreMeetingTranscript(id, force));
    } catch (err) {
      setScoreErr(err instanceof Error ? err.message : "Couldn't score this call.");
    } finally {
      setScoring(false);
    }
  }, [id]);

  useEffect(() => {
    let alive = true;
    getMeetingTranscript(id)
      .then((d) => {
        if (!alive) return;
        setData(d);
        if (d.score) setScore(d.score);
        // Auto-score on first open when there's a transcript and no cached score.
        if (!d.score && (d.transcript?.length ?? 0) > 0 && !autoScored.current) {
          autoScored.current = true;
          void runScore(false);
        }
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id, runScore]);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Click a transcript timestamp to seek the <video> (when we have a direct file).
  const seek = (sec: number) => {
    if (videoRef.current) { videoRef.current.currentTime = sec; void videoRef.current.play(); }
  };

  const hasTranscript = (data?.transcript?.length ?? 0) > 0;
  const isVideoFile = !!data?.recordingUrl && /\.(mp4|webm|m4a|mp3|mov)(\?|$)/i.test(data.recordingUrl);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-[18px] border border-border-subtle shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border-subtle">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-ink truncate">{data?.title || (loading ? "Loading…" : "Meeting")}</h2>
            {data && (
              <p className="text-[11.5px] text-ink-muted mt-0.5">
                {[fmtDate(data.heldAt), fmtDuration(data.durationSec), PROVIDER_LABEL[data.provider] || data.provider].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-muted hover:bg-hover hover:text-ink shrink-0"><X size={17} /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24"><Loader2 size={22} className="animate-spin text-ink-muted" /></div>
        ) : !data ? (
          <div className="px-6 py-20 text-center text-[12.5px] text-ink-muted">Couldn&apos;t load this meeting.</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* ── Recording playback ── */}
            {/* A direct media file plays inline (Fireflies). Provider share pages
                (Fathom) forbid iframe embedding — "refused to connect" — so we
                show a clickable poster that opens the recording in a new tab
                rather than a broken frame. */}
            {isVideoFile ? (
              <div className="bg-black">
                <video ref={videoRef} src={data.recordingUrl!} controls className="w-full max-h-[46vh] mx-auto" />
              </div>
            ) : (data.embedUrl || data.recordingUrl) ? (
              <a
                href={data.embedUrl || data.recordingUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className="group relative flex items-center justify-center aspect-video w-full max-h-[46vh] bg-gradient-to-b from-[#151a2e] to-[#0b0f1e]"
              >
                <div className="flex flex-col items-center gap-3">
                  <span className="flex items-center justify-center w-16 h-16 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors ring-1 ring-white/15">
                    <Play size={26} className="text-white translate-x-0.5" fill="currentColor" />
                  </span>
                  <span className="text-[13px] font-medium text-white/90">Watch the recording on {PROVIDER_LABEL[data.provider] || "the provider"}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-white/50"><ExternalLink size={11} /> Opens in a new tab</span>
                </div>
              </a>
            ) : null}

            {/* ── Tabs ── */}
            <div className="flex items-center gap-1 px-6 pt-4 sticky top-0 bg-surface z-10 border-b border-border-subtle">
              {([
                ["scorecard", "Scorecard", Gauge],
                ["summary", "AI Summary", Sparkles],
                ["transcript", "Transcript", FileText],
              ] as const).map(([key, label, Icon]) => (
                <button key={key} onClick={() => setTab(key)}
                  className={cn("flex items-center gap-1.5 px-3 py-2.5 text-[12.5px] font-medium border-b-2 -mb-px transition-colors",
                    tab === key ? "border-accent text-ink" : "border-transparent text-ink-muted hover:text-ink-secondary")}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            <div className="px-6 py-5">
              {tab === "scorecard" && (
                <Scorecard score={score} scoring={scoring} error={scoreErr} hasTranscript={hasTranscript} onScore={() => void runScore(true)} />
              )}

              {tab === "summary" && (
                data.summary && (data.summary.overview || data.summary.actionItems.length) ? (
                  <div className="space-y-5">
                    {data.summary.overview && (
                      <p className="text-[13.5px] text-ink-secondary leading-relaxed whitespace-pre-wrap">{data.summary.overview}</p>
                    )}
                    {data.summary.actionItems.length > 0 && (
                      <div>
                        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-muted font-medium mb-2.5"><ListChecks size={13} /> Action items</p>
                        <ul className="space-y-2">
                          {data.summary.actionItems.map((a, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-[13px] text-ink-secondary">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" /><span>{a}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {data.summary.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {data.summary.keywords.map((k, i) => (
                          <span key={i} className="text-[10.5px] font-medium rounded-full px-2 py-0.5 bg-section text-ink-secondary">{k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[12.5px] text-ink-muted py-6 text-center">No AI summary available for this meeting.</p>
                )
              )}

              {tab === "transcript" && (
                hasTranscript ? (
                  <div className="space-y-3">
                    {data.transcript!.map((s, i) => (
                      <div key={i} className="flex gap-3">
                        {s.start != null ? (
                          <button onClick={() => seek(s.start!)} disabled={!isVideoFile}
                            className={cn("text-[10.5px] tabular-nums shrink-0 mt-0.5 inline-flex items-center gap-0.5 w-[48px]",
                              isVideoFile ? "text-link hover:underline cursor-pointer" : "text-ink-faint")}>
                            <Clock size={9} /> {ts(s.start)}
                          </button>
                        ) : <span className="w-[48px] shrink-0" />}
                        <span className="min-w-0">
                          {s.speaker && <span className="text-[11.5px] font-semibold text-ink mr-1.5">{s.speaker}:</span>}
                          <span className="text-[13px] text-ink-secondary leading-relaxed">{s.text}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12.5px] text-ink-muted py-6 text-center">No transcript text available.</p>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Scorecard ────────────────────────────────────────────────────────
function Scorecard({
  score, scoring, error, hasTranscript, onScore,
}: {
  score: CallScore | null; scoring: boolean; error: string | null; hasTranscript: boolean; onScore: () => void;
}) {
  if (scoring && !score) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Loader2 size={26} className="animate-spin text-accent" />
        <p className="text-[13px] font-medium text-ink">Scoring this call…</p>
        <p className="text-[11.5px] text-ink-muted max-w-xs">Analysing the transcript against the closing framework — rapport, discovery, objections, and the close.</p>
      </div>
    );
  }
  if (!score) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/15 text-accent"><Gauge size={22} /></span>
        <p className="text-[13.5px] font-semibold text-ink">Score this call</p>
        <p className="text-[11.5px] text-ink-muted max-w-sm">
          {hasTranscript
            ? "Grade the call against a closing framework — rapport, discovery, value, objection handling, talk balance and next steps."
            : "No transcript is available yet, so there's nothing to score. Pull the transcript first."}
        </p>
        {error && <p className="text-[11.5px] text-signal-red-text">{error}</p>}
        {hasTranscript && (
          <button onClick={onScore} className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-on-ink text-[12px] font-medium hover:bg-ink/90 transition-colors">
            <Sparkles size={13} /> Generate score
          </button>
        )}
      </div>
    );
  }

  const overallFrac = score.overall / 100;
  const ob = band(overallFrac);
  const R = 46, C = 2 * Math.PI * R;

  return (
    <div className="space-y-6">
      {/* Overall + talk ratio */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative shrink-0" style={{ width: 128, height: 128 }}>
          <svg width="128" height="128" className="-rotate-90">
            <circle cx="64" cy="64" r={R} fill="none" stroke="var(--color-border-subtle)" strokeWidth="10" />
            <circle cx="64" cy="64" r={R} fill="none" stroke={ob.ring} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - overallFrac)} style={{ transition: "stroke-dashoffset .7s ease" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-[30px] font-semibold leading-none tabular-nums", ob.text)}>{score.overall}</span>
            <span className="text-[10px] text-ink-muted mt-0.5">/ 100</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className={cn("text-[17px] font-semibold", ob.text)}>{score.verdict}</span>
            <span className="text-[11px] text-ink-faint">call</span>
          </div>
          {score.talkRatio && (
            <div className="mt-3 max-w-xs mx-auto sm:mx-0">
              <div className="flex items-center justify-between text-[10.5px] text-ink-muted mb-1">
                <span className="inline-flex items-center gap-1"><Mic size={10} /> Rep {score.talkRatio.rep}%</span>
                <span>Prospect {score.talkRatio.prospect}%</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-section">
                <div className="bg-accent" style={{ width: `${score.talkRatio.rep}%` }} />
                <div className="bg-signal-green-text/60" style={{ width: `${score.talkRatio.prospect}%` }} />
              </div>
              <p className="text-[10px] text-ink-faint mt-1">Ideal rep talk share is roughly 40–50%.</p>
            </div>
          )}
        </div>
      </div>

      {/* Metric bars */}
      <div className="grid gap-3">
        {score.metrics.map((m) => {
          const frac = m.score / m.max;
          const b = band(frac);
          return (
            <div key={m.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-medium text-ink">{m.label}</span>
                <span className={cn("text-[12px] font-semibold tabular-nums", b.text)}>{m.score}<span className="text-ink-faint font-normal">/{m.max}</span></span>
              </div>
              <div className="h-2 rounded-full bg-section overflow-hidden">
                <div className={cn("h-full rounded-full", b.bar)} style={{ width: `${frac * 100}%`, transition: "width .6s ease" }} />
              </div>
              {m.note && <p className="text-[11px] text-ink-muted mt-1 leading-snug">{m.note}</p>}
            </div>
          );
        })}
      </div>

      {/* Strengths + improvements */}
      {(score.strengths.length > 0 || score.improvements.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {score.strengths.length > 0 && (
            <div className="rounded-[12px] border border-border-subtle bg-signal-green/5 p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-signal-green-text font-medium mb-2"><CheckCircle2 size={13} /> What went well</p>
              <ul className="space-y-1.5">
                {score.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-ink-secondary"><span className="mt-1.5 w-1 h-1 rounded-full bg-signal-green-text shrink-0" />{s}</li>
                ))}
              </ul>
            </div>
          )}
          {score.improvements.length > 0 && (
            <div className="rounded-[12px] border border-border-subtle bg-signal-amber/5 p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-signal-amber-text font-medium mb-2"><TrendingUp size={13} /> Coaching notes</p>
              <ul className="space-y-1.5">
                {score.improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-ink-secondary"><span className="mt-1.5 w-1 h-1 rounded-full bg-signal-amber-text shrink-0" />{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <p className="text-[10px] text-ink-faint">Scored by {score.model} · {new Date(score.generatedAt).toLocaleString()}</p>
        <button onClick={onScore} disabled={scoring}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors disabled:opacity-60">
          {scoring ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Re-score
        </button>
      </div>
    </div>
  );
}
