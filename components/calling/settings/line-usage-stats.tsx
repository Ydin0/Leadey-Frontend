import type { PhoneLineStats } from "@/lib/types/calling";

interface LineUsageStatsProps {
  stats: PhoneLineStats;
}

export function LineUsageStats({ stats }: LineUsageStatsProps) {
  const items = [
    { label: "Calls Made", value: stats.callsMade.toLocaleString() },
    { label: "Calls Received", value: stats.callsReceived.toLocaleString() },
    { label: "Total Minutes", value: stats.totalMinutes.toLocaleString() },
    { label: "Cost This Month", value: `$${stats.costThisMonth.toFixed(2)}` },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[10px] border border-border-subtle bg-section/50 px-3 py-3"
        >
          <p className="text-[10px] text-ink-faint uppercase tracking-wider">{item.label}</p>
          <p className="text-[16px] font-semibold text-ink mt-1">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
