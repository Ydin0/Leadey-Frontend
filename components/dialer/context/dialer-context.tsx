"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useCallContext } from "@/components/calling/call-context";
import {
  getCurrent,
  advanceSession,
  skipSession,
  backSession,
  pauseSession,
  resumeSession,
  endSession,
  getDispositions,
  getVoicemailDrops,
  dropVoicemail,
  subscribeToCallEvents,
} from "@/lib/api/dialer";
import type {
  DialerSession,
  DialerQueueItem,
  CallDisposition,
  VoicemailDrop,
} from "@/lib/types/dialer";

interface DialerContextValue {
  session: DialerSession | null;
  currentItem: DialerQueueItem | null;
  upcoming: DialerQueueItem[];
  dispositions: CallDisposition[];
  voicemails: VoicemailDrop[];
  /** Set to true after a call disconnects, cleared after the rep picks a
   *  disposition. Blocks startNext() while true. */
  awaitingDisposition: boolean;
  /** True while we're waiting for Twilio to connect or while a call is live. */
  isDialing: boolean;
  /** Slug of the last disposition picked — surfaced for "N = advance with
   *  last used" keyboard shortcut. */
  lastDispositionSlug: string | null;
  /** Most recent AMD result for the current call, if any. */
  amdResult: string | null;
  loading: boolean;
  error: string | null;
  startNext: () => void;
  advance: (dispositionSlug: string, notes?: string) => Promise<void>;
  skip: (reason?: string) => Promise<void>;
  back: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  end: () => Promise<void>;
  dropVm: (voicemailId?: string) => Promise<void>;
}

const DialerContext = createContext<DialerContextValue | null>(null);

export function useDialerContext(): DialerContextValue {
  const ctx = useContext(DialerContext);
  if (!ctx) throw new Error("useDialerContext must be used within DialerProvider");
  return ctx;
}

interface DialerProviderProps {
  sessionId: string;
  children: React.ReactNode;
}

