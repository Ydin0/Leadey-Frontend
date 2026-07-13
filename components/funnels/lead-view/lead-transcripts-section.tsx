"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Sparkles, Loader2, X, Play, ExternalLink, ListChecks, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { Section } from "./lead-section";
import {
  listLeadTranscripts,
  pullLeadTranscripts,
  getMeetingTranscript,
  type MeetingTranscript,
} from "@/lib/api/meeting-transcripts";

function fmtDuration(s: number | null): string {
  if (!s) return "";
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}
function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
const PROVIDER_LABEL: Record<string, string> = { fathom: "Fathom", fireflies: "Fireflies" };

/** Meeting transcripts pulled from Fathom / Fireflies for this lead. */
export function LeadTranscriptsSection({ funnelId, leadId }: { funnelId: string; leadId: string }) {
  const isAuthReady = useAuthReady();
  const [items, setItems] = useState<MeetingTranscript[]>([]);
  const [pulling, setPulling] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setItems(await listLeadTranscripts(leadId)); } catch { /* ignore */ }
  }, [leadId]);

  useEffect(() => { if (isAuthReady) void load(); }, [isAuthReady, load]);

  async function pull() {
    if (pulling) return;
    setPulling(true);
    setNote(null);
    try {
      const res = await pullLeadTranscripts(funnelId, leadId);
      if (!res.connected) setNote(res.reason || "Connect Fathom or Fireflies in Settings → Integrations.");
      else if (res.linked === 0) setNote(`No matching recordings found (checked ${res.checked}).`);
      else { setNote(`Linked ${res.linked} transcript${res.linked === 1 ? "" : "s"}.`); await load(); }
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Failed to pull transcripts.");
    } finally {
      setPulling(false);
      setTimeout(() => setNote(null), 6000);
    }
  }

  return (
    <>
      <Section
        icon={FileText}
        title="Meeting transcripts"
        count={items.length || null}
        actions={
          <button
            onClick={pull}
            disabled={pulling}
            title="Pull from Fathom / Fireflies"
            className="flex items-center gap-1 px-2 py-1 rounded-[14px] bg-accent/15 text-link text-[10.5px] font-medium hover:bg-accent/25 transition-colors disabled:opacity-60"
          >
            {pulling ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            {pulling ? "Pulling…" : "Pull"}
          </button>
        }
      >
        <div className="flex flex-col gap-1 pl-1">
          {items.length === 0 ? (
            <p className="text-[12px] text-ink-faint">No transcripts yet. Hit <span className="text-ink-secondary font-medium">Pull</span> to fetch from Fathom / Fireflies.</p>
          ) : (
            items.map((t) => (
              <button
                key={t.id}
                onClick={() => setOpenId(t.id)}
                className="flex items-center gap-2 text-left rounded-[8px] px-2 py-1.5 hover:bg-hover transition-colors"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-accent/15 text-link shrink-0"><FileText size={12} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium text-ink truncate">{t.title}</span>
                  <span className="block text-[10.5px] text-ink-muted">
                    {[fmtDate(t.heldAt), fmtDuration(t.durationSec), PROVIDER_LABEL[t.provider] || t.provider].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {t.hasRecording && <Play size={12} className="text-ink-faint shrink-0" />}
              </button>
            ))
          )}
          {note && <p className="text-[11px] text-ink-muted mt-1">{note}</p>}
        </div>
      </Section>

      {openId && <TranscriptModal id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

function TranscriptModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<MeetingTranscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"summary" | "transcript">("summary");

  useEffect(() => {
    let alive = true;
    getMeetingTranscript(id).then((d) => { if (alive) setData(d); }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-surface rounded-[16px] border border-border-subtle shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border-subtle">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-ink truncate">{data?.title || (loading ? "Loading…" : "Meeting")}</h2>
            {data && (
              <p className="text-[11.5px] text-ink-muted mt-0.5">
                {[fmtDate(data.heldAt), fmtDuration(data.durationSec), PROVIDER_LABEL[data.provider] || data.provider].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-ink-muted hover:bg-hover hover:text-ink shrink-0"><X size={16} /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={20} className="animate-spin text-ink-muted" /></div>
        ) : !data ? (
          <div className="px-5 py-16 text-center text-[12px] text-ink-muted">Couldn&apos;t load this transcript.</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Embedded recording */}
            {data.embedUrl ? (
              <div className="aspect-video w-full bg-black">
                <iframe src={data.embedUrl} className="w-full h-full" allow="autoplay; fullscreen" title="Meeting recording" />
              </div>
            ) : data.recordingUrl ? (
              <a href={data.recordingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 mx-5 mt-4 px-3 py-2.5 rounded-[10px] bg-section border border-border-subtle text-[12px] text-link font-medium hover:bg-hover transition-colors">
                <Play size={14} /> Watch recording <ExternalLink size={11} />
              </a>
            ) : null}

            {/* Tabs */}
            <div className="flex items-center gap-1 px-5 pt-4 border-b border-border-subtle">
              {(["summary", "transcript"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={cn("px-3 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors capitalize", tab === t ? "border-accent text-ink" : "border-transparent text-ink-muted hover:text-ink-secondary")}>
                  {t === "summary" ? "AI Summary" : "Transcript"}
                </button>
              ))}
            </div>

            <div className="px-5 py-4">
              {tab === "summary" ? (
                data.summary && (data.summary.overview || data.summary.actionItems.length) ? (
                  <div className="space-y-4">
                    {data.summary.overview && (
                      <p className="text-[13px] text-ink-secondary leading-relaxed whitespace-pre-wrap">{data.summary.overview}</p>
                    )}
                    {data.summary.actionItems.length > 0 && (
                      <div>
                        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-muted font-medium mb-2"><ListChecks size={13} /> Action items</p>
                        <ul className="space-y-1.5">
                          {data.summary.actionItems.map((a, i) => (
                            <li key={i} className="flex items-start gap-2 text-[12.5px] text-ink-secondary">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                              <span>{a}</span>
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
                  <p className="text-[12px] text-ink-muted">No AI summary available for this meeting.</p>
                )
              ) : data.transcript && data.transcript.length > 0 ? (
                <div className="space-y-2.5">
                  {data.transcript.map((s, i) => (
                    <div key={i} className="flex gap-2.5">
                      {s.start != null && (
                        <span className="text-[10.5px] text-ink-faint tabular-nums shrink-0 mt-0.5 inline-flex items-center gap-0.5 w-[46px]">
                          <Clock size={9} /> {Math.floor(s.start / 60)}:{Math.floor(s.start % 60).toString().padStart(2, "0")}
                        </span>
                      )}
                      <span className="min-w-0">
                        {s.speaker && <span className="text-[11px] font-semibold text-ink mr-1.5">{s.speaker}:</span>}
                        <span className="text-[12.5px] text-ink-secondary leading-relaxed">{s.text}</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-ink-muted">No transcript text available.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
