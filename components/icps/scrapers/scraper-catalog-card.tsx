import {
  Briefcase, DollarSign, Cpu, Search, MessageCircle, Newspaper, UserCheck, TrendingUp,
} from "lucide-react";
import type { ScraperDefinition } from "@/lib/types/scraper";
import { SourceSitePill } from "./source-site-pill";

const iconMap: Record<string, typeof Briefcase> = {
  Briefcase, DollarSign, Cpu, Search, MessageCircle, Newspaper, UserCheck, TrendingUp,
};

const tierColors = {
  basic: "bg-signal-green text-signal-green-text",
  pro: "bg-signal-blue text-signal-blue-text",
  enterprise: "bg-signal-slate text-signal-slate-text",
};

interface ScraperCatalogCardProps {
  scraper: ScraperDefinition;
  onAdd: (scraper: ScraperDefinition) => void;
  isAdded?: boolean;
}

export function ScraperCatalogCard({
  scraper,
  onAdd,
  isAdded = false,
}: ScraperCatalogCardProps) {
  const Icon = iconMap[scraper.icon] || Briefcase;

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-4 hover:border-border-default transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-section flex items-center justify-center">
          <Icon size={16} strokeWidth={1.5} className="text-ink-muted" />
        </div>
        <span className={`text-[9px] font-medium rounded-full px-1.5 py-0.5 ${tierColors[scraper.tier]}`}>
          {scraper.tier}
        </span>
      </div>
      <h4 className="text-[12px] font-medium text-ink mb-1">{scraper.name}</h4>
      <p className="text-[10px] text-ink-muted leading-relaxed mb-3">{scraper.description}</p>
      <div className="flex flex-wrap gap-1 mb-3">
        {scraper.sourceIds.map((source) => (
          <SourceSitePill key={source} source={source} compact />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-ink-faint">~{scraper.creditCostPerRun} credits/run</span>
          <span className="text-[10px] text-ink-faint">&middot;</span>
          <span className="text-[10px] text-ink-faint">{scraper.frequencyOptions.join(", ")}</span>
        </div>
        <button
          onClick={() => onAdd(scraper)}
          disabled={isAdded}
          className="px-3 py-1 rounded-[16px] bg-ink text-on-ink text-[10px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isAdded ? "Added" : "Add"}
        </button>
      </div>
    </div>
  );
}
