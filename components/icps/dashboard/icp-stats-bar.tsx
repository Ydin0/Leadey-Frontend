import { Radio, Users, GitFork, Mail, Coins } from "lucide-react";
import type { ICPStats } from "@/lib/types/icp";

export function ICPStatsBar({ stats }: { stats: ICPStats }) {
  const creditPercent = Math.round((stats.creditsUsed / (stats.creditsUsed + stats.creditsRemaining)) * 100);

  return (
    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
      <StatChip icon={Radio} label="Scraped Today" value={93} />
      <StatChip icon={Users} label="Enriched" value={67} />
      <StatChip icon={GitFork} label="In Funnels" value={52} />
      <StatChip icon={Mail} label="Emails Fired" value={stats.emailsFired} />
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full border border-border-subtle shrink-0">
        <Coins size={14} strokeWidth={1.5} className="text-ink-muted shrink-0" />
        <span className="text-[13px] font-medium text-ink">{stats.creditsUsed.toLocaleString()}</span>
        <span className="text-[11px] text-ink-muted whitespace-nowrap">/ {(stats.creditsUsed + stats.creditsRemaining).toLocaleString()}</span>
        <div className="w-12 h-[3px] rounded bg-section shrink-0">
          <div className="h-full rounded bg-signal-blue-text" style={{ width: `${creditPercent}%` }} />
        </div>
      </div>
    </div>
  );
}

function StatChip({ icon: Icon, label, value }: { icon: typeof Radio; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full border border-border-subtle shrink-0">
      <Icon size={14} strokeWidth={1.5} className="text-ink-muted shrink-0" />
      <span className="text-[13px] font-medium text-ink">{value}</span>
      <span className="text-[11px] text-ink-muted whitespace-nowrap">{label}</span>
    </div>
  );
}
