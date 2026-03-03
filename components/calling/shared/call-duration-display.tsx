import { formatCallDuration } from "@/lib/utils";

interface CallDurationDisplayProps {
  seconds: number;
  className?: string;
}

export function CallDurationDisplay({ seconds, className = "text-[11px] text-ink-muted" }: CallDurationDisplayProps) {
  return <span className={className}>{formatCallDuration(seconds)}</span>;
}
