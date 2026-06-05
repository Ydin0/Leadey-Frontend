"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { Device, Call } from "@twilio/voice-sdk";
import type {
  ActiveCall,
  CallContextValue,
  CallMeta,
  PhoneLine,
  CallRecord,
  EndedCallInfo,
} from "@/lib/types/calling";
import { getPhoneLines, getCallRecords, saveCallRecord } from "@/lib/api/phone-lines";
import { logLeadCall } from "@/lib/api/funnels";
import { useAuthReady } from "@/components/providers/auth-token-sync";

const CallContext = createContext<CallContextValue | null>(null);

export function useCallContext() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCallContext must be used within CallProvider");
  return ctx;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

async function fetchTwilioToken(clerkToken: string | null): Promise<string> {
  const headers: Record<string, string> = {};
  if (clerkToken) {
    headers["Authorization"] = `Bearer ${clerkToken}`;
  }

  const res = await fetch(`${API_BASE}/api/twilio/token`, {
    method: "POST",
    headers,
  });
  if (!res.ok) throw new Error("Failed to fetch Twilio token");
  const data = await res.json();
  return data.data.token;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const isAuthReady = useAuthReady();
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [phoneLines, setPhoneLines] = useState<PhoneLine[]>([]);
  const [phoneLinesLoading, setPhonesLoading] = useState(true);
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [deviceReady, setDeviceReady] = useState(false);
  const [lastEndedCall, setLastEndedCall] = useState<EndedCallInfo | null>(null);
  const [lastLoggedCall, setLastLoggedCall] = useState<
    { leadId: string; funnelId: string; at: number } | null
  >(null);

  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStartRef = useRef<number>(0);

  // ── Fetch phone lines + call records once auth is ready ──
  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;

    async function load() {
      try {
        const [lines, recordsResult] = await Promise.all([
          getPhoneLines(),
          getCallRecords({ limit: 50 }),
        ]);
        if (cancelled) return;
        setPhoneLines(lines);
        setCallHistory(recordsResult.data);
        const firstActive = lines.find((l) => l.status === "active");
        if (firstActive) setSelectedLineId(firstActive.id);
      } catch (err) {
        console.error("[CallProvider] Failed to load phone data:", err);
      } finally {
        if (!cancelled) setPhonesLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [isAuthReady]);

  const refreshPhoneLines = useCallback(async () => {
    try {
      const lines = await getPhoneLines();
      setPhoneLines(lines);
    } catch (err) {
      console.error("[CallProvider] Failed to refresh lines:", err);
    }
  }, []);

  // ── Initialise Twilio Device ──────────────────
  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;

    async function initDevice() {
      try {
        const clerkToken = await getToken();
        const token = await fetchTwilioToken(clerkToken);
        if (cancelled) return;

        const device = new Device(token, {
          codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
          logLevel: 1,
        });

        device.on("registered", () => {
          if (!cancelled) setDeviceReady(true);
        });

        device.on("error", (err) => {
          console.error("[Twilio Device Error]", err);
        });

        // Handle incoming calls
        device.on("incoming", (incomingCall: Call) => {
          callRef.current = incomingCall;
          bindCallEvents(incomingCall, "inbound");
          incomingCall.accept();
        });

        // Token refresh — re-register before expiry (45 min)
        device.on("tokenWillExpire", async () => {
          try {
            const clerkTk = await getToken();
            const newToken = await fetchTwilioToken(clerkTk);
            device.updateToken(newToken);
          } catch (err) {
            console.error("[Twilio] Token refresh failed", err);
          }
        });

        await device.register();
        deviceRef.current = device;
      } catch (err) {
        console.error("[Twilio] Device init failed:", err);
      }
    }

    initDevice();

    return () => {
      cancelled = true;
      if (deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
      }
      setDeviceReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthReady]);

  // ── Duration timer ────────────────────────────
  useEffect(() => {
    if (activeCall?.state === "connected") {
      timerRef.current = setInterval(() => {
        setActiveCall((prev) =>
          prev && prev.state === "connected"
            ? { ...prev, duration: prev.duration + 1 }
            : prev
        );
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeCall?.state]);

  // ── Bind Twilio Call events to state ──────────
  const bindCallEvents = useCallback(
    (
      call: Call,
      direction: "outbound" | "inbound",
      meta?: CallMeta,
      known?: { to?: string; from?: string },
    ) => {
      const lineId = selectedLineId || "unknown";
      const contactName = meta?.contactName || null;
      const companyName = meta?.companyName || null;
      const leadId = meta?.leadId || null;
      const funnelId = meta?.funnelId || null;
      // IMPORTANT: for OUTBOUND calls the Twilio Voice SDK does NOT populate
      // `call.parameters.To/From` — the values we passed to connect() live in
      // `call.customParameters` (a Map). Reading `call.parameters.To` returns
      // empty, so the saved record had an empty toNumber/fromNumber and the
      // backend rejected it (400) → nothing ever showed in Recordings.
      // We therefore prefer the values we already know at dial time (`known`),
      // then customParameters, then call.parameters as a last resort.
      const selectedLine = phoneLines.find((l) => l.id === selectedLineId);
      const lineNumber = selectedLine?.number || "";
      const cp = (key: string) => {
        try {
          return call.customParameters?.get?.(key) || "";
        } catch {
          return "";
        }
      };
      const to =
        direction === "outbound"
          ? known?.to || cp("To") || call.parameters?.To || ""
          : call.parameters?.From || "";
      const from =
        direction === "outbound"
          ? known?.from || cp("CallerId") || lineNumber || call.parameters?.From || ""
          : call.parameters?.To || lineNumber || "";
      const callId = call.parameters?.CallSid || `call_${Date.now()}`;

      setActiveCall({
        callId,
        state: "ringing",
        direction,
        from,
        to,
        contactName,
        lineId,
        isMuted: false,
        isOnHold: false,
        isDtmfVisible: false,
        duration: 0,
      });

      call.on("accept", () => {
        callStartRef.current = Date.now();
        setActiveCall((prev) =>
          prev ? { ...prev, state: "connected" } : prev
        );
      });

      call.on("disconnect", () => {
        const duration = Math.round(
          (Date.now() - callStartRef.current) / 1000
        );
        const callSid = call.parameters?.CallSid || null;

        setActiveCall((prev) =>
          prev ? { ...prev, state: "ended" } : prev
        );

        // Add to call history locally
        const record: CallRecord = {
          id: `cr_${Date.now()}`,
          direction,
          from,
          to,
          contactName,
          companyName,
          lineId,
          duration,
          disposition: "completed",
          timestamp: new Date().toISOString(),
        };
        setCallHistory((prev) => [record, ...prev]);

        // Persist to backend, then publish the saved id so the dialer
        // (or any other subscriber) can wire it into /advance. We rely on
        // saveCallRecord returning the persisted row including its id.
        // If this call was placed against a campaign lead, log it so the
        // lead's call counter increments and the call step ticks forward.
        if (leadId && funnelId) {
          logLeadCall(funnelId, leadId)
            .then(() => setLastLoggedCall({ leadId, funnelId, at: Date.now() }))
            .catch((err) =>
              console.error("[CallProvider] Failed to log call against lead:", err),
            );
        }

        saveCallRecord({
          lineId: lineId !== "unknown" ? lineId : undefined,
          twilioCallSid: callSid || undefined,
          direction,
          fromNumber: from,
          toNumber: to,
          contactName: contactName || undefined,
          companyName: companyName || undefined,
          leadId: leadId || undefined,
          funnelId: funnelId || undefined,
          duration,
          disposition: "completed",
        })
          .then((saved) => {
            setLastEndedCall({
              callSid,
              callRecordId: saved?.id || null,
              duration,
              direction,
              from,
              to,
              leadId,
              funnelId,
              endedAt: Date.now(),
            });
          })
          .catch((err) => {
            console.error("[CallProvider] Failed to save call record:", err);
            // Still publish the end event without a recordId so the dialer
            // can advance — the disposition is more important than the
            // record link.
            setLastEndedCall({
              callSid,
              callRecordId: null,
              duration,
              direction,
              from,
              to,
              leadId,
              funnelId,
              endedAt: Date.now(),
            });
          });

        setTimeout(() => {
          setActiveCall(null);
          callRef.current = null;
        }, 800);
      });

      call.on("cancel", () => {
        setActiveCall((prev) =>
          prev ? { ...prev, state: "ended" } : prev
        );
        setTimeout(() => {
          setActiveCall(null);
          callRef.current = null;
        }, 800);
      });

      call.on("reject", () => {
        setActiveCall((prev) =>
          prev ? { ...prev, state: "ended" } : prev
        );
        setTimeout(() => {
          setActiveCall(null);
          callRef.current = null;
        }, 800);
      });

      call.on("error", (err) => {
        console.error("[Twilio Call Error]", err);
        setActiveCall(null);
        callRef.current = null;
      });
    },
    [selectedLineId, phoneLines]
  );

  // ── Start an outbound call ────────────────────
  const startCall = useCallback(
    async (to: string, meta?: CallMeta) => {
      if (activeCall) return;
      if (!deviceRef.current || !deviceReady) {
        console.error("[Twilio] Device not ready");
        return;
      }

      const line = phoneLines.find((l) => l.id === selectedLineId);
      if (!line) return;

      // Strip formatting from the line number to get a clean caller ID
      const callerId = line.number.replace(/[^\d+]/g, "");

      // Clear stale ended-call info so the dialer doesn't apply the
      // previous call's record to this one if there's a race.
      setLastEndedCall(null);

      try {
        const call = await deviceRef.current.connect({
          params: {
            To: to,
            CallerId: callerId,
          },
        });

        callRef.current = call;
        // Pass the numbers we already know — see bindCallEvents for why we
        // can't rely on call.parameters for outbound.
        bindCallEvents(call, "outbound", meta, { to, from: line.number });
      } catch (err) {
        console.error("[Twilio] Connect failed:", err);
      }
    },
    [activeCall, deviceReady, phoneLines, selectedLineId, bindCallEvents]
  );

  // ── End the current call ──────────────────────
  const endCall = useCallback(() => {
    if (callRef.current) {
      callRef.current.disconnect();
    } else if (activeCall) {
      // Fallback if no call ref (shouldn't happen with real SDK)
      setActiveCall({ ...activeCall, state: "ended" });
      setTimeout(() => setActiveCall(null), 800);
    }
  }, [activeCall]);

  // ── Toggle mute ───────────────────────────────
  const toggleMute = useCallback(() => {
    if (callRef.current) {
      const next = !callRef.current.isMuted();
      callRef.current.mute(next);
      setActiveCall((prev) => (prev ? { ...prev, isMuted: next } : prev));
    }
  }, []);

  // ── Toggle hold (mute + hold state) ───────────
  const toggleHold = useCallback(() => {
    setActiveCall((prev) => {
      if (!prev) return prev;
      const nextHold = !prev.isOnHold;
      // Mute audio when on hold
      if (callRef.current) {
        callRef.current.mute(nextHold);
      }
      return { ...prev, isOnHold: nextHold, isMuted: nextHold };
    });
  }, []);

  // ── Toggle DTMF pad ──────────────────────────
  const toggleDtmfPad = useCallback(() => {
    setActiveCall((prev) =>
      prev ? { ...prev, isDtmfVisible: !prev.isDtmfVisible } : prev
    );
  }, []);

  // ── Send DTMF digit ──────────────────────────
  const sendDtmf = useCallback((digit: string) => {
    if (callRef.current) {
      callRef.current.sendDigits(digit);
    }
  }, []);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        phoneLines,
        callHistory,
        selectedLineId,
        setSelectedLineId,
        startCall,
        endCall,
        toggleMute,
        toggleHold,
        toggleDtmfPad,
        sendDtmf,
        phoneLinesLoading,
        refreshPhoneLines,
        lastEndedCall,
        lastLoggedCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
