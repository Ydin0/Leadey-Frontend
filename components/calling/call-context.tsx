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
import { Loader2 } from "lucide-react";
import { Device, Call } from "@twilio/voice-sdk";
import type {
  ActiveCall,
  CallContextValue,
  CallMeta,
  PhoneLine,
  CallRecord,
  EndedCallInfo,
  AudioDeviceOption,
  IncomingCallInfo,
} from "@/lib/types/calling";
import { getPhoneLines, getCallRecords, saveCallRecord, resolveCaller } from "@/lib/api/phone-lines";
import { logLeadCall } from "@/lib/api/funnels";
import { getLocalPresenceConfig, resolveCallerId, provisionLocalNumber } from "@/lib/api/calls";
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

const AUDIO_INPUT_KEY = "leadey:audioInputDevice";
const AUDIO_OUTPUT_KEY = "leadey:audioOutputDevice";

/** Twilio's audio helper exposes devices as a Map<deviceId, MediaDeviceInfo>. */
function deviceMapToOptions(
  map: Map<string, MediaDeviceInfo> | undefined | null,
): AudioDeviceOption[] {
  if (!map) return [];
  return Array.from(map.values()).map((d, i) => ({
    deviceId: d.deviceId,
    label: d.label || (d.deviceId === "default" ? "System default" : `Device ${i + 1}`),
  }));
}

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

  const [audioInputDevices, setAudioInputDevices] = useState<AudioDeviceOption[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<AudioDeviceOption[]>([]);
  const [selectedInputDeviceId, setSelectedInputDeviceId] = useState<string | null>(null);
  const [selectedOutputDeviceId, setSelectedOutputDeviceId] = useState<string | null>(null);
  const [outputSelectionSupported, setOutputSelectionSupported] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);

  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const incomingCallRef = useRef<Call | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // SYNCHRONOUS in-flight guard. `activeCall` is React state and lags a tick, so
  // a call that fails instantly (e.g. a bad number) could be re-fired several
  // times before `activeCall` updated — the "spam dialling" storm. This ref is
  // set the instant a dial starts and cleared only when the call fully ends, so
  // no second dial can slip through the gap.
  const dialingRef = useRef(false);
  // 0 until the call actually CONNECTS (accept fires). A call that never
  // connects must log duration 0 — not (now - 0) ≈ epoch seconds, which is what
  // corrupted durations into the billions and broke cost reporting.
  const callStartRef = useRef<number>(0);
  // The real Twilio CallSid, captured the moment it's available. For OUTBOUND
  // calls the SDK doesn't populate call.parameters.CallSid until the call
  // connects (and it can be gone by disconnect), so we grab it on accept — this
  // is what the recording webhook matches on, so a missing SID = lost recording.
  const callSidRef = useRef<string | null>(null);
  const callSidPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Whether local-presence dialing is on for the org (loaded once). When on,
  // startCall asks the server for the best owned caller-ID per destination.
  const localPresenceRef = useRef(false);
  // Manual-dial buy prompt for an uncovered US state (offer to add a local #).
  const [localBuyPrompt, setLocalBuyPrompt] = useState<
    { to: string; meta?: CallMeta; stateName: string; areaCode: string } | null
  >(null);

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
    // Local-presence flag (best-effort; defaults off).
    getLocalPresenceConfig()
      .then((r) => { if (!cancelled) localPresenceRef.current = !!r.config.enabled; })
      .catch(() => {});
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

  // ── Audio device (mic / speaker) selection ────────────────────────
  // Reads the current device lists from Twilio's AudioHelper into state.
  const syncAudioDeviceLists = useCallback(() => {
    const audio = deviceRef.current?.audio;
    if (!audio) return;
    setAudioInputDevices(deviceMapToOptions(audio.availableInputDevices));
    setAudioOutputDevices(deviceMapToOptions(audio.availableOutputDevices));
    setOutputSelectionSupported(!!audio.isOutputSelectionSupported);
  }, []);

  // Device labels are blank until mic permission is granted — request it once,
  // then re-enumerate so the dropdowns show real names ("MacBook Mic", etc.).
  const refreshAudioDevices = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      // Permission denied — labels stay generic but ids still work.
    }
    syncAudioDeviceLists();
  }, [syncAudioDeviceLists]);

  const setInputDevice = useCallback(async (deviceId: string) => {
    const audio = deviceRef.current?.audio;
    if (!audio) return;
    try {
      if (!deviceId || deviceId === "default") {
        await audio.unsetInputDevice();
      } else {
        await audio.setInputDevice(deviceId);
      }
      setSelectedInputDeviceId(deviceId || "default");
      try { window.localStorage.setItem(AUDIO_INPUT_KEY, deviceId || "default"); } catch {}
    } catch (err) {
      console.error("[Twilio] Failed to set microphone:", err);
    }
  }, []);

  const setOutputDevice = useCallback(async (deviceId: string) => {
    const audio = deviceRef.current?.audio;
    if (!audio?.isOutputSelectionSupported) return;
    try {
      await audio.speakerDevices.set(deviceId || "default");
      setSelectedOutputDeviceId(deviceId || "default");
      try { window.localStorage.setItem(AUDIO_OUTPUT_KEY, deviceId || "default"); } catch {}
    } catch (err) {
      console.error("[Twilio] Failed to set speaker:", err);
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

        // Handle incoming calls — DON'T auto-answer. Surface a ringing prompt
        // (Twilio plays its built-in ringtone while the call is pending) and
        // let the rep accept/reject via acceptIncoming()/rejectIncoming().
        device.on("incoming", (call: Call) => {
          incomingCallRef.current = call;
          const fromNumber = call.parameters?.From || "";
          const callId = call.parameters?.CallSid || `in_${Date.now()}`;
          setIncomingCall({
            callId,
            fromNumber,
            lineNumber: call.parameters?.To || "",
            lineName: null,
          });
          // Resolve WHO is calling (match the number to a lead/contact) and show
          // it on the ringing prompt — the rep should never have to answer blind.
          if (fromNumber) {
            resolveCaller(fromNumber)
              .then((r) => {
                if (incomingCallRef.current !== call) return; // already ended/answered
                if (!r.name && !r.company && !r.leadId) return;
                setIncomingCall((prev) =>
                  prev && prev.callId === callId
                    ? { ...prev, contactName: r.name, companyName: r.company, leadId: r.leadId, funnelId: r.funnelId }
                    : prev,
                );
              })
              .catch(() => {});
          }
          // If the caller hangs up (or it errors) before we answer, clear it.
          const clearPending = () => {
            if (incomingCallRef.current === call) {
              incomingCallRef.current = null;
              setIncomingCall(null);
            }
          };
          call.on("cancel", clearPending);
          call.on("disconnect", clearPending);
          call.on("reject", clearPending);
          call.on("error", clearPending);
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

        // Keep the mic/speaker dropdowns live as headsets are plugged/unplugged.
        device.audio?.on("deviceChange", () => syncAudioDeviceLists());

        await device.register();
        deviceRef.current = device;

        // Restore the user's saved mic / speaker choice and populate the lists.
        try {
          const savedIn = window.localStorage.getItem(AUDIO_INPUT_KEY);
          if (savedIn) {
            setSelectedInputDeviceId(savedIn);
            if (savedIn === "default") await device.audio?.unsetInputDevice();
            else await device.audio?.setInputDevice(savedIn);
          }
          const savedOut = window.localStorage.getItem(AUDIO_OUTPUT_KEY);
          if (savedOut && device.audio?.isOutputSelectionSupported) {
            setSelectedOutputDeviceId(savedOut);
            await device.audio.speakerDevices.set(savedOut);
          }
        } catch (err) {
          console.warn("[Twilio] Could not restore saved audio devices:", err);
        }
        syncAudioDeviceLists();
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
      // Fresh call — clear any carry-over from the previous one so a
      // non-connected call can't inherit a stale start time or SID.
      callStartRef.current = 0;
      callSidRef.current = call.parameters?.CallSid || null;
      if (callSidPollRef.current) {
        clearInterval(callSidPollRef.current);
        callSidPollRef.current = null;
      }

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
      // Standard telephony convention so every reader (recordings list, contact
      // profiles, dialer recency) is consistent: from = caller, to = callee.
      //  • Outbound: from = our line, to = the lead we dialled.
      //  • Inbound:  from = the caller (lead), to = us (our line / client leg).
      // For INBOUND the Twilio SDK populates call.parameters.From with the real
      // caller and call.parameters.To with our client identity — earlier code
      // had these swapped, so the caller leaked the rep's "client:<id>" into the
      // record and the contact column showed it.
      const to =
        direction === "outbound"
          ? known?.to || cp("To") || call.parameters?.To || ""
          : lineNumber || call.parameters?.To || "";
      const from =
        direction === "outbound"
          ? known?.from || cp("CallerId") || lineNumber || call.parameters?.From || ""
          : call.parameters?.From || "";
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
        // Capture the CallSid now that the call is live. For outbound it may
        // arrive a beat after accept, so poll briefly until it appears — this
        // SID is what the recording webhook matches on.
        if (call.parameters?.CallSid) callSidRef.current = call.parameters.CallSid;
        if (!callSidRef.current) {
          let tries = 0;
          callSidPollRef.current = setInterval(() => {
            tries += 1;
            const sid = call.parameters?.CallSid;
            if (sid) callSidRef.current = sid;
            if (callSidRef.current || tries >= 20) {
              if (callSidPollRef.current) clearInterval(callSidPollRef.current);
              callSidPollRef.current = null;
            }
          }, 250);
        }
        setActiveCall((prev) =>
          prev ? { ...prev, state: "connected" } : prev
        );
        // Identify the counterparty against the org's leads/contacts when we
        // don't already have a name (inbound calls, or ad-hoc dial-pad
        // outbound), so the live-call UI shows who it is + a link to their
        // profile. The counterparty is the caller for inbound, the callee for
        // outbound.
        const counterparty = direction === "inbound" ? from : to;
        if (!contactName && counterparty) {
          resolveCaller(counterparty)
            .then((r) => {
              if (!r.name && !r.company && !r.leadId) return;
              setActiveCall((prev) =>
                prev && prev.callId === callId
                  ? {
                      ...prev,
                      contactName: prev.contactName || r.name,
                      companyName: r.company,
                      leadId: r.leadId,
                      funnelId: r.funnelId,
                    }
                  : prev,
              );
            })
            .catch(() => {});
        }
      });

      call.on("disconnect", () => {
        if (callSidPollRef.current) {
          clearInterval(callSidPollRef.current);
          callSidPollRef.current = null;
        }
        // A call that never connected (no accept → callStartRef still 0) logged
        // a duration of (now - 0)/1000 ≈ epoch seconds. Treat it as 0.
        const duration = callStartRef.current
          ? Math.round((Date.now() - callStartRef.current) / 1000)
          : 0;
        // Prefer the SID we captured while the call was live; fall back to the
        // (often-empty for outbound) parameters at disconnect.
        const callSid = callSidRef.current || call.parameters?.CallSid || null;

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
          dialingRef.current = false;
        }, 800);
      });

      call.on("cancel", () => {
        setActiveCall((prev) =>
          prev ? { ...prev, state: "ended" } : prev
        );
        setTimeout(() => {
          setActiveCall(null);
          callRef.current = null;
          dialingRef.current = false;
        }, 800);
      });

      call.on("reject", () => {
        setActiveCall((prev) =>
          prev ? { ...prev, state: "ended" } : prev
        );
        setTimeout(() => {
          setActiveCall(null);
          callRef.current = null;
          dialingRef.current = false;
        }, 800);
      });

      call.on("error", (err) => {
        console.error("[Twilio Call Error]", err);
        setActiveCall(null);
        callRef.current = null;
        dialingRef.current = false;
      });
    },
    [selectedLineId, phoneLines]
  );

  // ── Start an outbound call ────────────────────
  const startCall = useCallback(
    async (to: string, meta?: CallMeta, opts?: { skipLocalPresence?: boolean }) => {
      if (dialingRef.current || activeCall) return; // synchronous spam guard
      if (!deviceRef.current || !deviceReady) {
        console.error("[Twilio] Device not ready");
        return;
      }

      // Sanitise the destination to a dialable E.164-ish number — strip CSV junk
      // (a leading apostrophe, spaces, brackets). A malformed number was being
      // treated as a client identity and cutting instantly.
      const cleanTo = (to || "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
      if (!/^\+?\d{7,15}$/.test(cleanTo)) {
        console.warn("[Twilio] Skipping dial — invalid number:", to);
        return;
      }

      const line = phoneLines.find((l) => l.id === selectedLineId);
      if (!line) return;

      // Default caller ID = the rep's selected line.
      let callerId = line.number.replace(/[^\d+]/g, "");
      let fromNumber = line.number;

      // Local presence: ask the server for an owned number matching the lead's
      // state. Match-only + best-effort — any failure keeps the selected line.
      if (localPresenceRef.current && !opts?.skipLocalPresence) {
        try {
          const resolved = await resolveCallerId(cleanTo);
          if (resolved.source === "match" && resolved.callerId) {
            callerId = resolved.callerId.replace(/[^\d+]/g, "");
            fromNumber = resolved.callerId;
          } else if (
            resolved.usUncovered && resolved.canProvision && resolved.stateName && resolved.areaCode &&
            !meta?.viaDialer
          ) {
            // Manual one-off dial to an uncovered state — offer to buy a local
            // number before dialing (the dialer suppresses this via viaDialer).
            setLocalBuyPrompt({ to: cleanTo, meta, stateName: resolved.stateName, areaCode: resolved.areaCode });
            return;
          }
        } catch {
          /* keep the selected line */
        }
      }

      // Clear stale ended-call info so the dialer doesn't apply the
      // previous call's record to this one if there's a race.
      setLastEndedCall(null);
      dialingRef.current = true;

      try {
        const call = await deviceRef.current.connect({
          params: {
            To: cleanTo,
            CallerId: callerId,
          },
        });

        callRef.current = call;
        // Pass the numbers we already know — see bindCallEvents for why we
        // can't rely on call.parameters for outbound.
        bindCallEvents(call, "outbound", meta, { to: cleanTo, from: fromNumber });
      } catch (err) {
        dialingRef.current = false;
        console.error("[Twilio] Connect failed:", err);
      }
    },
    [activeCall, deviceReady, phoneLines, selectedLineId, bindCallEvents]
  );

  // ── Accept / reject a ringing inbound call ────
  const acceptIncoming = useCallback(() => {
    const call = incomingCallRef.current;
    if (!call) return;
    // Clear the pending state first so the ring prompt's clear handlers no-op;
    // the call now flows through the normal active-call lifecycle.
    incomingCallRef.current = null;
    setIncomingCall(null);
    callRef.current = call;
    bindCallEvents(call, "inbound");
    call.accept();
  }, [bindCallEvents]);

  const rejectIncoming = useCallback(() => {
    const call = incomingCallRef.current;
    incomingCallRef.current = null;
    setIncomingCall(null);
    if (call) {
      try { call.reject(); } catch { /* already gone */ }
    }
  }, []);

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
        audioInputDevices,
        audioOutputDevices,
        selectedInputDeviceId,
        selectedOutputDeviceId,
        outputSelectionSupported,
        setInputDevice,
        setOutputDevice,
        refreshAudioDevices,
        incomingCall,
        acceptIncoming,
        rejectIncoming,
      }}
    >
      {children}
      {localBuyPrompt && (
        <LocalBuyPrompt
          prompt={localBuyPrompt}
          onBuy={async () => {
            const p = localBuyPrompt;
            setLocalBuyPrompt(null);
            try { await provisionLocalNumber({ areaCode: p.areaCode }); } catch { /* fall through — dial anyway */ }
            void startCall(p.to, { ...(p.meta || {}), viaDialer: true });
          }}
          onDefault={() => {
            const p = localBuyPrompt;
            setLocalBuyPrompt(null);
            void startCall(p.to, p.meta, { skipLocalPresence: true });
          }}
          onCancel={() => setLocalBuyPrompt(null)}
        />
      )}
    </CallContext.Provider>
  );
}

function LocalBuyPrompt({
  prompt, onBuy, onDefault, onCancel,
}: {
  prompt: { stateName: string; areaCode: string };
  onBuy: () => void | Promise<void>;
  onDefault: () => void;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-surface rounded-[14px] border border-border-subtle w-full max-w-sm mx-4 p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[14px] font-semibold text-ink">Call from a local number?</h3>
        <p className="text-[12px] text-ink-muted mt-1.5">
          This contact is in <strong className="text-ink">{prompt.stateName}</strong> ({prompt.areaCode}), where you don&apos;t have a local number yet. Buy one (~$1.15/mo) to call with a local caller ID, or call from your default line.
        </p>
        <div className="flex items-center justify-end gap-2 mt-4">
          <button onClick={onCancel} disabled={busy} className="px-3 py-1.5 rounded-[20px] text-[11px] font-medium text-ink-muted hover:bg-hover transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={onDefault} disabled={busy} className="px-3 py-1.5 rounded-[20px] bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors disabled:opacity-50">Use default</button>
          <button
            onClick={async () => { setBusy(true); await onBuy(); }}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {busy && <Loader2 size={11} className="animate-spin" />}
            Buy &amp; call
          </button>
        </div>
      </div>
    </div>
  );
}
