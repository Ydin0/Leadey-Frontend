import { apiRequest, getAuthToken } from "./client";
import type {
  CallDisposition,
  VoicemailDrop,
  FunnelDispositionRule,
  DialerSession,
  DialerSessionFilters,
  DialerCurrentResponse,
  DialerAdvanceResponse,
  DialerQueueItem,
  FunnelAction,
} from "@/lib/types/dialer";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3001";

// ── Dispositions ────────────────────────────────────────────────────

export async function getDispositions(): Promise<CallDisposition[]> {
  return apiRequest<CallDisposition[]>("/call-dispositions");
}

export async function createDisposition(
  data: Partial<CallDisposition> & { slug: string; label: string; outcomeBucket: string },
): Promise<CallDisposition> {
  return apiRequest<CallDisposition>("/call-dispositions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateDisposition(
  id: string,
  data: Partial<CallDisposition>,
): Promise<CallDisposition> {
  return apiRequest<CallDisposition>(`/call-dispositions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteDisposition(id: string): Promise<void> {
  await apiRequest(`/call-dispositions/${id}`, { method: "DELETE" });
}

// ── Voicemail drops ─────────────────────────────────────────────────

export async function getVoicemailDrops(): Promise<VoicemailDrop[]> {
  return apiRequest<VoicemailDrop[]>("/dialer/voicemail-drops");
}

/** Upload a recorded VM. `audio` is a Blob from the browser MediaRecorder
 *  or a File from a file input. */
export async function uploadVoicemailDrop(params: {
  audio: Blob;
  name: string;
  durationSeconds?: number;
  isDefault?: boolean;
  scope?: "user" | "org";
}): Promise<VoicemailDrop> {
  const form = new FormData();
  form.append("audio", params.audio, "voicemail.webm");
  form.append("name", params.name);
  if (params.durationSeconds != null) form.append("durationSeconds", String(params.durationSeconds));
  if (params.isDefault) form.append("isDefault", "true");
  if (params.scope) form.append("scope", params.scope);

  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/dialer/voicemail-drops`, {
    method: "POST",
    headers,
    body: form,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Upload failed");
  }
  return payload.data as VoicemailDrop;
}

export async function deleteVoicemailDrop(id: string): Promise<void> {
  await apiRequest(`/dialer/voicemail-drops/${id}`, { method: "DELETE" });
}

export async function dropVoicemail(voicemailId: string, callSid: string): Promise<void> {
  await apiRequest(`/dialer/voicemail-drops/${voicemailId}/drop`, {
    method: "POST",
    body: JSON.stringify({ callSid }),
  });
}

// ── Funnel disposition rules ────────────────────────────────────────

export async function getFunnelStepRules(stepId: string): Promise<FunnelDispositionRule[]> {
  return apiRequest<FunnelDispositionRule[]>(`/funnel-steps/${stepId}/disposition-rules`);
}

export async function setFunnelStepRules(
  stepId: string,
  rules: Array<{ dispositionId: string; funnelAction: FunnelAction; retryAfterDays: number | null }>,
): Promise<FunnelDispositionRule[]> {
  return apiRequest<FunnelDispositionRule[]>(`/funnel-steps/${stepId}/disposition-rules`, {
    method: "PATCH",
    body: JSON.stringify({ rules }),
  });
}

// ── Sessions ────────────────────────────────────────────────────────

export async function createSession(params: {
  /** Target a specific call step, OR a whole campaign via funnelId. */
  funnelStepId?: string;
  funnelId?: string;
  filters?: Partial<DialerSessionFilters>;
}): Promise<{ session: DialerSession; current: DialerQueueItem | null; excluded: { dnc: number; recent: number; timezone: number } }> {
  return apiRequest("/dialer/sessions", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getActiveSession(): Promise<DialerSession | null> {
  return apiRequest<DialerSession | null>("/dialer/sessions/active");
}

export async function pauseSession(id: string): Promise<DialerSession> {
  return apiRequest<DialerSession>(`/dialer/sessions/${id}/pause`, { method: "POST" });
}

export async function resumeSession(id: string): Promise<DialerSession> {
  return apiRequest<DialerSession>(`/dialer/sessions/${id}/resume`, { method: "POST" });
}

export async function endSession(id: string): Promise<DialerSession> {
  return apiRequest<DialerSession>(`/dialer/sessions/${id}/end`, { method: "POST" });
}

export async function getCurrent(id: string): Promise<DialerCurrentResponse> {
  return apiRequest<DialerCurrentResponse>(`/dialer/sessions/${id}/current`);
}

export async function advanceSession(
  id: string,
  params: { dispositionSlug?: string; notes?: string; callRecordId?: string },
): Promise<DialerAdvanceResponse> {
  return apiRequest<DialerAdvanceResponse>(`/dialer/sessions/${id}/advance`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function skipSession(
  id: string,
  reason?: string,
): Promise<{ next: DialerQueueItem | null; sessionComplete: boolean }> {
  return apiRequest(`/dialer/sessions/${id}/skip`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function backSession(id: string): Promise<{ current: DialerQueueItem }> {
  return apiRequest(`/dialer/sessions/${id}/back`, { method: "POST" });
}

/** Subscribe to call-scoped SSE events. Returns an unsubscribe function. */
export function subscribeToCallEvents(
  callSid: string,
  handlers: {
    onRecordingComplete?: (e: { callRecordId: string; recordingUrl: string }) => void;
    onVmDropped?: (e: { voicemailId: string }) => void;
    onAmdDetected?: (e: { answeredBy: string }) => void;
  },
): () => void {
  const token = getAuthToken();
  // EventSource doesn't support headers natively; we pass the token via
  // querystring as a fallback. The backend can read it from either.
  const url = `${API_BASE_URL}/api/dialer/calls/${callSid}/events${
    token ? `?token=${encodeURIComponent(token)}` : ""
  }`;
  const es = new EventSource(url, { withCredentials: true });
  es.addEventListener("recording-complete", (ev) => {
    try {
      const data = JSON.parse((ev as MessageEvent).data);
      handlers.onRecordingComplete?.(data);
    } catch {}
  });
  es.addEventListener("vm-dropped", (ev) => {
    try {
      const data = JSON.parse((ev as MessageEvent).data);
      handlers.onVmDropped?.(data);
    } catch {}
  });
  es.addEventListener("amd-detected", (ev) => {
    try {
      const data = JSON.parse((ev as MessageEvent).data);
      handlers.onAmdDetected?.(data);
    } catch {}
  });
  return () => es.close();
}
