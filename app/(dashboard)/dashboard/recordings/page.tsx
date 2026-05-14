"use client";

import { useState, useEffect, useCallback } from "react";
import { Headphones, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { FilterPopover } from "@/components/scrapers/filters/filter-popover";
import { RecordingsTable } from "@/components/recordings/recordings-table";
import { getCallRecords } from "@/lib/api/phone-lines";
import type { CallRecord } from "@/lib/types/calling";

const DIRECTION_OPTIONS = [
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
];

const DISPOSITION_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "no-answer", label: "No Answer" },
  { value: "voicemail", label: "Voicemail" },
  { value: "busy", label: "Busy" },
  { value: "failed", label: "Failed" },
];

export default function RecordingsPage() {
  const isAuthReady = useAuthReady();
  const [records, setRecords] = useState<CallRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 25;

  // Filters
  const [direction, setDirection] = useState<string | null>(null);
  const [disposition, setDisposition] = useState<string | null>(null);
  const [hasRecording, setHasRecording] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchRecords = useCallback(async (p: number) => {
    try {
      const result = await getCallRecords({
        page: p,
        limit: pageSize,
        direction: direction || undefined,
        disposition: disposition || undefined,
        hasRecording: hasRecording || undefined,
        search: search || undefined,
      });
      setRecords(result.data);
      setTotalCount(result.meta.totalCount);
      setTotalPages(result.meta.totalPages);
    } catch (err) {
      console.error("Failed to fetch recordings:", err);
    } finally {
      setLoading(false);
    }
  }, [direction, disposition, hasRecording, search]);

  useEffect(() => {
    if (!isAuthReady) return;
    setLoading(true);
    fetchRecords(page);
  }, [isAuthReady, page, fetchRecords]);

  function handleFilterChange() {
    setPage(1);
  }

  function handleRecordUpdated(id: string, updates: Partial<CallRecord>) {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    );
  }

  useEffect(() => {
    handleFilterChange();
  }, [direction, disposition, hasRecording]);

  const hasFilters = !!direction || !!disposition || !!hasRecording;

  if (loading && records.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Headphones size={20} className="text-ink-muted" />
          <h1 className="text-[18px] font-semibold text-ink">Recordings</h1>
          <span className="text-[11px] font-medium text-ink-muted bg-section rounded-full px-2 py-0.5">
            {totalCount}
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {/* Direction */}
        <FilterPopover
          label="Direction"
          isActive={!!direction}
          activeCount={direction ? 1 : 0}
        >
          <div className="flex flex-wrap gap-1.5">
            {DIRECTION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDirection(direction === opt.value ? null : opt.value)}
                className={cn(
                  "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                  direction === opt.value
                    ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                    : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FilterPopover>

        {/* Disposition */}
        <FilterPopover
          label="Result"
          isActive={!!disposition}
          activeCount={disposition ? 1 : 0}
        >
          <div className="flex flex-wrap gap-1.5">
            {DISPOSITION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDisposition(disposition === opt.value ? null : opt.value)}
                className={cn(
                  "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                  disposition === opt.value
                    ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                    : "bg-section text-ink-secondary border-transparent hover:bg-hover"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FilterPopover>

        {/* Has Recording */}
        <FilterPopover
          label="Recording"
          isActive={!!hasRecording}
          activeCount={hasRecording ? 1 : 0}
        >
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setHasRecording(hasRecording === "true" ? null : "true")}
              className={cn(
                "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors border",
                hasRecording === "true"
                  ? "bg-signal-blue/15 text-signal-blue-text border-signal-blue-text/20"
                  : "bg-section text-ink-secondary border-transparent hover:bg-hover"
              )}
            >
              Has recording
            </button>
          </div>
        </FilterPopover>

        {hasFilters && (
          <button
            type="button"
            onClick={() => { setDirection(null); setDisposition(null); setHasRecording(null); }}
            className="text-[11px] font-medium text-ink-muted hover:text-ink-secondary transition-colors ml-1"
          >
            Clear all
          </button>
        )}

        {/* Search */}
        <div className="relative ml-auto">
          <Search size={13} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, company, number..."
            className="pl-8 pr-3 py-1.5 rounded-full bg-section border border-border-subtle text-[11px] text-ink placeholder:text-ink-faint w-64 focus:outline-none focus:border-border-default"
          />
        </div>
      </div>

      {/* Table */}
      <RecordingsTable
        records={records}
        page={page}
        totalPages={totalPages}
        totalItems={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        onRecordUpdated={handleRecordUpdated}
      />
    </div>
  );
}
