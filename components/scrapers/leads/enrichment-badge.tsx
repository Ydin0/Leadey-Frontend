import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContactEnrichmentStatus } from "@/lib/types/contact";

const CONFIG: Record<ContactEnrichmentStatus, { label: string; className: string }> = {
  none: { label: "Not Enriched", className: "bg-signal-slate text-signal-slate-text" },
  pending: { label: "Enriching", className: "bg-signal-blue text-signal-blue-text" },
  enriched: { label: "Enriched", className: "bg-signal-green text-signal-green-text" },
  failed: { label: "Failed", className: "bg-signal-red text-signal-red-text" },
};

export function EnrichmentBadge({ status }: { status: ContactEnrichmentStatus }) {
  const { label, className } = CONFIG[status] || CONFIG.none;
  return (
    <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5 inline-flex items-center gap-1", className)}>
      {status === "pending" && <Loader2 size={8} className="animate-spin" />}
      {label}
    </span>
  );
}
