"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderInput, Loader2, Eye, Trash2, X } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import {
  listImports, getImportLeads, rollbackImport,
  type ImportRecord, type ImportLead,
} from "@/lib/api/imports";

const PAGE_SIZE = 25;

export function ImportsView({
  showStatus,
}: {
  showStatus: (type: "success" | "error", text: string) => void;
}) {
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [detail, setDetail] = useState<ImportRecord | null>(null);
  const [confirm, setConfirm] = useState<ImportRecord | null>(null);
  const [rollingBack, setRollingBack] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await listImports(p, PAGE_SIZE);
      setImports(res.data);
      setTotalPages(res.meta.totalPages);
      setTotalCount(res.meta.totalCount);
    } catch (err) {
      showStatus("error", err instanceof Error ? err.message : "Failed to load imports");
    } finally {
      setLoading(false);
    }
  }, [showStatus]);

  useEffect(() => {
    void load(page);
  }, [page, load]);

  const handleRollback = useCallback(async (record: ImportRecord) => {
    setRollingBack(true);
    try {
      const { deleted } = await rollbackImport(record.id);
      showStatus("success", `Rolled back "${record.fileName}" — ${deleted} lead${deleted === 1 ? "" : "s"} removed.`);
      setConfirm(null);
      setDetail(null);
      await load(page);
    } catch (err) {
      showStatus("error", err instanceof Error ? err.message : "Failed to roll back import");
    } finally {
      setRollingBack(false);
    }
  }, [load, page, showStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  if (imports.length === 0) {
    return (
      <EmptyState
        icon={FolderInput}
        title="No imports yet"
        description="CSV imports into your campaigns will appear here, where you can review and roll back any that go wrong."
      />
    );
  }

  return (
    <>
      <div className="bg-surface border border-border-subtle rounded-[14px] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Imported</TableHead>
              <TableHead className="text-right">Rows</TableHead>
              <TableHead className="text-right">Live leads</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {imports.map((imp) => (
              <TableRow key={imp.id}>
                <TableCell className="font-medium text-ink max-w-[220px] truncate" title={imp.fileName}>
                  {imp.fileName}
                </TableCell>
                <TableCell className="text-ink-secondary max-w-[180px] truncate" title={imp.funnelName}>
                  {imp.funnelName}
                </TableCell>
                <TableCell className="text-ink-muted whitespace-nowrap">
                  {formatRelativeTime(imp.createdAt)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-ink-secondary">
                  {imp.importedRows.toLocaleString()}/{imp.totalRows.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums text-ink-secondary">
                  {imp.liveLeadCount.toLocaleString()}
                </TableCell>
                <TableCell>
                  <ImportStatusBadge record={imp} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => setDetail(imp)}
                      title="View leads from this import"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle"
                    >
                      <Eye size={11} /> View
                    </button>
                    <button
                      onClick={() => setConfirm(imp)}
                      disabled={!!imp.rolledBackAt || imp.liveLeadCount === 0}
                      title={imp.rolledBackAt ? "Already rolled back" : "Delete the leads this import added"}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-signal-red/10 text-signal-red-text text-[11px] font-medium hover:bg-signal-red/20 transition-colors border border-signal-red-text/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={11} /> Roll back
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        totalItems={totalCount}
        onPageChange={setPage}
      />

      {detail && (
        <ImportDetailModal
          record={detail}
          onClose={() => setDetail(null)}
          onRollback={() => setConfirm(detail)}
        />
      )}

      {confirm && (
        <RollbackConfirmModal
          record={confirm}
          busy={rollingBack}
          onCancel={() => setConfirm(null)}
          onConfirm={() => void handleRollback(confirm)}
        />
      )}
    </>
  );
}

function ImportStatusBadge({ record }: { record: ImportRecord }) {
  const rolledBack = !!record.rolledBackAt;
  return (
    <span
      className={cn(
        "text-[10px] font-medium rounded-full px-2 py-0.5",
        rolledBack
          ? "bg-section text-ink-muted"
          : "bg-signal-green/15 text-signal-green-text",
      )}
    >
      {rolledBack ? "Rolled back" : "Imported"}
    </span>
  );
}

function ImportDetailModal({
  record,
  onClose,
  onRollback,
}: {
  record: ImportRecord;
  onClose: () => void;
  onRollback: () => void;
}) {
  const [leads, setLeads] = useState<ImportLead[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const res = await getImportLeads(record.id, page, 50);
        if (cancelled) return;
        setLeads(res.data);
        setTotalPages(res.meta.totalPages);
        setTotalCount(res.meta.totalCount);
      } catch {
        // Leave the prior list; the parent surfaces import-level errors.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => { cancelled = true; };
  }, [record.id, page]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[3px] p-4">
      <div className="bg-surface rounded-[14px] border border-border-subtle w-full max-w-3xl max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-start justify-between p-5 border-b border-border-subtle">
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-ink truncate" title={record.fileName}>
              {record.fileName}
            </h3>
            <p className="text-[12px] text-ink-muted">
              {record.funnelName} · {record.liveLeadCount.toLocaleString()} live lead
              {record.liveLeadCount === 1 ? "" : "s"} · imported {formatRelativeTime(record.createdAt)}
            </p>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink transition-colors shrink-0 ml-3">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-ink-muted" />
            </div>
          ) : leads.length === 0 ? (
            <p className="text-[12px] text-ink-muted text-center py-16">
              No leads remain from this import.
            </p>
          ) : (
            <div className="bg-surface border border-border-subtle rounded-[14px] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium text-ink">{l.name}</TableCell>
                      <TableCell className="text-ink-secondary">{l.company}</TableCell>
                      <TableCell className="text-ink-muted">{l.email || "—"}</TableCell>
                      <TableCell className="text-ink-muted tabular-nums">{l.phone || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && totalCount > 0 && (
            <DataTablePagination
              currentPage={page}
              totalPages={totalPages}
              pageSize={50}
              totalItems={totalCount}
              onPageChange={setPage}
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border-subtle">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle"
          >
            Close
          </button>
          <button
            onClick={onRollback}
            disabled={!!record.rolledBackAt || record.liveLeadCount === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] bg-signal-red-text text-on-ink text-[11px] font-medium hover:bg-signal-red-text/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={12} /> Roll back import
          </button>
        </div>
      </div>
    </div>
  );
}

function RollbackConfirmModal({
  record,
  busy,
  onCancel,
  onConfirm,
}: {
  record: ImportRecord;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-[3px] p-4">
      <div className="bg-surface rounded-[14px] border border-border-subtle p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-[14px] font-semibold text-ink mb-2">Roll back this import?</h3>
        <p className="text-[12px] text-ink-secondary mb-5">
          This deletes the{" "}
          <span className="font-medium text-ink">{record.liveLeadCount.toLocaleString()} lead{record.liveLeadCount === 1 ? "" : "s"}</span>{" "}
          this import added to{" "}
          <span className="font-medium text-ink">{record.funnelName}</span>. Your master
          contacts (and their call history / DNC flags) are preserved. This cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] bg-signal-red-text text-on-ink text-[11px] font-medium hover:bg-signal-red-text/90 transition-colors disabled:opacity-50"
          >
            {busy && <Loader2 size={12} className="animate-spin" />}
            Delete {record.liveLeadCount.toLocaleString()} lead{record.liveLeadCount === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}
