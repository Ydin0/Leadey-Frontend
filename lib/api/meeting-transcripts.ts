import { apiRequest } from "./client";

export type TranscriptProvider = "fathom" | "fireflies";

export interface TranscriptsStatus {
  fathom: { connected: boolean };
  fireflies: { connected: boolean };
}

export interface TranscriptSentence {
  speaker: string | null;
  text: string;
  start: number | null;
}

export interface TranscriptSummary {
  overview: string | null;
  actionItems: string[];
  keywords: string[];
}

export interface CallScoreMetric {
  key: string;
  label: string;
  score: number;
  max: number;
  note: string | null;
}

export interface CallScore {
  overall: number;
  verdict: string;
  metrics: CallScoreMetric[];
  strengths: string[];
  improvements: string[];
  talkRatio: { rep: number; prospect: number } | null;
  model: string;
  generatedAt: string;
}

export interface MeetingTranscript {
  id: string;
  provider: TranscriptProvider;
  /** The scheduled/calendar meeting row this was matched to, when known. */
  meetingId: string | null;
  title: string;
  heldAt: string | null;
  durationSec: number | null;
  embedUrl: string | null;
  recordingUrl: string | null;
  hasRecording: boolean;
  /** Whether a call score has been generated + cached. */
  scored: boolean;
  sentenceCount: number;
  /** Present only on the detail endpoint. */
  summary?: TranscriptSummary | null;
  transcript?: TranscriptSentence[];
  score?: CallScore | null;
}

export async function getTranscriptsStatus(): Promise<TranscriptsStatus> {
  return apiRequest<TranscriptsStatus>("/integrations/transcripts/status");
}

export async function connectTranscriptProvider(provider: TranscriptProvider, apiKey: string): Promise<{ connected: boolean; account: string | null }> {
  return apiRequest(`/integrations/transcripts/${provider}`, { method: "PUT", body: JSON.stringify({ apiKey }) });
}

export async function disconnectTranscriptProvider(provider: TranscriptProvider): Promise<{ connected: boolean }> {
  return apiRequest(`/integrations/transcripts/${provider}`, { method: "DELETE" });
}

export async function pullLeadTranscripts(funnelId: string, leadId: string): Promise<{ linked: number; checked: number; connected: boolean; reason?: string }> {
  return apiRequest(
    `/funnels/${encodeURIComponent(funnelId)}/leads/${encodeURIComponent(leadId)}/pull-transcripts`,
    { method: "POST" },
  );
}

export async function listLeadTranscripts(leadId: string): Promise<MeetingTranscript[]> {
  return apiRequest<MeetingTranscript[]>(`/meeting-transcripts/lead/${encodeURIComponent(leadId)}`);
}

export async function getMeetingTranscript(id: string): Promise<MeetingTranscript> {
  return apiRequest<MeetingTranscript>(`/meeting-transcripts/${encodeURIComponent(id)}`);
}

/** Remove a recording/transcript from a lead (e.g. a wrongly-matched pull). */
export async function deleteMeetingTranscript(id: string): Promise<void> {
  await apiRequest(`/meeting-transcripts/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Generate (or return cached) AI call scoring. Pass force to re-score. */
export async function scoreMeetingTranscript(id: string, force = false): Promise<CallScore> {
  return apiRequest<CallScore>(`/meeting-transcripts/${encodeURIComponent(id)}/score`, {
    method: "POST",
    body: JSON.stringify({ force }),
  });
}
