"use client";

import { useState, useEffect, useCallback } from "react";
import { Headphones, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { useTeamMembers } from "@/hooks/use-team-members";
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
  const { members } = useTeamMembers();
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
  const [memberId, setMemberId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<"all" | "today" | "7d" | "30d" | "90d">("all");
  const [durMode, setDurMode] = useState<"any" | "more" | "less">("any");
  const [durMinutes, setDurMinutes] = useState("2");

  const fetchRecords = useCallback(async (p: number) => {
    // Date range → an ISO startDate.
    let startDate: string | undefined;
    if (dateRange !== "all") {
      if (dateRange === "today") {
        const d = new Date(); d.setHours(0, 0, 0, 0); startDate = d.toISOString();
      } else {
        const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
        startDate = new Date(Date.now() - days * 86400000).toISOString();
      }
    }
    // Duration (minutes) → seconds, mapped to min/max.
    const secs = (Number(durMinutes) || 0) * 60;
    try {
      const result = await getCallRecords({
        page: p,
        limit: pageSize,
        direction: direction || undefined,
        disposition: disposition || undefined,
        hasRecording: hasRecording || undefined,
        userId: memberId || undefined,
        search: search || undefined,
        startDate,
        minDuration: durMode === "more" ? secs : undefined,
        maxDuration: durMode === "less" ? secs : undefined,
      });
      setRecords(result.data);
      setTotalCount(result.meta.totalCount);
      setTotalPages(result.meta.totalPages);
    } catch (err) {
      console.error("Failed to fetch recordings:", err);
    } finally {
      setLoading(false);
    }
  }, [direction, disposition, hasRecording, memberId, search, dateRange, durMode, durMinutes]);

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
  }, [direction, disposition, hasRecording, memberId, dateRange, durMode, durMinutes]);

  const moreFiltersCount = (dateRange !== "all" ? 1 : 0) + (durMode !== "any" ? 1 : 0);
  const hasFilters = !!direction || !!disposition || !!hasRecording || !!memberId || moreFiltersCount > 0;
  const selectedMember = members.find((m) => m.id === memberId);

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

        {/* Member */}
        <FilterPopover
          label={selectedMember ? selectedMember.name : "Member"}
          isActive={!!memberId}
          activeCount={memberId ? 1 : 0}
        >
          <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto min-w-[180px]">
            {members.length === 0 ? (
              <div className="px-2 py-1.5 text-[11px] text-ink-muted">No members.</div>
            ) : (
              members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMemberId(memberId === m.id ? null : m.id)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-[11px] font-medium transition-colors text-left",
                    memberId === m.id
                      ? "bg-signal-blue/15 text-signal-blue-text"
                      : "text-ink-secondary hover:bg-hover"
                  )}
                >
                  <span className="w-5 h-5 rounded-full bg-section flex items-center justify-center text-[9px] font-semibold text-ink-muted shrink-0">
                    {m.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="truncate">{m.name}</span>
                </button>
              ))
            )}
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

        {/* More filters — date range + duration */}
        <FilterPopover label="More filters" isActive={moreFiltersCount > 0} activeCount={moreFiltersCount}>
          <div className="w-[260px] space-y-4">
            {/* Date range */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Date range</p>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { v: "all", l: "All time" }, { v: "today", l: "Today" }, { v: "7d", l: "7 days" },
                  { v: "30d", l: "30 days" }, { v: "90d", l: "90 days" },
                ] as const).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setDateRange(o.v)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                      dateRange === o.v
                        ? "bg-accent text-on-ink border-accent font-semibold"
                        : "bg-section text-ink-secondary border-border-subtle hover:bg-hover",
                    )}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            {/* Duration */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Call duration</p>
              <div className="flex items-center gap-2">
                <select
                  value={durMode}
                  onChange={(e) => setDurMode(e.target.value as typeof durMode)}
                  className="bg-section border border-border-subtle rounded-[8px] px-2 py-1.5 text-[11px] text-ink focus:outline-none focus:border-border-default"
                >
                  <option value="any">Any length</option>
                  <option value="more">More than</option>
                  <option value="less">Less than</option>
                </select>
                {durMode !== "any" && (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="number"
                      min={0}
                      value={durMinutes}
                      onChange={(e) => setDurMinutes(e.target.value)}
                      className="w-16 bg-section border border-border-subtle rounded-[8px] px-2 py-1.5 text-[11px] text-ink focus:outline-none focus:border-border-default"
                    />
                    <span className="text-[11px] text-ink-muted">min</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </FilterPopover>

        {hasFilters && (
          <button
            type="button"
            onClick={() => { setDirection(null); setDisposition(null); setHasRecording(null); setMemberId(null); setDateRange("all"); setDurMode("any"); }}
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
