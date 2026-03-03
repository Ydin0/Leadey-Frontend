import { cn } from "@/lib/utils";
import type { PhoneLineStatus } from "@/lib/types/calling";

const statusStyles: Record<PhoneLineStatus, string> = {
  active: "bg-signal-green text-signal-green-text",
  suspended: "bg-signal-red text-signal-red-text",
  pending: "bg-signal-blue text-signal-blue-text",
  released: "bg-signal-slate text-signal-slate-text",
};

interface PhoneLineStatusBadgeProps {
  status: PhoneLineStatus;
}

export function PhoneLineStatusBadge({ status }: PhoneLineStatusBadgeProps) {
  return (
    <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", statusStyles[status])}>
      {status}
    </span>
  );
}
