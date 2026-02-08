import { cn } from "@/lib/utils";
import type { EnrichmentStatus } from "@/lib/types/company";

const dotStyles: Record<EnrichmentStatus, { className: string; label: string }> = {
  not_enriched: { className: "border-ink-faint bg-transparent", label: "Not enriched" },
  partial: { className: "border-signal-blue-text bg-signal-blue-text/50", label: "Partially enriched" },
  full: { className: "border-signal-blue-text bg-signal-blue-text", label: "Fully enriched" },
  pending_review: { className: "border-signal-blue-text bg-transparent ring-2 ring-signal-blue-text/30", label: "Pending review" },
};

export function EnrichmentStatusDot({ status, count }: { status: EnrichmentStatus; count?: string }) {
  const style = dotStyles[status];
  return (
    <div className="flex items-center gap-1.5" title={style.label}>
      <div className={cn("w-2.5 h-2.5 rounded-full border", style.className)} />
      {count && <span className="text-[10px] text-ink-muted">{count}</span>}
    </div>
  );
}
