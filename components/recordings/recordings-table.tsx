"use client";

import { useState } from "react";
import {
  PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Sparkles, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
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
  const [summarizing, setSummarizing] = useState<string | null>(null);

  async function handleSummarize(record: CallRecord) {
    setSummarizing(record.id);
    try {
      const result = await summarizeCall(record.id);
      onRecordUpdated?.(record.id, {
        transcript: result.transcript,
        summary: result.summary,
      });
    } catch (err) {
      console.error("Failed to summarize:", err);
    } finally {
      setSummarizing(null);
    }
  }

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border-subtle bg-section/50 hover:bg-section/50">
            <TableHead className="text-left w-[220px]">Contact</TableHead>
            <TableHead className="text-left w-[140px]">Rep</TableHead>
            <TableHead className="text-center w-[100px]">Direction</TableHead>
            <TableHead className="text-center w-[80px]">Duration</TableHead>
            <TableHead className="text-left w-[100px]">Date</TableHead>
            <TableHead className="text-center w-[90px]">Result</TableHead>
            <TableHead className="text-left w-[240px]">Recording</TableHead>
            <TableHead className="text-center w-[80px]">AI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => {
            const dir = directionConfig[record.direction] || directionConfig.outbound;
            const DirIcon = dir.icon;
            const isExpanded = expandedId === record.id;
            const hasSummary = !!record.summary;
            const hasRecording = !!record.recordingUrl;

            return (
              <TableRow
                key={record.id}
                className={cn("cursor-pointer", isExpanded && "bg-hover/30")}
                onClick={() => setExpandedId(isExpanded ? null : record.id)}
              >
                {/* Contact */}
                <TableCell>
                  <div>
                    <p className="text-[12px] font-medium text-ink">
                      {record.contactName || (record.direction === "outbound" ? record.to : record.from)}
                    </p>
                    {record.companyName && (
                      <p className="text-[10px] text-ink-muted">{record.companyName}</p>
                    )}
                    {!record.contactName && (
                      <p className="text-[10px] text-ink-faint">
                        {record.direction === "outbound" ? record.to : record.from}
                      </p>
                    )}
                  </div>
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
                    <AudioPlayer src={record.recordingUrl!} compact />
                  ) : (
                    <span className="text-[10px] text-ink-faint">No recording</span>
                  )}
                </TableCell>

                {/* AI Summary */}
                <TableCell className="text-center">
                  {hasSummary ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : record.id); }}
                      className="flex items-center gap-0.5 mx-auto px-2 py-0.5 rounded-full text-[10px] font-medium bg-signal-green/10 text-signal-green-text"
                    >
                      <Sparkles size={9} />
                      {isExpanded ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                    </button>
                  ) : hasRecording ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSummarize(record); }}
                      disabled={summarizing === record.id}
                      className="flex items-center gap-0.5 mx-auto px-2 py-0.5 rounded-full text-[10px] font-medium bg-signal-blue/10 text-signal-blue-text hover:bg-signal-blue/20 transition-colors disabled:opacity-50"
                    >
                      {summarizing === record.id ? <Loader2 size={9} className="animate-spin" /> : <Sparkles size={9} />}
                      Summarize
                    </button>
                  ) : (
                    <span className="text-[10px] text-ink-faint">&mdash;</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}

          {/* Expanded summary panel */}
          {expandedId && (() => {
            const record = records.find((r) => r.id === expandedId);
            if (!record?.summary && !record?.transcript) return null;
            return (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="p-0">
                  <div className="px-6 py-4 bg-section/30 border-t border-border-subtle">
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
                        <div className="text-[11px] text-ink-muted leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                          {record.transcript}
                        </div>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })()}
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
