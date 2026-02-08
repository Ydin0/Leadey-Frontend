import { Check, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { CSVImport } from "@/lib/types/pipeline";

export function CSVImportRow({ imp }: { imp: CSVImport }) {
  const isProcessing = imp.status === "processing";

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-ink">{imp.file}</span>
          {isProcessing ? (
            <Loader2 size={12} strokeWidth={1.5} className="text-signal-blue-text animate-spin" />
          ) : (
            <Check size={12} strokeWidth={2} className="text-signal-green-text" />
          )}
        </div>
        <span className="text-[10px] text-ink-faint">{formatRelativeTime(imp.date)}</span>
      </div>

      {/* Visual Pipeline */}
      <div className="flex items-center gap-1.5 text-[10px]">
        <span className="px-2 py-0.5 rounded-full bg-section text-ink-secondary font-medium">{imp.rows} rows</span>
        <ArrowRight size={10} className="text-ink-faint" />
        <span className="px-2 py-0.5 rounded-full bg-signal-green/50 text-signal-green-text font-medium">{imp.imported} validated</span>
        <ArrowRight size={10} className="text-ink-faint" />
        <span className="px-2 py-0.5 rounded-full bg-signal-blue text-signal-blue-text font-medium">{imp.enrichNeeded} enriched</span>
        <ArrowRight size={10} className="text-ink-faint" />
        <span className="px-2 py-0.5 rounded-full bg-signal-slate text-signal-slate-text font-medium">&rarr; {imp.funnel}</span>
        {imp.dupes > 0 && (
          <>
            <span className="text-ink-faint ml-1">&middot;</span>
            <span className="text-ink-faint">{imp.dupes} dupes removed</span>
          </>
        )}
      </div>
    </div>
  );
}
