"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Check, Video, ExternalLink } from "lucide-react";
import { connectTranscriptProvider, disconnectTranscriptProvider, getTranscriptsStatus, type TranscriptProvider, type TranscriptsStatus } from "@/lib/api/meeting-transcripts";

const META: Record<TranscriptProvider, { name: string; blurb: string; keyUrl: string; keyHint: string }> = {
  fathom: {
    name: "Fathom",
    blurb: "Pull Fathom meeting recordings, AI summaries & transcripts onto the matching lead.",
    keyUrl: "https://fathom.video/apps",
    keyHint: "Settings → API in Fathom",
  },
  fireflies: {
    name: "Fireflies",
    blurb: "Pull Fireflies meeting notes, summaries & transcripts onto the matching lead.",
    keyUrl: "https://app.fireflies.ai/integrations/custom/fireflies",
    keyHint: "Settings → Developer in Fireflies",
  },
};

/** Loads status once and renders the Fathom + Fireflies cards together. */
export function TranscriptIntegrations() {
  const [status, setStatus] = useState<TranscriptsStatus | null>(null);
  const load = useCallback(() => { getTranscriptsStatus().then(setStatus).catch(() => setStatus({ fathom: { connected: false }, fireflies: { connected: false } })); }, []);
  useEffect(() => { load(); }, [load]);
  if (!status) {
    return <div className="flex items-center justify-center py-6"><Loader2 size={16} className="animate-spin text-ink-muted" /></div>;
  }
  return (
    <>
      <TranscriptIntegration provider="fathom" connected={status.fathom.connected} onChange={load} />
      <TranscriptIntegration provider="fireflies" connected={status.fireflies.connected} onChange={load} />
    </>
  );
}

/** Settings → Integrations card for a per-rep transcript provider (API key). */
export function TranscriptIntegration({
  provider,
  connected,
  onChange,
}: {
  provider: TranscriptProvider;
  connected: boolean;
  onChange: () => void;
}) {
  const meta = META[provider];
  const [editing, setEditing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    if (!apiKey.trim()) { setError("Paste your API key first."); return; }
    setBusy(true); setError(null);
    try {
      await connectTranscriptProvider(provider, apiKey.trim());
      setApiKey(""); setEditing(false);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true); setError(null);
    try {
      await disconnectTranscriptProvider(provider);
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
      <div className="flex items-center gap-3 mb-1">
        <span className="flex items-center justify-center w-9 h-9 rounded-[10px] bg-accent/15 text-link">
          <Video size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-ink">{meta.name}</h3>
          <p className="text-[11px] text-ink-muted">{meta.blurb}</p>
        </div>
      </div>

      {connected ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-[10px] border border-border-subtle bg-section/50 px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-signal-green/15 text-signal-green-text shrink-0"><Check size={13} /></span>
            <p className="text-[12px] text-ink font-medium truncate">Connected</p>
          </div>
          <button onClick={disconnect} disabled={busy}
            className="px-3 py-1.5 rounded-[16px] bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors disabled:opacity-50 shrink-0">
            {busy ? <Loader2 size={11} className="animate-spin" /> : "Disconnect"}
          </button>
        </div>
      ) : editing ? (
        <div className="mt-3 space-y-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={`${meta.name} API key`}
            className="w-full px-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[12.5px] text-ink focus:outline-none focus:border-border-default"
          />
          <p className="text-[10.5px] text-ink-muted inline-flex items-center gap-1">
            Find it under {meta.keyHint} · <a href={meta.keyUrl} target="_blank" rel="noreferrer" className="text-link hover:underline inline-flex items-center gap-0.5">open {meta.name} <ExternalLink size={9} /></a>
          </p>
          <div className="flex items-center gap-2">
            <button onClick={connect} disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />} Connect
            </button>
            <button onClick={() => { setEditing(false); setError(null); }} disabled={busy}
              className="px-3 py-2 rounded-[20px] text-[11px] font-medium text-ink-muted hover:bg-hover transition-colors">Cancel</button>
          </div>
          {error && <p className="text-[11px] text-signal-red-text">{error}</p>}
        </div>
      ) : (
        <div className="mt-3">
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 transition-opacity">
            <Video size={13} /> Connect {meta.name}
          </button>
        </div>
      )}
    </div>
  );
}
