"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, X, Check, Plus, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { IntegrationLogo, type IntegrationKey } from "./integration-logos";
import { CalendlyIntegration } from "./calendly-integration";
import { UnipileIntegration } from "./unipile-integration";
import { TranscriptIntegration } from "./transcript-integration";
import { getCalendlyStatus } from "@/lib/api/calendly";
import { getUnipileStatus } from "@/lib/api/unipile";
import { getTranscriptsStatus } from "@/lib/api/meeting-transcripts";

type Tone = "connected" | "off" | "setup";
interface CardState { key: IntegrationKey; name: string; category: string; desc: string; tone: Tone; label: string }

const META: { key: IntegrationKey; name: string; category: string; desc: string }[] = [
  { key: "calendly", name: "Calendly", category: "Scheduling", desc: "Show booked meetings on the matching lead's profile." },
  { key: "linkedin", name: "LinkedIn", category: "Outreach", desc: "Automate connection requests, profile visits & messages." },
  { key: "fathom", name: "Fathom", category: "Meetings", desc: "Pull recordings, AI summaries & transcripts onto leads." },
  { key: "fireflies", name: "Fireflies", category: "Meetings", desc: "Pull meeting notes, summaries & transcripts onto leads." },
];

const TONE_PILL: Record<Tone, string> = {
  connected: "bg-signal-green/15 text-signal-green-text",
  off: "bg-section text-ink-muted",
  setup: "bg-signal-amber/15 text-signal-amber-text",
};

/** Redesigned Integrations tab — a grid of branded cards for the real,
 *  user-configurable integrations. Each card opens the provider's connect flow
 *  in a modal. */
export function IntegrationsGrid() {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<CardState[]>([]);
  const [open, setOpen] = useState<IntegrationKey | null>(null);
  const [transcripts, setTranscripts] = useState({ fathom: false, fireflies: false });

  const load = useCallback(async () => {
    const [cal, uni, tr] = await Promise.all([
      getCalendlyStatus().catch(() => null),
      getUnipileStatus().catch(() => null),
      getTranscriptsStatus().catch(() => null),
    ]);
    setTranscripts({ fathom: !!tr?.fathom.connected, fireflies: !!tr?.fireflies.connected });
    const state: Record<IntegrationKey, { tone: Tone; label: string }> = {
      calendly: cal?.connected ? { tone: "connected", label: "Connected" } : cal && !cal.platformConfigured ? { tone: "setup", label: "Setup needed" } : { tone: "off", label: "Not connected" },
      linkedin: uni?.connected ? { tone: "connected", label: uni.accountName ? `Connected` : "Connected" } : uni && !uni.platformConfigured ? { tone: "setup", label: "Setup needed" } : { tone: "off", label: "Not connected" },
      fathom: tr?.fathom.connected ? { tone: "connected", label: "Connected" } : { tone: "off", label: "Not connected" },
      fireflies: tr?.fireflies.connected ? { tone: "connected", label: "Connected" } : { tone: "off", label: "Not connected" },
    };
    setCards(META.map((m) => ({ ...m, ...state[m.key] })));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={18} className="animate-spin text-ink-muted" /></div>;
  }

  return (
    <>
      <div className="mb-5">
        <h2 className="text-[16px] font-semibold text-ink">Integrations</h2>
        <p className="text-[12px] text-ink-muted mt-0.5">Connect the tools your team already uses. Each rep manages their own connections.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((c) => (
          <button
            key={c.key}
            onClick={() => setOpen(c.key)}
            className="group text-left rounded-[14px] border border-border-subtle bg-surface p-4 hover:border-border-default hover:shadow-sm transition-all flex flex-col"
          >
            <div className="flex items-start gap-3">
              <IntegrationLogo provider={c.key} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-[13.5px] font-semibold text-ink">{c.name}</h3>
                  <span className="text-[9.5px] uppercase tracking-wider text-ink-muted font-medium bg-section rounded-full px-1.5 py-0.5">{c.category}</span>
                </div>
                <p className="text-[11.5px] text-ink-muted leading-snug mt-1">{c.desc}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-subtle">
              <span className={cn("inline-flex items-center gap-1 text-[10.5px] font-medium rounded-full px-2 py-0.5", TONE_PILL[c.tone])}>
                {c.tone === "connected" && <Check size={11} />}
                {c.label}
              </span>
              <span className={cn(
                "inline-flex items-center gap-1 text-[11px] font-medium rounded-[16px] px-2.5 py-1 transition-colors",
                c.tone === "connected" ? "text-ink-secondary group-hover:bg-hover" : "bg-ink text-on-ink group-hover:bg-ink/90",
              )}>
                {c.tone === "connected" ? <><Settings2 size={12} /> Manage</> : <><Plus size={12} /> Connect</>}
              </span>
            </div>
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => { setOpen(null); void load(); }}>
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2 text-on-ink">
                <IntegrationLogo provider={open} size={22} />
                <span className="text-[13px] font-semibold text-white">{META.find((m) => m.key === open)?.name}</span>
              </div>
              <button onClick={() => { setOpen(null); void load(); }} className="p-1.5 rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors"><X size={16} /></button>
            </div>
            {open === "calendly" && <CalendlyIntegration />}
            {open === "linkedin" && <UnipileIntegration />}
            {open === "fathom" && <TranscriptIntegration provider="fathom" connected={transcripts.fathom} onChange={load} />}
            {open === "fireflies" && <TranscriptIntegration provider="fireflies" connected={transcripts.fireflies} onChange={load} />}
          </div>
        </div>
      )}
    </>
  );
}
