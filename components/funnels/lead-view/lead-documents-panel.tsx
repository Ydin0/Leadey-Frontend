"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileText, FileImage, FileSpreadsheet, File as FileIcon, FileArchive,
  Upload, Download, Trash2, Loader2,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  listLeadDocuments, uploadLeadDocument, deleteLeadDocument, downloadLeadDocument,
  type LeadDocument,
} from "@/lib/api/lead-documents";

function iconFor(mime: string, name: string) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (mime.startsWith("image/")) return FileImage;
  if (mime === "application/pdf" || ext === "pdf") return FileText;
  if (mime.includes("spreadsheet") || ["csv", "xls", "xlsx"].includes(ext)) return FileSpreadsheet;
  if (["zip", "rar", "7z", "gz", "tar"].includes(ext)) return FileArchive;
  if (mime.startsWith("text/") || ["doc", "docx", "txt", "md"].includes(ext)) return FileText;
  return FileIcon;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Documents attached to a lead — list, upload (button + drag-drop),
 *  download and delete. Shown as the "Documents" tab in the lead timeline. */
export function LeadDocumentsPanel({ funnelId, leadId }: { funnelId: string; leadId: string }) {
  const [docs, setDocs] = useState<LeadDocument[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setDocs(null);
    listLeadDocuments(funnelId, leadId)
      .then((d) => { if (!cancelled) setDocs(d); })
      .catch(() => { if (!cancelled) setDocs([]); });
    return () => { cancelled = true; };
  }, [funnelId, leadId]);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of list) {
        if (file.size > 25 * 1024 * 1024) {
          throw new Error(`"${file.name}" is over the 25MB limit`);
        }
        const doc = await uploadLeadDocument(funnelId, leadId, file);
        setDocs((prev) => [doc, ...(prev ?? [])]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [funnelId, leadId]);

  const handleDelete = useCallback(async (id: string) => {
    setBusyId(id);
    try {
      await deleteLeadDocument(id);
      setDocs((prev) => (prev ?? []).filter((d) => d.id !== id));
    } catch {
      setError("Could not delete the document — try again.");
    } finally {
      setBusyId(null);
      setConfirmDelete(null);
    }
  }, []);

  const handleDownload = useCallback(async (doc: LeadDocument) => {
    setBusyId(doc.id);
    try {
      await downloadLeadDocument(doc);
    } catch {
      setError("Could not download the document — try again.");
    } finally {
      setBusyId(null);
    }
  }, []);

  return (
    <div>
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void uploadFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed px-4 py-7 mb-5 transition-colors",
          dragging ? "border-accent bg-accent/5" : "border-border-default bg-surface",
        )}
      >
        <Upload size={18} className="text-ink-muted" strokeWidth={1.5} />
        <p className="text-[12px] text-ink-muted text-center">
          Drag &amp; drop files here — PDFs, images, contracts, anything up to 25MB
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
          {uploading ? "Uploading…" : "Upload files"}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="text-[11px] text-signal-red-text mb-3">{error}</p>
      )}

      {/* Document list */}
      {docs === null ? (
        <div className="flex items-center justify-center py-8 text-ink-muted">
          <Loader2 size={16} className="animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <p className="text-[12px] text-ink-faint text-center py-4">
          No documents on this lead yet.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {docs.map((doc) => {
            const Icon = iconFor(doc.mimeType, doc.fileName);
            return (
              <div
                key={doc.id}
                className="group flex items-center gap-3 rounded-[10px] bg-surface border border-border-subtle px-3 py-2.5"
              >
                <div className="w-8 h-8 rounded-md bg-section flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-ink-muted" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium text-ink truncate">{doc.fileName}</div>
                  <div className="text-[10.5px] text-ink-muted truncate">
                    {formatSize(doc.size)}
                    {doc.uploadedByName ? ` · ${doc.uploadedByName}` : ""}
                    {` · ${formatRelativeTime(new Date(doc.createdAt))}`}
                  </div>
                </div>
                {confirmDelete === doc.id ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-2 py-0.5 rounded-full bg-section text-ink-secondary text-[10px] font-medium hover:bg-hover border border-border-subtle"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => void handleDelete(doc.id)}
                      disabled={busyId === doc.id}
                      className="px-2 py-0.5 rounded-full bg-signal-red/15 text-signal-red-text text-[10px] font-medium hover:bg-signal-red/25 disabled:opacity-50"
                    >
                      {busyId === doc.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => void handleDownload(doc)}
                      disabled={busyId === doc.id}
                      title="Download"
                      className="flex items-center justify-center w-[26px] h-[26px] rounded-md text-ink-muted hover:bg-hover hover:text-ink transition-colors disabled:opacity-50"
                    >
                      {busyId === doc.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(doc.id)}
                      title="Delete"
                      className="flex items-center justify-center w-[26px] h-[26px] rounded-md text-ink-muted hover:bg-signal-red/10 hover:text-signal-red-text transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
