import { cn } from "@/lib/utils";
import type { BundleStatus } from "@/lib/types/calling";

const statusStyles: Record<BundleStatus, string> = {
  draft: "bg-signal-slate text-signal-slate-text",
  "pending-review": "bg-signal-blue text-signal-blue-text",
  "twilio-approved": "bg-signal-green text-signal-green-text",
  "twilio-rejected": "bg-signal-red text-signal-red-text",
};

const statusLabels: Record<BundleStatus, string> = {
  draft: "Draft",
  "pending-review": "Pending Review",
  "twilio-approved": "Approved",
  "twilio-rejected": "Rejected",
};

interface BundleStatusBadgeProps {
  status: BundleStatus;
}

export function BundleStatusBadge({ status }: BundleStatusBadgeProps) {
  return (
    <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", statusStyles[status])}>
      {statusLabels[status]}
    </span>
  );
}
