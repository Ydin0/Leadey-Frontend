"use client";

import { useEffect, useState } from "react";
import { Loader2, Calendar, Check, ExternalLink } from "lucide-react";
import { getCalendlyStatus, startCalendlyOAuth, disconnectCalendly, type CalendlyStatus } from "@/lib/api/calendly";

/** Settings → Integrations card for connecting a rep's Calendly account. */
export function CalendlyIntegration() {
  const [status, setStatus] = useState<CalendlyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setStatus(await getCalendlyStatus());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await startCalendlyOAuth();
      window.location.href = url; // full redirect to Calendly's consent screen
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start Calendly connection");
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await disconnectCalendly();
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
      <div className="flex items-center gap-3 mb-1">
        <span className="flex items-center justify-center w-9 h-9 rounded-[10px] bg-signal-blue/15 text-signal-blue-text">
          <Calendar size={18} />
        </span>
        <div>
          <h3 className="text-[14px] font-semibold text-ink">Calendly</h3>
          <p className="text-[11px] text-ink-muted">Show booked meetings on the matching lead&apos;s profile.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6"><Loader2 size={16} className="animate-spin text-ink-muted" /></div>
      ) : !status?.platformConfigured ? (
        <p className="text-[11.5px] text-ink-muted mt-3">
          Calendly isn&apos;t configured on the server yet. An admin needs to set the Calendly app
          credentials before reps can connect.
        </p>
      ) : status.connected ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-[10px] border border-border-subtle bg-section/50 px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-signal-green/15 text-signal-green-text shrink-0"><Check size={13} /></span>
            <div className="min-w-0">
              <p className="text-[12px] text-ink font-medium truncate">Connected{status.email ? ` · ${status.email}` : ""}</p>
              {status.schedulingUrl && (
                <a href={status.schedulingUrl} target="_blank" rel="noreferrer" className="text-[10.5px] text-ink-muted hover:text-signal-blue-text inline-flex items-center gap-1">
                  Booking page <ExternalLink size={9} />
                </a>
              )}
            </div>
          </div>
          <button onClick={disconnect} disabled={busy}
            className="px-3 py-1.5 rounded-[16px] bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors disabled:opacity-50 shrink-0">
            {busy ? <Loader2 size={11} className="animate-spin" /> : "Disconnect"}
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <button onClick={connect} disabled={busy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Calendar size={13} />}
            Connect with Calendly
          </button>
          {error && <p className="text-[11px] text-signal-red-text mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}
