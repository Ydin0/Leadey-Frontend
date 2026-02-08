import { Check, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { EnrichmentJob } from "@/lib/types/pipeline";

export function EnrichmentJobRow({ job }: { job: EnrichmentJob }) {
  const isProcessing = job.status === "processing";
  const isCompleted = job.status === "completed";

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-medium text-ink">{job.company}</span>
        <span className="text-[10px] text-ink-faint">{formatRelativeTime(job.started)}</span>
      </div>

      {/* Progress Bar */}
      <div className="h-[3px] rounded bg-section mb-1.5">
        <div
          className={cn(
            "h-full rounded transition-all",
            isCompleted ? "bg-signal-green-text" : "bg-signal-blue-text"
          )}
          style={{ width: `${job.progress}%` }}
        />
      </div>

      {/* Status Text */}
      <div className="flex items-center gap-1.5">
        {isProcessing && (
          <>
            <Loader2 size={10} strokeWidth={1.5} className="text-signal-blue-text animate-spin" />
            <span className="text-[10px] text-ink-muted">
              Querying {job.contacts} contacts via {job.provider}...
            </span>
          </>
        )}
        {isCompleted && job.found && (
          <>
            <Check size={10} strokeWidth={2} className="text-signal-green-text" />
            <span className="text-[10px] text-ink-muted">
              Found {job.found.emails} emails, {job.found.phones} phones, {job.found.linkedin} LinkedIn
            </span>
          </>
        )}
        {job.status === "queued" && (
          <>
            <Clock size={10} strokeWidth={1.5} className="text-ink-faint" />
            <span className="text-[10px] text-ink-faint">Queued</span>
          </>
        )}
      </div>
    </div>
  );
}
