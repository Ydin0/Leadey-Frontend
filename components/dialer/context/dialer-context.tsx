"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCallContext } from "@/components/calling/call-context";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { confirmDncCall } from "@/lib/utils/dnc";
import {
  getActiveSession,
  getCurrent,
  advanceSession,
  skipSession,
  backSession,
  pauseSession,
  resumeSession,
  endSession,
  getVoicemailDrops,
  dropVoicemail,
  subscribeToCallEvents,
} from "@/lib/api/dialer";
import type {
  DialerSession,
  DialerQueueItem,
  VoicemailDrop,
} from "@/lib/types/dialer";

/** Seconds the bar counts down before auto-dialing the next lead. */
const AUTO_ADVANCE_SECONDS = 5;

type DialerMode = "running" | "paused";

interface DialerContextValue {
  session: DialerSession | null;
  currentItem: DialerQueueItem | null;
  upcoming: DialerQueueItem[];
  voicemails: VoicemailDrop[];
  /** "running" auto-dials between calls; "paused" halts the countdown. */
  mode: DialerMode;
  /** Seconds left before the next auto-dial, or null when not counting. */
  countdown: number | null;
  /** When true, the main screen follows the current lead's profile page and
   *  auto-navigates to the next lead as the dialer advances. */
  followMode: boolean;
  /** Open the current lead's profile and start following subsequent leads. */
  openFollow: () => void;
  /** Stop following (stay on the current page). */
  stopFollow: () => void;
  /** True while Twilio is connecting or a call is live. */
  isDialing: boolean;
  loading: boolean;
  error: string | null;
  /** Start showing a freshly created session (from the launcher) — no nav. */
  beginSession: (session: DialerSession) => void;
  /** Dial the current lead now (bypasses the countdown). */
  startNext: () => void;
  /** Advance to the next lead, recording the call + ticking the step. */
  advance: () => Promise<void>;
  skip: () => Promise<void>;
  back: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  end: () => Promise<void>;
  /** Clear the finished session from the bar. */
  dismiss: () => void;
  dropVm: (voicemailId?: string) => Promise<void>;
}

const DialerContext = createContext<DialerContextValue | null>(null);

export function useDialerContext(): DialerContextValue {
  const ctx = useContext(DialerContext);
  if (!ctx) throw new Error("useDialerContext must be used within DialerProvider");
  return ctx;
}

