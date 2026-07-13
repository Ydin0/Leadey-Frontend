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

export interface MeetingTranscript {
  id: string;
  provider: TranscriptProvider;
  title: string;
  heldAt: string | null;
  durationSec: number | null;
  embedUrl: string | null;
  recordingUrl: string | null;
  hasRecording: boolean;
  sentenceCount: number;
  /** Present only on the detail endpoint. */
  summary?: TranscriptSummary | null;
  transcript?: TranscriptSentence[];
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
