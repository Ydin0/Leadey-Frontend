"use client";

import { useState, useMemo, useCallback } from "react";
import { Phone, Loader2, PauseCircle, Trash2 } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { updatePhoneLine, releasePhoneLine } from "@/lib/api/phone-lines";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useRowLimit } from "@/lib/hooks/use-row-limit";
import { EmptyState } from "@/components/shared/empty-state";
import { PhoneLineStatusBadge } from "@/components/calling/shared/phone-line-status-badge";
import { countryOptions } from "@/lib/constants/calling";
import type { PhoneLine } from "@/lib/types/calling";
import type { PhoneLineFilterState } from "./phone-line-filters";

const PAGE_SIZE = 10;

interface PhoneLinesTableProps {
  lines: PhoneLine[];
  filters: PhoneLineFilterState;
  onSelectLine: (line: PhoneLine) => void;
  onProvision: () => void;
  /** Refresh the list after a suspend/release. */
  onChanged?: () => void;
}

export function PhoneLinesTable({ lines, filters, onSelectLine, onProvision, onChanged }: PhoneLinesTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ type: "suspend" | "release"; ids: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = useCallback(async () => {
    if (!confirm) return;
    setBusy(true);
    setActionError(null);
    const results = await Promise.allSettled(
      confirm.ids.map((id) =>
        confirm.type === "release"
          ? releasePhoneLine(id)
          : updatePhoneLine(id, { status: "suspended" }),
      ),
    );
    setBusy(false);
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      setActionError(`${failed} of ${confirm.ids.length} could not be ${confirm.type === "release" ? "released" : "suspended"}. Please retry.`);
    } else {
      setConfirm(null);
      setSelectedIds(new Set());
    }
    onChanged?.();
  }, [confirm, onChanged]);

  const filtered = useMemo(() => {
    return lines.filter((line) => {
      if (filters.status !== "all" && line.status !== filters.status) return false;
      if (filters.country !== "all" && line.countryCode !== filters.country) return false;
      if (filters.assignment === "assigned" && !line.assignedTo) return false;
      if (filters.assignment === "unassigned" && line.assignedTo) return false;
      return true;
    });
  }, [lines, filters]);

  const resetPage = useCallback(() => setCurrentPage(1), []);
  const { limited, startingRow, rowLimit, unfilteredTotal, handleRowLimitChange } = useRowLimit(filtered, resetPage);

  const totalPages = Math.max(1, Math.ceil(limited.length / PAGE_SIZE));
  const paginated = limited.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((l) => l.id)));
    }
  }

  const typeBadge: Record<string, string> = {
    local: "bg-signal-slate text-signal-slate-text",
    "toll-free": "bg-signal-blue text-signal-blue-text",
    mobile: "bg-signal-green text-signal-green-text",
  };

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={Phone}
        title="No Phone Lines"
        description="Provision your first number to start making calls from within Leadey."
        actionLabel="Provision Number"
        onAction={onProvision}
      />
    );
  }

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle overflow-hidden">
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-2 bg-signal-blue/20 border-b border-border-subtle flex items-center gap-3">
          <span className="text-[11px] text-ink-secondary">{selectedIds.size} selected</span>
          <button
            type="button"
            onClick={() => setConfirm({ type: "suspend", ids: [...selectedIds] })}
            title="Temporarily deactivate — you keep the numbers (and keep paying for them)."
            className="flex items-center gap-1.5 px-3 py-1 rounded-[16px] bg-amber-500/15 text-amber-600 text-[11px] font-medium hover:bg-amber-500/25 transition-colors"
          >
            <PauseCircle size={12} /> Suspend Selected
          </button>
          <button
            type="button"
            onClick={() => setConfirm({ type: "release", ids: [...selectedIds] })}
            title="Permanently release the numbers back to Twilio — billing stops."
            className="flex items-center gap-1.5 px-3 py-1 rounded-[16px] bg-signal-red text-signal-red-text text-[11px] font-medium hover:bg-signal-red/80 transition-colors"
          >
            <Trash2 size={12} /> Release Selected
          </button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <input
                type="checkbox"
                checked={paginated.length > 0 && selectedIds.size === paginated.length}
                onChange={toggleAll}
                className="rounded"
              />
            </TableHead>
            <TableHead className="w-[180px]">Number</TableHead>
            <TableHead className="w-[140px]">Country</TableHead>
            <TableHead className="w-[100px]">Type</TableHead>
            <TableHead className="w-[110px]">Status</TableHead>
            <TableHead className="w-[200px]">Assigned To</TableHead>
            <TableHead className="w-[130px]">Monthly Cost</TableHead>
            <TableHead className="w-[120px]">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map((line) => {
            const countryOption = countryOptions.find((c) => c.code === line.countryCode);
            return (
              <TableRow
                key={line.id}
                className="cursor-pointer"
                onClick={() => onSelectLine(line)}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(line.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelect(line.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded"
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-[12px] font-medium text-ink">{line.number}</p>
                    <p className="text-[11px] text-ink-muted">{line.friendlyName}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-[12px] text-ink">
                    {countryOption?.flag ?? ""} {line.countryCode}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", typeBadge[line.type] ?? "")}>
                    {line.type}
                  </span>
                </TableCell>
                <TableCell>
                  <PhoneLineStatusBadge status={line.status} />
                </TableCell>
                <TableCell>
                  <span className="text-[12px] text-ink">
                    {line.assignedToName || <span className="text-ink-faint">Unassigned</span>}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-[12px] text-ink">${line.monthlyCost.toFixed(2)}</span>
                </TableCell>
                <TableCell>
                  <span className="text-[11px] text-ink-muted">{formatRelativeTime(line.createdAt)}</span>
                </TableCell>
              </TableRow>
            );
          })}
          {paginated.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                <p className="text-[12px] text-ink-muted">No lines match the current filters.</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        totalItems={limited.length}
        onPageChange={setCurrentPage}
        startingRow={startingRow}
        rowLimit={rowLimit}
        unfilteredTotal={unfilteredTotal}
        onRowLimitChange={handleRowLimitChange}
      />

      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-[3px] p-4">
          <div className="bg-surface rounded-[14px] border border-border-subtle p-6 w-full max-w-md shadow-xl">
            {confirm.type === "release" ? (
              <>
                <h3 className="text-[14px] font-semibold text-ink mb-2">
                  Release {confirm.ids.length} number{confirm.ids.length === 1 ? "" : "s"}?
                </h3>
                <p className="text-[12px] text-ink-secondary mb-2">
                  This permanently returns the number{confirm.ids.length === 1 ? "" : "s"} to Twilio.
                  Billing <span className="font-medium text-ink">stops immediately</span> and the
                  number{confirm.ids.length === 1 ? " is" : "s are"} gone for good — you can&apos;t get
                  the same one back.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-[14px] font-semibold text-ink mb-2">
                  Suspend {confirm.ids.length} number{confirm.ids.length === 1 ? "" : "s"}?
                </h3>
                <p className="text-[12px] text-ink-secondary mb-2">
                  Suspending deactivates the number{confirm.ids.length === 1 ? "" : "s"} (no calls or
                  texts) but keeps {confirm.ids.length === 1 ? "it" : "them"} on your Twilio account, so
                  you <span className="font-medium text-ink">keep being billed</span>. You can reactivate
                  any time. To stop paying, use <span className="font-medium text-ink">Release</span> instead.
                </p>
              </>
            )}

            {actionError && (
              <p className="text-[11px] text-signal-red-text mb-3">{actionError}</p>
            )}

            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => { setConfirm(null); setActionError(null); }}
                disabled={busy}
                className="px-4 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void runAction()}
                disabled={busy}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] text-on-ink text-[11px] font-medium transition-colors disabled:opacity-50",
                  confirm.type === "release"
                    ? "bg-signal-red-text hover:bg-signal-red-text/90"
                    : "bg-amber-600 hover:bg-amber-600/90",
                )}
              >
                {busy && <Loader2 size={12} className="animate-spin" />}
                {confirm.type === "release"
                  ? `Release & stop billing`
                  : `Suspend ${confirm.ids.length === 1 ? "number" : "numbers"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