export function DialerProvider({ children }: { children: React.ReactNode }) {
  const call = useCallContext();
  const isAuthReady = useAuthReady();
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<DialerSession | null>(null);
  const [currentItem, setCurrentItem] = useState<DialerQueueItem | null>(null);
  const [upcoming, setUpcoming] = useState<DialerQueueItem[]>([]);
  const [voicemails, setVoicemails] = useState<VoicemailDrop[]>([]);
  const [mode, setMode] = useState<DialerMode>("running");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [followMode, setFollowMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tracks the lead id we last navigated to in follow mode, so we can tell a
  // lead change (re-navigate) apart from the user navigating away (stop).
  const lastNavLeadRef = useRef<string | null>(null);

  const subscribedCallSidRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const autoVmRef = useRef(false);

  // ── Discover an active session on mount ──────────────────────────
  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    (async () => {
      try {
        const active = await getActiveSession();
        if (cancelled || !active) {
          if (!cancelled) setLoading(false);
          return;
        }
        const [snapshot, vms] = await Promise.all([
          getCurrent(active.id),
          getVoicemailDrops().catch(() => [] as VoicemailDrop[]),
        ]);
        if (cancelled) return;
        setSession(snapshot.session);
        setCurrentItem(snapshot.current);
        setUpcoming(snapshot.upcoming);
        setVoicemails(vms);
        setMode(snapshot.session.status === "paused" ? "paused" : "running");
      } catch {
        // No active session / failed — leave the bar hidden.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthReady]);

  const refresh = useCallback(async (sessionId: string) => {
    const snapshot = await getCurrent(sessionId);
    setSession(snapshot.session);
    setCurrentItem(snapshot.current);
    setUpcoming(snapshot.upcoming);
    return snapshot;
  }, []);

  const beginSession = useCallback(
    (next: DialerSession) => {
      setSession(next);
      setMode("running");
      setError(null);
      void refresh(next.id);
      void getVoicemailDrops().then(setVoicemails).catch(() => {});
    },
    [refresh],
  );

  // ── SSE for the active call (AMD / VM-drop) ──────────────────────
  useEffect(() => {
    const sid = call.activeCall?.callId || null;
    if (!sid) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      subscribedCallSidRef.current = null;
      return;
    }
    if (sid === subscribedCallSidRef.current) return;
    subscribedCallSidRef.current = sid;
    autoVmRef.current = false;

    const unsub = subscribeToCallEvents(sid, {
      onVmDropped: () => {
        autoVmRef.current = true;
      },
    });
    unsubscribeRef.current = unsub;
    return () => unsub();
  }, [call.activeCall?.callId]);

  // ── Actions ──────────────────────────────────────────────────────

  const startNext = useCallback(() => {
    if (!currentItem) return;
    if (call.activeCall) return;
    if (currentItem.lead?.doNotCall && !confirmDncCall(currentItem.lead?.name)) return;
    setCountdown(null);
    call.startCall(currentItem.leadPhone, {
      contactName: currentItem.lead?.name || null,
      companyName: currentItem.lead?.company || null,
      leadId: currentItem.leadId || null,
    });
  }, [currentItem, call]);

  const advance = useCallback(async () => {
    if (!session) return;
    try {
      const callRecordId = call.lastEndedCall?.callRecordId || undefined;
      await advanceSession(session.id, { callRecordId });
      await refresh(session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to advance");
    }
  }, [session, call.lastEndedCall, refresh]);

  const skip = useCallback(async () => {
    if (!session) return;
    try {
      await skipSession(session.id);
      await refresh(session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to skip");
    }
  }, [session, refresh]);

  const back = useCallback(async () => {
    if (!session) return;
    try {
      await backSession(session.id);
      await refresh(session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to go back");
    }
  }, [session, refresh]);

  const pause = useCallback(async () => {
    if (!session) return;
    setMode("paused");
    setCountdown(null);
    try {
      const updated = await pauseSession(session.id);
      setSession(updated);
    } catch {
      // local pause still applies
    }
  }, [session]);

  const resume = useCallback(async () => {
    if (!session) return;
    setMode("running");
    try {
      const updated = await resumeSession(session.id);
      setSession(updated);
    } catch {
      // local resume still applies
    }
  }, [session]);

  const end = useCallback(async () => {
    if (!session) return;
    setCountdown(null);
    try {
      await endSession(session.id);
    } catch {
      // ignore
    }
    setSession(null);
    setCurrentItem(null);
    setUpcoming([]);
  }, [session]);

  const dismiss = useCallback(() => {
    setSession(null);
    setCurrentItem(null);
    setUpcoming([]);
    setCountdown(null);
    setFollowMode(false);
  }, []);

  const leadPath = useCallback(
    (leadId: string) =>
      session?.funnelId
        ? `/dashboard/funnels/${session.funnelId}/leads/${leadId}`
        : null,
    [session?.funnelId],
  );

  const openFollow = useCallback(() => {
    if (!currentItem || !session?.funnelId) return;
    setFollowMode(true);
    lastNavLeadRef.current = currentItem.leadId;
    const p = leadPath(currentItem.leadId);
    if (p) router.push(p);
  }, [currentItem, session?.funnelId, leadPath, router]);

  const stopFollow = useCallback(() => {
    setFollowMode(false);
    lastNavLeadRef.current = null;
  }, []);

  const dropVm = useCallback(
    async (voicemailId?: string) => {
      const callSid = call.activeCall?.callId;
      if (!callSid) {
        setError("No active call to drop VM into");
        return;
      }
      const vmId =
        voicemailId || voicemails.find((v) => v.isDefault)?.id || voicemails[0]?.id;
      if (!vmId) {
        setError("No voicemail recordings available. Record one in settings.");
        return;
      }
      try {
        await dropVoicemail(vmId, callSid);
        autoVmRef.current = true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to drop voicemail");
      }
    },
    [call.activeCall?.callId, voicemails],
  );

  // ── Auto-advance when a call ends ────────────────────────────────
  // On connected → ended, record the call (no disposition) and move on. The
  // new currentItem re-triggers the countdown below.
  const prevStateRef = useRef<string | null>(null);
  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  useEffect(() => {
    const state = call.activeCall?.state || null;
    // Advance after any dialed call ends — whether it connected or just rang
    // out (no answer / busy / failed) — so the queue keeps moving.
    if (
      (prevStateRef.current === "connected" || prevStateRef.current === "ringing") &&
      state === "ended"
    ) {
      autoVmRef.current = false;
      void advanceRef.current();
    }
    prevStateRef.current = state;
  }, [call.activeCall?.state]);

  // ── Countdown engine: auto-dial the current lead ─────────────────
  const startNextRef = useRef(startNext);
  startNextRef.current = startNext;
  const canAutoDial =
    !!session &&
    session.status === "active" &&
    mode === "running" &&
    !!currentItem &&
    !call.activeCall;
  useEffect(() => {
    if (!canAutoDial) {
      setCountdown(null);
      return;
    }
    let n = AUTO_ADVANCE_SECONDS;
    setCountdown(n);
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(id);
        setCountdown(null);
        startNextRef.current();
      } else {
        setCountdown(n);
      }
    }, 1000);
    return () => clearInterval(id);
    // Re-arm whenever the target lead, mode, session status, or call presence
    // changes. currentItem?.id drives advancing to the next lead.
  }, [canAutoDial, currentItem?.id, session?.status, mode]);

  // ── Follow mode: keep the main screen on the current lead's profile ──
  // When the current lead changes, navigate to its profile. If the user
  // navigates away on their own, stop following.
  useEffect(() => {
    if (!followMode) {
      lastNavLeadRef.current = null;
      return;
    }
    if (!currentItem || !session?.funnelId) return;
    const leadId = currentItem.leadId;
    const expected = `/dashboard/funnels/${session.funnelId}/leads/${leadId}`;
    if (lastNavLeadRef.current !== leadId) {
      // Lead changed (advance / skip / back) or just opened → go to it.
      lastNavLeadRef.current = leadId;
      if (pathname !== expected) router.push(expected);
    } else if (pathname !== expected) {
      // Same lead but the user navigated elsewhere → stop following.
      setFollowMode(false);
    }
  }, [followMode, currentItem, session?.funnelId, pathname, router]);

  const isDialing =
    call.activeCall?.state === "ringing" || call.activeCall?.state === "connected";

  return (
    <DialerContext.Provider
      value={{
        session,
        currentItem,
        upcoming,
        voicemails,
        mode,
        countdown,
        followMode,
        openFollow,
        stopFollow,
        isDialing,
        loading,
        error,
        beginSession,
        startNext,
        advance,
        skip,
        back,
        pause,
        resume,
        end,
        dismiss,
        dropVm,
      }}
    >
      {children}
    </DialerContext.Provider>
  );
}