export function DialerProvider({ sessionId, children }: DialerProviderProps) {
  const call = useCallContext();

  const [session, setSession] = useState<DialerSession | null>(null);
  const [currentItem, setCurrentItem] = useState<DialerQueueItem | null>(null);
  const [upcoming, setUpcoming] = useState<DialerQueueItem[]>([]);
  const [dispositions, setDispositions] = useState<CallDisposition[]>([]);
  const [voicemails, setVoicemails] = useState<VoicemailDrop[]>([]);
  const [awaitingDisposition, setAwaitingDisposition] = useState(false);
  const [lastDispositionSlug, setLastDispositionSlug] = useState<string | null>(null);
  const [amdResult, setAmdResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track which call SIDs we've already subscribed to so we don't double-bind.
  const subscribedCallSidRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  // When auto-disposition fires (e.g. VM drop), we set this so we don't
  // double-advance if the rep then clicks a disposition.
  const autoAdvancedRef = useRef(false);

  // ── Initial load ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [snapshot, dispos, vms] = await Promise.all([
          getCurrent(sessionId),
          getDispositions(),
          getVoicemailDrops(),
        ]);
        if (cancelled) return;
        setSession(snapshot.session);
        setCurrentItem(snapshot.current);
        setUpcoming(snapshot.upcoming);
        setDispositions(dispos);
        setVoicemails(vms);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load dialer session");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // ── Subscribe to SSE for the current call ────────────────────────
  useEffect(() => {
    const sid = call.activeCall?.callId || null;
    if (!sid) {
      // No active call — tear down any prior subscription
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      subscribedCallSidRef.current = null;
      return;
    }
    if (sid === subscribedCallSidRef.current) return;
    subscribedCallSidRef.current = sid;
    setAmdResult(null);
    autoAdvancedRef.current = false;

    const unsub = subscribeToCallEvents(sid, {
      onAmdDetected: ({ answeredBy }) => setAmdResult(answeredBy),
      onVmDropped: () => {
        // Backend dropped VM via AMD — auto-disposition as "voicemail".
        autoAdvancedRef.current = true;
        // Wait for the call to actually end (Twilio's <Play><Hangup/> will
        // disconnect shortly), then advance.
      },
      onRecordingComplete: () => {
        // Frontend reads the recording from the call_record via SSR/poll
        // on the call history page; nothing to do here for v1.
      },
    });
    unsubscribeRef.current = unsub;
    return () => {
      unsub();
    };
  }, [call.activeCall?.callId]);

  // ── Watch for call-end transitions ──────────────────────────────
  // When activeCall flips to ended, set awaitingDisposition. If the call
  // was auto-VM-dropped, fire the "voicemail" disposition automatically.
  const prevStateRef = useRef<string | null>(null);
  useEffect(() => {
    const state = call.activeCall?.state || null;
    if (prevStateRef.current === "connected" && state === "ended") {
      if (autoAdvancedRef.current) {
        // AMD-driven auto-advance
        autoAdvancedRef.current = false;
        void advance("voicemail");
      } else {
        setAwaitingDisposition(true);
      }
    }
    // When the activeCall is cleared (null), reset to idle
    if (prevStateRef.current && state === null) {
      // no-op — awaitingDisposition stays true until rep picks one
    }
    prevStateRef.current = state;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.activeCall?.state]);

  // ── Actions ──────────────────────────────────────────────────────

  const startNext = useCallback(() => {
    if (!currentItem) return;
    if (awaitingDisposition) return;
    if (call.activeCall) return;
    call.startCall(currentItem.leadPhone, {
      contactName: currentItem.lead?.name || null,
      companyName: currentItem.lead?.company || null,
      leadId: currentItem.leadId || null,
    });
  }, [currentItem, awaitingDisposition, call]);

  const advance = useCallback(
    async (dispositionSlug: string, notes?: string) => {
      if (!session) return;
      try {
        // Resolve the saved callRecordId from CallContext if we have one
        // for this exact call.
        const callRecordId = call.lastEndedCall?.callRecordId || undefined;
        const result = await advanceSession(session.id, {
          dispositionSlug,
          notes,
          callRecordId,
        });
        setLastDispositionSlug(dispositionSlug);
        setAwaitingDisposition(false);
        // Re-fetch state to get fresh counters + upcoming
        const snapshot = await getCurrent(session.id);
        setSession(snapshot.session);
        setCurrentItem(snapshot.current);
        setUpcoming(snapshot.upcoming);
        if (result.sessionComplete) {
          // Surface complete state — UI handles via session.status
        }
      } catch (err: any) {
        setError(err?.message || "Failed to advance");
      }
    },
    [session, call.lastEndedCall],
  );

  const skip = useCallback(
    async (reason?: string) => {
      if (!session) return;
      try {
        await skipSession(session.id, reason);
        setAwaitingDisposition(false);
        const snapshot = await getCurrent(session.id);
        setSession(snapshot.session);
        setCurrentItem(snapshot.current);
        setUpcoming(snapshot.upcoming);
      } catch (err: any) {
        setError(err?.message || "Failed to skip");
      }
    },
    [session],
  );

  const back = useCallback(async () => {
    if (!session) return;
    try {
      await backSession(session.id);
      setAwaitingDisposition(false);
      const snapshot = await getCurrent(session.id);
      setSession(snapshot.session);
      setCurrentItem(snapshot.current);
      setUpcoming(snapshot.upcoming);
    } catch (err: any) {
      setError(err?.message || "Failed to go back");
    }
  }, [session]);

  const pause = useCallback(async () => {
    if (!session) return;
    const updated = await pauseSession(session.id);
    setSession(updated);
  }, [session]);

  const resume = useCallback(async () => {
    if (!session) return;
    const updated = await resumeSession(session.id);
    setSession(updated);
  }, [session]);

  const end = useCallback(async () => {
    if (!session) return;
    const updated = await endSession(session.id);
    setSession(updated);
  }, [session]);

  const dropVm = useCallback(
    async (voicemailId?: string) => {
      const callSid = call.activeCall?.callId;
      if (!callSid) {
        setError("No active call to drop VM into");
        return;
      }
      const vmId =
        voicemailId ||
        voicemails.find((v) => v.isDefault)?.id ||
        voicemails[0]?.id;
      if (!vmId) {
        setError("No voicemail recordings available. Record one in settings.");
        return;
      }
      try {
        await dropVoicemail(vmId, callSid);
        // Twilio will <Play><Hangup/> the call; the SSE event + disconnect
        // handler will auto-advance as "voicemail".
        autoAdvancedRef.current = true;
      } catch (err: any) {
        setError(err?.message || "Failed to drop voicemail");
      }
    },
    [call.activeCall?.callId, voicemails],
  );

  const isDialing =
    call.activeCall?.state === "ringing" ||
    call.activeCall?.state === "connected";

  return (
    <DialerContext.Provider
      value={{
        session,
        currentItem,
        upcoming,
        dispositions,
        voicemails,
        awaitingDisposition,
        isDialing,
        lastDispositionSlug,
        amdResult,
        loading,
        error,
        startNext,
        advance,
        skip,
        back,
        pause,
        resume,
        end,
        dropVm,
      }}
    >
      {children}
    </DialerContext.Provider>
  );
}
