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

/** Default seconds the bar counts down before auto-dialing the next lead.
 *  Reps can change this (or set it to 0 for manual) via the bar; the choice is
 *  persisted in localStorage. */
const DEFAULT_AUTO_ADVANCE_SECONDS = 5;
const FOLLOW_KEY = "dialer:followMode";
const AUTO_ADVANCE_KEY = "dialer:autoAdvanceSeconds";

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
   *  auto-navigates to the next lead as the dialer advances. On by default. */
  followMode: boolean;
  /** Open the current lead's profile and start following subsequent leads. */
  openFollow: () => void;
  /** Stop following (stay on the current page). */
  stopFollow: () => void;
  /** Seconds to wait before auto-dialing the next lead; 0 = manual only. */
  autoAdvanceSeconds: number;
  /** Update the auto-dial wait (persisted to localStorage). */
  setAutoAdvanceSeconds: (seconds: number) => void;
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
  /** Skip to the next lead and start dialing it immediately (the "Next"
   *  button) — bypasses the countdown instead of resetting it. */
  nextNow: () => Promise<void>;
  back: () => Promise<void>;
  pause: (hangUp?: boolean) => Promise<void>;
  resume: () => Promise<void>;
  /** Auto-pause the countdown when the rep starts working the lead (clicks
   *  email/text/note etc.) — Close-style. No-ops unless a countdown is live. */
  pauseForEngagement: () => void;
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
  // Follow mode is ON by default so the rep always lands on the lead being
  // dialed without clicking "Open". The stored preference is loaded in an
  // effect below to avoid an SSR/hydration mismatch on the button label.
  const [followMode, setFollowMode] = useState(true);
  const [autoAdvanceSeconds, setAutoAdvanceSecondsState] = useState(
    DEFAULT_AUTO_ADVANCE_SECONDS,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // True while advance() is mid-flight (recording the call + fetching the next
  // contact). Auto-dial is blocked until it settles so the countdown can never
  // re-arm on the just-called contact and dial them again.
  const [advancing, setAdvancing] = useState(false);

  // Load persisted preferences once on the client.
  useEffect(() => {
    try {
      const f = window.localStorage.getItem(FOLLOW_KEY);
      if (f !== null) setFollowMode(f === "true");
      const a = window.localStorage.getItem(AUTO_ADVANCE_KEY);
      if (a !== null) {
        const n = Number(a);
        if (Number.isFinite(n) && n >= 0) setAutoAdvanceSecondsState(n);
      }
    } catch {
      // localStorage unavailable — keep defaults.
    }
  }, []);

  const setAutoAdvanceSeconds = useCallback((seconds: number) => {
    setAutoAdvanceSecondsState(seconds);
    try {
      window.localStorage.setItem(AUTO_ADVANCE_KEY, String(seconds));
    } catch {
      // ignore
    }
  }, []);

  // Tracks the lead id we last navigated to in follow mode, so we can tell a
  // lead change (re-navigate) apart from the user navigating away (stop).
  const lastNavLeadRef = useRef<string | null>(null);
  // The queue item the dialer last placed a call to. The auto-dialer refuses to
  // dial the same item twice in a row, so a stale countdown can never re-call a
  // contact whose call already ended.
  const lastDialedItemIdRef = useRef<string | null>(null);

  const subscribedCallSidRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const autoVmRef = useRef(false);
  // The live auto-dial countdown interval — held in a ref so end()/pause() can
  // kill it SYNCHRONOUSLY. The interval keeps its own local counter, so merely
  // clearing the `countdown` state doesn't stop it: it would tick to zero during
  // an in-flight endSession() await and place a call after the rep hit End.
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Hard stop flag set the instant the rep ends a session — blocks any auto-dial
  // even before the session-null re-render lands. Reset when a new session begins.
  const stoppedRef = useRef(false);
  // Live mirror of `mode`, set SYNCHRONOUSLY by pause()/resume() (not waiting for
  // a re-render). The auto-dial interval consults this so a tick can never fire a
  // call in the window between "paused" being set and the ref-updating render —
  // the root of the intermittent "dials while paused" bug.
  const modeRef = useRef<DialerMode>("running");

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
        // A restored session ALWAYS comes back paused — never start auto-dialing
        // the instant the app loads. The rep resumes explicitly from the bar.
        // (Fixes "it starts dialing immediately when I first log in".)
        modeRef.current = "paused";
        setMode("paused");
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
    // A successful read means we're reconnected — drop any stale error banner.
    setError(null);
    return snapshot;
  }, []);

  // After a mutation (advance/skip/back) fails on a network blip, re-read the
  // session to reconcile true state. The read is retried by the API client, so
  // if the backend recovered (and the mutation may well have applied), this
  // clears the banner. Only a failed reconcile surfaces a soft error.
  const reconcile = useCallback(
    async (sessionId: string) => {
      try {
        await refresh(sessionId);
      } catch {
        setError("Reconnecting…");
      }
    },
    [refresh],
  );

  // Synchronously kill the auto-dial countdown — clears the live interval (not
  // just the displayed number) so it can't tick to zero and place a call.
  const stopCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
  }, []);

  const beginSession = useCallback(
    (next: DialerSession) => {
      stoppedRef.current = false;
      modeRef.current = "running";
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

  // Dial a specific queue item now. Shared by the countdown engine, the
  // "Call now" button, and nextNow so they all honour the DNC guard.
  const dialItem = useCallback(
    (item: DialerQueueItem | null) => {
      if (!item) return;
      if (stoppedRef.current) return; // session ended — never place a call
      if (call.activeCall || call.incomingCall) return; // busy or a call is ringing in
      if (item.lead?.doNotCall && !confirmDncCall(item.lead?.name)) return;
      setCountdown(null);
      lastDialedItemIdRef.current = item.id;
      call.startCall(item.leadPhone, {
        contactName: item.lead?.name || null,
        companyName: item.lead?.company || null,
        leadId: item.leadId || null,
      });
    },
    [call],
  );

  const startNext = useCallback(() => {
    dialItem(currentItem);
  }, [dialItem, currentItem]);

  const advance = useCallback(async () => {
    if (!session) return;
    // Hold off auto-dial until the next contact is actually loaded.
    setAdvancing(true);
    try {
      const callRecordId = call.lastEndedCall?.callRecordId || undefined;
      await advanceSession(session.id, { callRecordId });
      await refresh(session.id);
    } catch {
      // Network blip on the POST — re-read to reconcile rather than stick a
      // raw "Failed to fetch" banner (the advance may have applied).
      await reconcile(session.id);
    } finally {
      setAdvancing(false);
    }
  }, [session, call.lastEndedCall, refresh, reconcile]);

  const skip = useCallback(async () => {
    if (!session) return;
    try {
      await skipSession(session.id);
      await refresh(session.id);
    } catch {
      await reconcile(session.id);
    }
  }, [session, refresh, reconcile]);

  // The "Next" button / S key: go straight to the next lead and dial it. If a
  // call is live, hang up first and let the auto-advance handler move on (the
  // countdown there is bypassed below). Otherwise skip the current lead and
  // immediately dial the new one — no 5s wait, no timer reset.
  const nextNow = useCallback(async () => {
    if (!session) return;
    if (call.activeCall) {
      call.endCall();
      return;
    }
    try {
      await skipSession(session.id);
      const snapshot = await refresh(session.id);
      dialItem(snapshot.current);
    } catch {
      await reconcile(session.id);
    }
  }, [session, call, refresh, dialItem, reconcile]);

  const back = useCallback(async () => {
    if (!session) return;
    try {
      await backSession(session.id);
      await refresh(session.id);
    } catch {
      await reconcile(session.id);
    }
  }, [session, refresh, reconcile]);

  // `hangUp` ends any live call too — that's what the explicit Pause button /
  // Space key do ("stop the call completely"). The auto-pause on engagement
  // (pauseForEngagement) passes false so logging a note mid-call never drops it.
  const pause = useCallback(async (hangUp = false) => {
    if (!session) return;
    modeRef.current = "paused"; // synchronous gate — blocks any in-flight tick
    setMode("paused");
    stopCountdown(); // kill the live interval now, not just the displayed number
    if (hangUp && call.activeCall) call.endCall();
    try {
      const updated = await pauseSession(session.id);
      setSession(updated);
    } catch {
      // local pause still applies
    }
  }, [session, stopCountdown, call]);

  const resume = useCallback(async () => {
    if (!session) return;
    modeRef.current = "running";
    setMode("running");
    try {
      await resumeSession(session.id);
      // Re-sync the current item so we continue from exactly where we paused
      // (and pick up anything advanced from another tab) — never from the top.
      await refresh(session.id);
    } catch {
      // local resume still applies
    }
  }, [session, refresh]);

  // Pause the auto-dial countdown the moment the rep starts working the lead.
  // Only fires while a countdown is actually ticking, so it never interferes
  // outside the wait window.
  const pauseForEngagement = useCallback(() => {
    if (mode === "running" && countdown !== null) void pause();
  }, [mode, countdown, pause]);

  const end = useCallback(async () => {
    if (!session) return;
    // Tear everything down SYNCHRONOUSLY first, before the network call:
    //  • stoppedRef blocks any auto-dial that races the re-render
    //  • stopCountdown kills the live interval so it can't fire startNext()
    //  • hang up any live call so the dialer can't keep a call connected with
    //    no bar showing ("I ended it and someone started speaking")
    //  • clear session state so the bar disappears and canAutoDial goes false
    stoppedRef.current = true;
    modeRef.current = "paused";
    stopCountdown();
    if (call.activeCall) call.endCall();
    setSession(null);
    setCurrentItem(null);
    setUpcoming([]);
    setMode("paused");
    try {
      await endSession(session.id);
    } catch {
      // UI already torn down — ignore a failed end POST.
    }
  }, [session, call, stopCountdown]);

  const dismiss = useCallback(() => {
    stoppedRef.current = true;
    modeRef.current = "paused";
    stopCountdown();
    setSession(null);
    setCurrentItem(null);
    setUpcoming([]);
    setFollowMode(false);
  }, [stopCountdown]);

  const leadPath = useCallback(
    (leadId: string) =>
      session?.funnelId
        ? `/dashboard/funnels/${session.funnelId}/leads/${leadId}`
        : null,
    [session?.funnelId],
  );

  // Navigate the main screen to a lead's profile (no-op if already there).
  const navigateToLead = useCallback(
    (leadId: string) => {
      const p = leadPath(leadId);
      if (p && pathname !== p) router.push(p);
    },
    [leadPath, pathname, router],
  );

  const persistFollow = useCallback((on: boolean) => {
    try {
      window.localStorage.setItem(FOLLOW_KEY, String(on));
    } catch {
      // ignore
    }
  }, []);

  const openFollow = useCallback(() => {
    setFollowMode(true);
    persistFollow(true);
    if (currentItem) {
      lastNavLeadRef.current = currentItem.leadId;
      navigateToLead(currentItem.leadId);
    }
  }, [currentItem, navigateToLead, persistFollow]);

  const stopFollow = useCallback(() => {
    setFollowMode(false);
    persistFollow(false);
    // Reset so re-enabling navigates to the current lead again.
    lastNavLeadRef.current = null;
  }, [persistFollow]);

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
  const prevDirectionRef = useRef<string | null>(null);
  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  useEffect(() => {
    const state = call.activeCall?.state || null;
    const direction = call.activeCall?.direction || null;
    // Advance after any OUTBOUND dialed call ends — whether it connected or
    // just rang out (no answer / busy / failed) — so the queue keeps moving.
    // Inbound calls must never advance the dialer queue.
    if (
      (prevStateRef.current === "connected" || prevStateRef.current === "ringing") &&
      state === "ended" &&
      prevDirectionRef.current === "outbound"
    ) {
      autoVmRef.current = false;
      void advanceRef.current();
    }
    prevStateRef.current = state;
    prevDirectionRef.current = direction;
  }, [call.activeCall?.state, call.activeCall?.direction]);

  // ── Countdown engine: auto-dial the current lead ─────────────────
  const startNextRef = useRef(startNext);
  startNextRef.current = startNext;
  const canAutoDial =
    !stoppedRef.current &&
    !!session &&
    session.status === "active" &&
    mode === "running" &&
    !!currentItem &&
    !call.activeCall &&
    !call.incomingCall &&
    !advancing &&
    // Never auto-dial the contact we just called — if the queue hasn't moved on
    // yet (advance still settling, or it failed), wait rather than re-dial them.
    currentItem?.id !== lastDialedItemIdRef.current &&
    autoAdvanceSeconds > 0;
  // Live mirror of the gating condition. The interval below re-checks this on
  // every tick so a Pause (or an incoming/active call) that lands mid-countdown
  // stops the auto-dial immediately — instead of a stale captured callback
  // firing a call after the dialer was paused (the "dials while paused" race).
  const canAutoDialRef = useRef(canAutoDial);
  canAutoDialRef.current = canAutoDial;
  modeRef.current = mode;
  useEffect(() => {
    if (!canAutoDial) {
      setCountdown(null);
      return;
    }
    let n = autoAdvanceSeconds;
    setCountdown(n);
    // The gate the interval trusts on EVERY tick: canAutoDial holds AND we're
    // synchronously still running (modeRef flips to "paused" inside pause()
    // before any render, closing the intermittent "dials while paused" race).
    const gateOpen = () =>
      canAutoDialRef.current && !stoppedRef.current && modeRef.current === "running";
    const id = setInterval(() => {
      // Re-validate against live state — never auto-dial once paused / busy /
      // ended (modeRef/stoppedRef flip the instant the rep pauses or ends).
      if (!gateOpen()) {
        clearInterval(id);
        if (countdownIntervalRef.current === id) countdownIntervalRef.current = null;
        setCountdown(null);
        return;
      }
      n -= 1;
      if (n <= 0) {
        clearInterval(id);
        if (countdownIntervalRef.current === id) countdownIntervalRef.current = null;
        setCountdown(null);
        if (gateOpen()) startNextRef.current();
      } else {
        setCountdown(n);
      }
    }, 1000);
    countdownIntervalRef.current = id;
    return () => {
      clearInterval(id);
      if (countdownIntervalRef.current === id) countdownIntervalRef.current = null;
    };
    // Re-arm whenever the target lead, mode, session status, call presence, or
    // configured wait changes. currentItem?.id drives advancing to the next lead.
  }, [canAutoDial, currentItem?.id, session?.status, mode, autoAdvanceSeconds]);

  // ── Follow mode: keep the main screen on the current lead's profile ──
  // Auto-navigate whenever the dialer moves to a NEW lead (advance / skip /
  // back / session start). We key off the lead id only — navigating to the
  // same lead twice is a no-op, and a rep who clicks elsewhere mid-lead is
  // left alone (no yank) until the next lead, at which point follow resumes.
  // Follow mode is never auto-disabled; the rep controls it via the toggle.
  useEffect(() => {
    if (!followMode) return;
    if (!currentItem || !session?.funnelId) return;
    const leadId = currentItem.leadId;
    if (lastNavLeadRef.current === leadId) return;
    lastNavLeadRef.current = leadId;
    navigateToLead(leadId);
  }, [followMode, currentItem, session?.funnelId, navigateToLead]);

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
        autoAdvanceSeconds,
        setAutoAdvanceSeconds,
        isDialing,
        loading,
        error,
        beginSession,
        startNext,
        advance,
        skip,
        nextNow,
        back,
        pause,
        resume,
        pauseForEngagement,
        end,
        dismiss,
        dropVm,
      }}
    >
      {children}
    </DialerContext.Provider>
  );
}
