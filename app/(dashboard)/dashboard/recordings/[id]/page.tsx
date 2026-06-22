"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Headphones, AlertCircle,
} from "lucide-react";
import { cn, formatRelativeTime, formatPhoneIntl } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { CallReview } from "@/components/recordings/call-review";
import { ShareRecordingButton } from "@/components/recordings/share-recording-button";
import { getCallRecord, summarizeCall } from "@/lib/api/phone-lines";
import type { CallRecord } from "@/lib/types/calling";

const directionConfig = {
  inbound: { icon: PhoneIncoming, label: "Inbound", className: "text-signal-green-text" },
  outbound: { icon: PhoneOutgoing, label: "Outbound", className: "text-signal-blue-text" },
  missed: { icon: PhoneMissed, label: "Missed", className: "text-signal-red-text" },
};

const dispositionBadge: Record<string, string> = {
  completed: "bg-signal-green text-signal-green-text",
  "no-answer": "bg-signal-slate text-signal-slate-text",
  busy: "bg-signal-slate text-signal-slate-text",
  voicemail: "bg-signal-blue text-signal-blue-text",
  failed: "bg-signal-red text-signal-red-text",
};

function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RecordingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const isAuthReady = useAuthReady();

  const [record, setRecord] = useState<CallRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rec = await getCallRecord(id);
      setRecord(rec);
      // Auto-transcribe on open when we have a recording but no transcript yet,
      // so a shared link "just shows" the full review (Close-style).
      if (rec.recordingUrl && !rec.transcript && !rec.summary) {
        setGenerating(true);
        try {
          const res = await summarizeCall(rec.id);
          setRecord((prev) => (prev ? { ...prev, ...res } : prev));
        } catch {
          // leave as-is; the manual "Generate" affordance still works
        } finally {
          setGenerating(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "This recording could not be found.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isAuthReady) return;
    void load();
  }, [isAuthReady, load]);

  const regenerate = useCallback(async () => {
    if (!record) return;
    setGenerating(true);
    try {
      const res = await summarizeCall(record.id);
      setRecord((prev) => (prev ? { ...prev, ...res } : prev));
    } catch {
      /* ignore */
    } finally {
      setGenerating(false);
    }
  }, [record]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="max-w-[760px] mx-auto">
        <Link href="/dashboard/recordings" className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-ink transition-colors mb-6">
          <ArrowLeft size={14} /> Back to recordings
        </Link>
        <div className="rounded-[14px] border border-border-subtle bg-surface px-10 py-14 text-center">
          <div className="flex items-center justify-center w-[52px] h-[52px] rounded-[14px] bg-section mx-auto mb-4">
            <AlertCircle size={22} className="text-ink-muted" />
          </div>
          <div className="text-[16px] font-semibold text-ink">Recording unavailable</div>
          <p className="text-[13px] text-ink-muted mt-1.5 max-w-[360px] mx-auto">
            {error || "This recording could not be found."} It may have been deleted, or belong to a different organisation.
          </p>
        </div>
      </div>
    );
  }

  const dir = directionConfig[record.direction] || directionConfig.outbound;
  const DirIcon = dir.icon;
  const counterpart = record.direction === "outbound" ? record.to : record.from;
  const numberLabel = !counterpart || counterpart === "Unknown" ? "Unknown number" : formatPhoneIntl(counterpart);
  const leadHref = record.leadId
    ? record.funnelId
      ? `/dashboard/funnels/${record.funnelId}/leads/${record.leadId}`
      : `/dashboard/leads/${record.leadId}`
    : null;

  return (
    <div className="max-w-[860px] mx-auto">
      {/* Back + share */}
      <div className="flex items-center justify-between mb-5">
        <Link href="/dashboard/recordings" className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-ink transition-colors">
          <ArrowLeft size={14} /> Back to recordings
        </Link>
        <ShareRecordingButton recordId={record.id} variant="button" />
      </div>

      {/* Header card */}
      <div className="rounded-[14px] border border-border-subtle bg-surface p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-[10px] bg-section shrink-0">
              <Headphones size={18} className="text-ink-muted" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {leadHref ? (
                  <Link href={leadHref} className="text-[16px] font-semibold text-signal-blue-text hover:underline truncate">
                    {record.contactName || numberLabel}
                  </Link>
                ) : (
                  <span className="text-[16px] font-semibold text-ink truncate">{record.contactName || numberLabel}</span>
                )}
                <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium", dir.className)}>
                  <DirIcon size={12} /> {dir.label}
                </span>
                <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", dispositionBadge[record.disposition] || dispositionBadge.completed)}>
                  {record.disposition.replace("-", " ")}
                </span>
              </div>
              <div className="text-[12px] text-ink-muted mt-1 flex items-center gap-2 flex-wrap">
                {record.companyName && <span className="truncate">{record.companyName}</span>}
                {record.companyName && <span className="text-border-default">·</span>}
                <span className="tabular-nums">{numberLabel}</span>
                <span className="text-border-default">·</span>
                <span>{fmtDuration(record.duration)}</span>
                <span className="text-border-default">·</span>
                <span>{record.userName || "Unknown rep"}</span>
                <span className="text-border-default">·</span>
                <span>{formatRelativeTime(record.timestamp)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Player + transcript + AI summary */}
      <div className="rounded-[14px] border border-border-subtle bg-surface p-5">
        {generating && !(record.transcriptSegments?.length || record.summaryStructured || record.transcript || record.summary) ? (
          <div className="flex items-center gap-2 text-[12px] text-ink-muted">
            <Loader2 size={14} className="animate-spin" />
            Transcribing &amp; summarizing this call…
          </div>
        ) : record.recordingUrl ? (
          <CallReview
            record={record}
            initialDuration={record.recordingDuration || record.duration}
            onRegenerate={() => void regenerate()}
            regenerating={generating}
          />
        ) : (
          <p className="text-[12px] text-ink-muted">No recording is available for this call.</p>
        )}
      </div>
    </div>
  );
}
