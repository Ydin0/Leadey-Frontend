"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { Device, Call } from "@twilio/voice-sdk";
import type {
  ActiveCall,
  CallContextValue,
  PhoneLine,
  CallRecord,
} from "@/lib/types/calling";
import { mockPhoneLines, mockCallRecords } from "@/lib/mock-data/calling";

const CallContext = createContext<CallContextValue | null>(null);

export function useCallContext() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCallContext must be used within CallProvider");
  return ctx;
}

async function fetchToken(): Promise<string> {
  const res = await fetch("/api/twilio/token", { method: "POST" });
  if (!res.ok) throw new Error("Failed to fetch Twilio token");
  const data = await res.json();
  return data.token;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [phoneLines] = useState<PhoneLine[]>(mockPhoneLines);
  const [callHistory, setCallHistory] = useState<CallRecord[]>(mockCallRecords);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(
    mockPhoneLines.find((l) => l.status === "active")?.id ?? null
  );
  const [deviceReady, setDeviceReady] = useState(false);

  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStartRef = useRef<number>(0);

  // ── Initialise Twilio Device ──────────────────
  useEffect(() => {
    let cancelled = false;

    async function initDevice() {
      try {
        const token = await fetchToken();
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
            const newToken = await fetchToken();
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
  }, []);

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
    (call: Call, direction: "outbound" | "inbound") => {
      const lineId = selectedLineId || "unknown";
      const to =
        direction === "outbound"
          ? call.parameters?.To || ""
          : call.parameters?.From || "";
      const from =
        direction === "outbound"
          ? call.parameters?.From || ""
          : call.parameters?.To || "";
      const callId = call.parameters?.CallSid || `call_${Date.now()}`;

      setActiveCall({
        callId,
        state: "ringing",
        direction,
        from,
        to,
        contactName: null,
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

        setActiveCall((prev) =>
          prev ? { ...prev, state: "ended" } : prev
        );

        // Add to call history
        const record: CallRecord = {
          id: `cr_${Date.now()}`,
          direction,
          from,
          to,
          contactName: null,
          companyName: null,
          lineId,
          duration,
          disposition: "completed",
          timestamp: new Date(),
        };
        setCallHistory((prev) => [record, ...prev]);

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
    [selectedLineId]
  );

  // ── Start an outbound call ────────────────────
  const startCall = useCallback(
    async (to: string) => {
      if (activeCall) return;
      if (!deviceRef.current || !deviceReady) {
        console.error("[Twilio] Device not ready");
        return;
      }

      const line = phoneLines.find((l) => l.id === selectedLineId);
      if (!line) return;

      // Strip formatting from the line number to get a clean caller ID
      const callerId = line.number.replace(/[^\d+]/g, "");

      try {
        const call = await deviceRef.current.connect({
          params: {
            To: to,
            CallerId: callerId,
          },
        });

        callRef.current = call;
        bindCallEvents(call, "outbound");
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
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
