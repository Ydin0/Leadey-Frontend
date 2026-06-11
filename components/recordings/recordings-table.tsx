"use client";

import { useState, Fragment } from "react";
import {
  PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Sparkles, ChevronRight, Loader2, FileText,
} from "lucide-react";
import { cn, formatRelativeTime, formatPhoneIntl } from "@/lib/utils";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { AudioPlayer } from "./audio-player";
import { summarizeCall } from "@/lib/api/phone-lines";
import type { CallRecord } from "@/lib/types/calling";

interface RecordingsTableProps {
  records: CallRecord[];
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onRecordUpdated?: (id: string, updates: Partial<CallRecord>) => void;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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

export function RecordingsTable({
  records,
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onRecordUpdated,
}: RecordingsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [genError, setGenError] = useState<Record<string, string>>({});

  async function generateTranscript(record: CallRecord) {
    setGenerating(record.id);
    setGenError((prev) => { const next = { ...prev }; delete next[record.id]; return next; });
    try {
      const result = await summarizeCall(record.id);
      onRecordUpdated?.(record.id, {
        transcript: result.transcript,
        summary: result.summary,
      });
    } catch (err) {
      setGenError((prev) => ({ ...prev, [record.id]: err instanceof Error ? err.message : "Transcription failed" }));
    } finally {
      setGenerating(null);
    }
  }

  function toggleExpand(record: CallRecord) {
    const opening = expandedId !== record.id;
    setExpandedId(opening ? record.id : null);
    // Auto-generate the transcript on first open when we have a recording but
    // haven't transcribed it yet — so opening the row "just shows" it (Close-style).
    if (opening && record.recordingUrl && !record.transcript && generating !== record.id) {
      void generateTranscript(record);
    }
  }

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border-subtle bg-section/50 hover:bg-section/50">
            <TableHead className="w-[36px]" />
            <TableHead className="text-left w-[200px]">Contact</TableHead>
            <TableHead className="text-left w-[140px]">Rep</TableHead>
            <TableHead className="text-center w-[100px]">Direction</TableHead>
            <TableHead className="text-center w-[80px]">Duration</TableHead>
            <TableHead className="text-left w-[100px]">Date</TableHead>
            <TableHead className="text-center w-[90px]">Result</TableHead>
            <TableHead className="text-left w-[240px]">Recording</TableHead>
            <TableHead className="text-center w-[100px]">Transcript</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => {
            const dir = directionConfig[record.direction] || directionConfig.outbound;
            const DirIcon = dir.icon;
            const isExpanded = expandedId === record.id;
            const hasRecording = !!record.recordingUrl;
            const isGenerating = generating === record.id;

            return (
              <Fragment key={record.id}>
                <TableRow
                  className={cn("cursor-pointer", isExpanded && "bg-hover/30")}
                  onClick={() => toggleExpand(record)}
                >
                  {/* Expand caret */}
                  <TableCell className="text-center">
                    <ChevronRight
                      size={14}
                      className={cn(
                        "text-ink-muted transition-transform mx-auto",
                        isExpanded && "rotate-90",
                      )}
                    />
                  </TableCell>

                  {/* Contact — name if we know it, otherwise the raw number */}
                  <TableCell>
                    {(() => {
                      const raw = record.direction === "outbound" ? record.to : record.from;
                      const numberLabel =
                        !raw || raw === "Unknown" ? "Unknown number" : formatPhoneIntl(raw);
                      return (
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-ink truncate">
                            {record.contactName || numberLabel}
                          </p>
                          {record.companyName ? (
                            <p className="text-[10px] text-ink-muted truncate">{record.companyName}</p>
                          ) : null}
                          {/* Show the number underneath only when the primary line is a name */}
                          {record.contactName && (
                            <p className="text-[10px] text-ink-faint tabular-nums truncate">{numberLabel}</p>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>

                  {/* Rep */}
                  <TableCell>
                    <span className="text-[11px] text-ink-secondary">
                      {record.userName || "Unknown"}
                    </span>
                  </TableCell>

                  {/* Direction */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <DirIcon size={12} className={dir.className} />
                      <span className={cn("text-[10px] font-medium", dir.className)}>{dir.label}</span>
                    </div>
                  </TableCell>

                  {/* Duration */}
                  <TableCell className="text-center">
                    <span className="text-[11px] text-ink-secondary tabular-nums">
                      {formatDuration(record.duration)}
                    </span>
                  </TableCell>

                  {/* Date */}
                  <TableCell>
                    <span className="text-[11px] text-ink-muted">
                      {formatRelativeTime(record.timestamp)}
                    </span>
                  </TableCell>

                  {/* Disposition */}
                  <TableCell className="text-center">
                    <span className={cn(
                      "text-[10px] font-medium rounded-full px-2 py-0.5",
                      dispositionBadge[record.disposition] || dispositionBadge.completed,
                    )}>
                      {record.disposition.replace("-", " ")}
                    </span>
                  </TableCell>

                  {/* Player */}
                  <TableCell>
                    {hasRecording ? (
                      <AudioPlayer recordId={record.id} compact initialDuration={record.recordingDuration || record.duration} />
                    ) : (
                      <span className="text-[10px] text-ink-faint">No recording</span>
                    )}
                  </TableCell>

                  {/* Transcript dropdown trigger */}
                  <TableCell className="text-center">
                    {record.transcript || record.summary ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleExpand(record); }}
                        className="inline-flex items-center gap-1 mx-auto px-2 py-0.5 rounded-full text-[10px] font-medium bg-signal-green/10 text-signal-green-text hover:bg-signal-green/20 transition-colors"
                      >
                        <FileText size={9} />
                        {isExpanded ? "Hide" : "View"}
                      </button>
                    ) : hasRecording ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleExpand(record); }}
                        disabled={isGenerating}
                        className="inline-flex items-center gap-1 mx-auto px-2 py-0.5 rounded-full text-[10px] font-medium bg-signal-blue/10 text-signal-blue-text hover:bg-signal-blue/20 transition-colors disabled:opacity-50"
                      >
                        {isGenerating ? <Loader2 size={9} className="animate-spin" /> : <Sparkles size={9} />}
                        {isGenerating ? "Transcribing…" : "Generate"}
                      </button>
                    ) : (
                      <span className="text-[10px] text-ink-faint">&mdash;</span>
                    )}
                  </TableCell>
                </TableRow>

                {/* Expanded transcript / summary panel */}
                {isExpanded && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={9} className="p-0">
                      <div className="px-6 py-4 bg-section/30 border-t border-border-subtle">
                        {isGenerating ? (
                          <div className="flex items-center gap-2 text-[12px] text-ink-muted">
                            <Loader2 size={14} className="animate-spin" />
                            Transcribing &amp; summarizing this call…
                          </div>
                        ) : record.transcript || record.summary ? (
                          <>
                            {record.summary && (
                              <div className="mb-4">
                                <h4 className="text-[11px] font-semibold text-ink uppercase tracking-wider mb-2">AI Summary</h4>
                                <div className="text-[12px] text-ink-secondary leading-relaxed whitespace-pre-wrap">
                                  {record.summary}
                                </div>
                              </div>
                            )}
                            {record.transcript && (
                              <div>
                                <h4 className="text-[11px] font-semibold text-ink uppercase tracking-wider mb-2">Transcript</h4>
                                <div className="text-[11px] text-ink-muted leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                                  {record.transcript}
                                </div>
                              </div>
                            )}
                          </>
                        ) : hasRecording ? (
                          <div className="flex items-center justify-between gap-3">
                            <span className={cn("text-[12px]", genError[record.id] ? "text-signal-red-text" : "text-ink-muted")}>
                              {genError[record.id] || "No transcript yet for this call."}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); void generateTranscript(record); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors shrink-0"
                            >
                              <Sparkles size={11} /> {genError[record.id] ? "Retry" : "Generate transcript"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[12px] text-ink-muted">No recording available to transcribe.</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>

      {records.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-[12px] text-ink-muted">No recordings found</p>
        </div>
      )}

      {totalItems > 0 && (
        <DataTablePagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
