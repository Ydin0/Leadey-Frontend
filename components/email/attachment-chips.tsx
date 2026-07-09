"use client";

import { useState } from "react";
import { FileText, Download, Loader2 } from "lucide-react";
import { downloadEmailAttachment, type EmailAttachmentRef } from "@/lib/api/email-threads";

function formatSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Downloadable file chips for the attachments sent with an email. Shared by
 *  the lead-profile thread and the org inbox reading pane. */
export function AttachmentChips({ attachments }: { attachments: EmailAttachmentRef[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!attachments?.length) return null;

  async function download(a: EmailAttachmentRef) {
    setBusy(a.id);
    try {
      await downloadEmailAttachment(a.id, a.fileName);
    } catch {
      // silent — the chip just stops spinning; file may have been removed
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => download(a)}
          disabled={busy === a.id}
          title={`Download ${a.fileName}`}
          className="group flex items-center gap-2.5 bg-surface border border-border-default rounded-[10px] pl-2.5 pr-3 py-2 hover:border-ink/40 transition-colors disabled:opacity-60"
        >
          <span className="w-[30px] h-[30px] rounded-[7px] bg-section flex items-center justify-center shrink-0">
            <FileText size={15} className="text-ink-muted" />
          </span>
          <span className="flex flex-col items-start min-w-0">
            <span className="text-[12px] font-medium text-ink truncate max-w-[180px]">{a.fileName}</span>
            {a.size > 0 && <span className="text-[10px] text-ink-faint">{formatSize(a.size)}</span>}
          </span>
          <span className="w-[26px] h-[26px] rounded-[6px] flex items-center justify-center text-ink-muted group-hover:text-ink shrink-0">
            {busy === a.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          </span>
        </button>
      ))}
    </div>
  );
}
