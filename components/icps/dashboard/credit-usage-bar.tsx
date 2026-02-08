import { cn } from "@/lib/utils";

interface CreditUsageBarProps {
  used: number;
  total: number;
  label?: string;
}

export function CreditUsageBar({ used, total, label }: CreditUsageBarProps) {
  const percent = Math.round((used / total) * 100);
  const isHigh = percent >= 80;

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
          {label || "Credits This Month"}
        </span>
        <span className="text-[12px] font-medium text-ink">
          {used.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>
      <div className="h-[3px] rounded bg-section">
        <div
          className={cn("h-full rounded transition-all", isHigh ? "bg-signal-red-text" : "bg-signal-blue-text")}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <p className="text-[10px] text-ink-faint mt-1.5">~67 enrichments today &middot; Resets Mar 1</p>
    </div>
  );
}
