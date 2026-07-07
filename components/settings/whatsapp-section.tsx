"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { MessageCircle, Loader2, Trash2, Info } from "lucide-react";
import {
  getWhatsappSettings,
  connectWhatsapp,
  disconnectWhatsappAccount,
  type WhatsappSettings,
} from "@/lib/api/whatsapp";
import { useAuthReady } from "@/components/providers/auth-token-sync";

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || "";
const META_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID || "";
const FB_VERSION = "v25.0";

// Minimal typings for the Facebook JS SDK we use.
declare global {
  interface Window {
    FB?: {
      init: (opts: { appId: string; autoLogAppEvents?: boolean; xfbml?: boolean; version: string }) => void;
      login: (
        cb: (resp: { authResponse?: { code?: string } | null; status?: string }) => void,
        opts: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

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
  const [sdkReady, setSdkReady] = useState(false);

  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Embedded Signup returns the session info (phone_number_id, waba_id) via a
  // window message and the exchangeable `code` via the FB.login callback —
  // they can arrive in either order, so collect both then finish once ready.
  const sessionRef = useRef<{ phoneNumberId: string; wabaId: string; businessId?: string } | null>(null);
  const codeRef = useRef<string | null>(null);

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

  const finishIfReady = useCallback(async () => {
    if (!codeRef.current || !sessionRef.current) return;
    const code = codeRef.current;
    const session = sessionRef.current;
    codeRef.current = null;
    sessionRef.current = null;
    setConnecting(true);
    setError(null);
    try {
      await connectWhatsapp({ code, ...session });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect WhatsApp");
    } finally {
      setConnecting(false);
    }
  }, [load]);

  // Capture the Embedded Signup completion event.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (typeof event.origin !== "string" || !event.origin.endsWith("facebook.com")) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type === "WA_EMBEDDED_SIGNUP" && data?.event === "FINISH" && data?.data?.phone_number_id) {
          sessionRef.current = {
            phoneNumberId: data.data.phone_number_id,
            wabaId: data.data.waba_id,
            businessId: data.data.business_id,
          };
          void finishIfReady();
        }
      } catch {
        // non-JSON messages from the SDK — ignore
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [finishIfReady]);

  function initFb() {
    if (!window.FB || !META_APP_ID) return;
    window.FB.init({ appId: META_APP_ID, autoLogAppEvents: true, xfbml: false, version: FB_VERSION });
    setSdkReady(true);
  }

  function launchSignup() {
    if (!window.FB) {
      setError("The WhatsApp connect SDK hasn't loaded yet — try again in a moment.");
      return;
    }
    setError(null);
    sessionRef.current = null;
    codeRef.current = null;
    window.FB.login(
      (resp) => {
        const code = resp?.authResponse?.code;
        if (code) {
          codeRef.current = code;
          void finishIfReady();
        } else {
          setError("WhatsApp connection was cancelled.");
        }
      },
      {
        config_id: META_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
      },
    );
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      await disconnectWhatsappAccount();
      await load();
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

  const available = !!settings?.available && !!META_APP_ID && !!META_CONFIG_ID;

  return (
    <div className="space-y-4">
      {/* Facebook JS SDK — only needed on this settings tab. */}
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="afterInteractive"
        onLoad={initFb}
        onReady={initFb}
      />

      <Card
        title="Connect your WhatsApp"
        description="Connect your WhatsApp Business number through Meta in a few taps — sign in, pick or create your WhatsApp Business Account, and you're live. Messages send from your own number and replies land on the lead timeline and in your inbox."
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
                    {settings.phone || "WhatsApp number"}
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
        ) : (
          <div className="flex flex-col gap-2">
            {error && <p className="text-[11px] text-signal-red-text">{error}</p>}
            <div>
              <button
                type="button"
                onClick={launchSignup}
                disabled={connecting || !available || !sdkReady}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 disabled:opacity-50"
              >
                {connecting ? <Loader2 size={11} className="animate-spin" /> : <MessageCircle size={11} />}
                Connect WhatsApp
              </button>
            </div>
            {!available ? (
              <p className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                <Info size={12} className="shrink-0" /> WhatsApp isn&apos;t configured on this platform yet — contact support.
              </p>
            ) : !sdkReady ? (
              <p className="flex items-center gap-1.5 text-[11px] text-ink-faint">
                <Loader2 size={11} className="animate-spin shrink-0" /> Loading the WhatsApp connect flow…
              </p>
            ) : (
              <p className="text-[10.5px] text-ink-faint">
                You&apos;ll sign in with Meta and choose your WhatsApp Business Account. Best for compliant, at-scale
                outreach — cold first messages use approved templates; replies within 24h can be freeform.
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
