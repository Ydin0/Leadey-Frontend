"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Loader2, Trash2, Info } from "lucide-react";
import {
  getWhatsappSettings,
  getWhatsappConnectLink,
  disconnectWhatsappAccount,
  type WhatsappSettings,
} from "@/lib/api/whatsapp";
import { useAuthReady } from "@/components/providers/auth-token-sync";

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="mb-4">
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        {description && <p className="text-[11px] text-ink-muted mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function WhatsappSection() {
  const isAuthReady = useAuthReady();
  const [settings, setSettings] = useState<WhatsappSettings | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [connectResult, setConnectResult] = useState<"connected" | "error" | null>(null);

  const load = useCallback(async () => {
    try {
      setSettings(await getWhatsappSettings());
    } catch {
      // leave prior state
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    void load();
  }, [isAuthReady, load]);

  // Returning from the hosted QR page (?whatsapp_connected=1 / _error=1):
  // surface the outcome and clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("whatsapp_connected")) setConnectResult("connected");
    else if (params.get("whatsapp_error")) setConnectResult("error");
    if (params.get("whatsapp_connected") || params.get("whatsapp_error")) {
      window.history.replaceState(null, "", "/dashboard/settings?tab=whatsapp");
    }
  }, []);

  // The hosted-auth notify webhook can land moments after the redirect — poll
  // briefly until the connection shows up.
  const connected = !!settings?.connected;
  useEffect(() => {
    if (connectResult !== "connected" || connected) return;
    const t = setInterval(() => {
      getWhatsappSettings().then(setSettings).catch(() => {});
    }, 3000);
    const stop = setTimeout(() => clearInterval(t), 60_000);
    return () => { clearInterval(t); clearTimeout(stop); };
  }, [connectResult, connected]);

  async function startConnect() {
    setConnecting(true);
    try {
      const { url } = await getWhatsappConnectLink();
      window.location.href = url;
    } catch {
      setConnecting(false);
    }
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      await disconnectWhatsappAccount();
      setConnectResult(null);
      getWhatsappSettings().then(setSettings).catch(() => {});
    } finally {
      setDisconnecting(false);
      setConfirmingDisconnect(false);
    }
  }

  if (!loaded) {
    return (
      <div className="bg-surface rounded-[14px] border border-border-subtle p-6 flex items-center gap-2 text-[12px] text-ink-muted">
        <Loader2 size={14} className="animate-spin" /> Loading WhatsApp settings…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card
        title="Connect your WhatsApp"
        description="Link your existing WhatsApp or WhatsApp Business number by scanning a QR code with your phone — done in under a minute. Messages send from your own number and replies land on the lead timeline and in your inbox."
      >
        {settings?.connected ? (
          <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-2.5">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-signal-green/15 text-signal-green-text shrink-0">
                <MessageCircle size={14} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-medium text-ink tabular-nums">
                    {settings.phone || "WhatsApp account"}
                  </span>
                  <span className="text-[10px] font-medium rounded-full px-2 py-0.5 uppercase tracking-wide bg-signal-green/15 text-signal-green-text">
                    Connected
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted">Workflows and manual sends use this number.</p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmingDisconnect((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary border border-border-subtle text-[11px] font-medium hover:bg-hover shrink-0"
              >
                <Trash2 size={11} /> Disconnect
              </button>
            </div>
            {confirmingDisconnect && (
              <div className="mt-2.5 flex items-center justify-between gap-2 rounded-[8px] bg-signal-red/10 border border-signal-red-text/20 px-2.5 py-2">
                <span className="text-[10px] text-signal-red-text leading-snug">
                  Disconnect this WhatsApp? Workflow WhatsApp steps and manual sends will fail until a number is connected again.
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setConfirmingDisconnect(false)}
                    disabled={disconnecting}
                    className="px-2 py-0.5 rounded-full bg-section text-ink-secondary text-[10px] font-medium hover:bg-hover border border-border-subtle disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void disconnect()}
                    disabled={disconnecting}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-signal-red-text text-on-ink text-[10px] font-medium hover:bg-signal-red-text/90 disabled:opacity-50"
                  >
                    {disconnecting ? <Loader2 size={9} className="animate-spin" /> : <Trash2 size={9} />}
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : connectResult === "connected" ? (
          <p className="flex items-center gap-2 text-[12px] text-ink-secondary">
            <Loader2 size={13} className="animate-spin" /> Finishing the connection…
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {connectResult === "error" && (
              <p className="text-[11px] text-signal-red-text">
                The connection didn&apos;t complete — try again and keep the page open until the QR is scanned.
              </p>
            )}
            <div>
              <button
                type="button"
                onClick={() => void startConnect()}
                disabled={connecting || !settings?.available}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 disabled:opacity-50"
              >
                {connecting ? <Loader2 size={11} className="animate-spin" /> : <MessageCircle size={11} />}
                Connect WhatsApp
              </button>
            </div>
            {!settings?.available && (
              <p className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                <Info size={12} className="shrink-0" /> WhatsApp connection isn&apos;t configured on this platform yet — contact support.
              </p>
            )}
            <p className="text-[10.5px] text-ink-faint">
              You&apos;ll be taken to a secure page showing a QR code — open WhatsApp on your phone → Settings →
              Linked devices → Link a device, and scan it. Best for conversational outreach at sane volumes.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
