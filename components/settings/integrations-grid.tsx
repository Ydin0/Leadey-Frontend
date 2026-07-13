"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, X, Check, Plus, Settings2, CalendarDays, Video, Sparkles, Linkedin, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CalendlyIntegration } from "./calendly-integration";
import { UnipileIntegration } from "./unipile-integration";
import { TranscriptIntegration } from "./transcript-integration";
import { getCalendlyStatus } from "@/lib/api/calendly";
import { getUnipileStatus } from "@/lib/api/unipile";
import { getTranscriptsStatus } from "@/lib/api/meeting-transcripts";

type IntegrationKey = "calendly" | "linkedin" | "fathom" | "fireflies";
type Tone = "connected" | "off" | "setup";

/** Category → ordered list. Add new categories/providers here as we grow. */
const CATEGORIES: { label: string; items: { key: IntegrationKey; name: string; desc: string; icon: LucideIcon }[] }[] = [
  {
    label: "Scheduling",
    items: [{ key: "calendly", name: "Calendly", desc: "Show booked meetings on the matching lead's profile.", icon: CalendarDays }],
  },
  {
    label: "Meeting recording",
    items: [
      { key: "fathom", name: "Fathom", desc: "Pull recordings, AI summaries & transcripts onto leads.", icon: Video },
      { key: "fireflies", name: "Fireflies", desc: "Pull meeting notes, summaries & transcripts onto leads.", icon: Sparkles },
    ],
  },
  {
    label: "Outreach",
    items: [{ key: "linkedin", name: "LinkedIn", desc: "Automate connection requests, profile visits & messages.", icon: Linkedin }],
  },
];

const TONE_PILL: Record<Tone, string> = {
  connected: "bg-signal-green/15 text-signal-green-text",
  off: "bg-section text-ink-muted",
  setup: "bg-signal-amber/15 text-signal-amber-text",
};

/** Settings → Integrations — a categorised list of the real, user-configurable
 *  integrations. Each row opens the provider's connect flow in a modal. */
export function IntegrationsGrid() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Record<IntegrationKey, { tone: Tone; label: string }>>();
  const [open, setOpen] = useState<IntegrationKey | null>(null);
  const [transcripts, setTranscripts] = useState({ fathom: false, fireflies: false });

  const load = useCallback(async () => {
    const [cal, uni, tr] = await Promise.all([
      getCalendlyStatus().catch(() => null),
      getUnipileStatus().catch(() => null),
      getTranscriptsStatus().catch(() => null),
    ]);
    setTranscripts({ fathom: !!tr?.fathom.connected, fireflies: !!tr?.fireflies.connected });
    setStatus({
      calendly: cal?.connected ? { tone: "connected", label: "Connected" } : cal && !cal.platformConfigured ? { tone: "setup", label: "Setup needed" } : { tone: "off", label: "Not connected" },
      linkedin: uni?.connected ? { tone: "connected", label: "Connected" } : uni && !uni.platformConfigured ? { tone: "setup", label: "Setup needed" } : { tone: "off", label: "Not connected" },
      fathom: tr?.fathom.connected ? { tone: "connected", label: "Connected" } : { tone: "off", label: "Not connected" },
      fireflies: tr?.fireflies.connected ? { tone: "connected", label: "Connected" } : { tone: "off", label: "Not connected" },
    });
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch
  useEffect(() => { void load(); }, [load]);

  if (loading || !status) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={18} className="animate-spin text-ink-muted" /></div>;
  }

  return (
    <>
      <div className="mb-5">
        <h2 className="text-[16px] font-semibold text-ink">Integrations</h2>
        <p className="text-[12px] text-ink-muted mt-0.5">Connect the tools your team already uses. Each rep manages their own connections.</p>
      </div>

      <div className="space-y-6">
        {CATEGORIES.map((cat) => (
          <div key={cat.label}>
            <p className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold mb-2 px-0.5">{cat.label}</p>
            <div className="rounded-[14px] border border-border-subtle bg-surface divide-y divide-border-subtle overflow-hidden">
              {cat.items.map((it) => {
                const st = status[it.key];
                const Icon = it.icon;
                return (
                  <div key={it.key} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex items-center justify-center w-9 h-9 rounded-[10px] bg-section text-ink-muted shrink-0"><Icon size={17} strokeWidth={1.75} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[13px] font-semibold text-ink">{it.name}</h3>
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-1.5 py-0.5", TONE_PILL[st.tone])}>
                          {st.tone === "connected" && <Check size={10} />}
                          {st.label}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-ink-muted leading-snug mt-0.5 truncate">{it.desc}</p>
                    </div>
                    <button
                      onClick={() => setOpen(it.key)}
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-medium rounded-[16px] px-3 py-1.5 transition-colors shrink-0",
                        st.tone === "connected" ? "bg-section text-ink-secondary hover:bg-hover" : "bg-ink text-on-ink hover:bg-ink/90",
                      )}
                    >
                      {st.tone === "connected" ? <><Settings2 size={12} /> Manage</> : <><Plus size={12} /> Connect</>}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => { setOpen(null); void load(); }}>
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-end mb-2 px-1">
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
