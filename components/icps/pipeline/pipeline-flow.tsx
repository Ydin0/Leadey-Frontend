import { Radio, Users, GitFork, Mail, ArrowRight } from "lucide-react";
import type { PipelineStats } from "@/lib/types/pipeline";

const flowSteps = [
  { icon: Radio, label: "Scrapers Discover", description: "Signals detected", key: "scraped" as const },
  { icon: Users, label: "Enrich Contacts", description: "Leads enriched", key: "enriched" as const },
  { icon: GitFork, label: "Route to Funnels", description: "Added to funnels", key: "addedToFunnel" as const },
  { icon: Mail, label: "Execution", description: "Emails fired", key: "emailsFired" as const },
];

export function PipelineFlow({ stats }: { stats: PipelineStats }) {
  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="flex items-center justify-between">
        {flowSteps.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === 0;
          return (
            <div key={step.key} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1.5 min-w-[100px]">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isActive ? "bg-signal-blue animate-pulse" : "bg-section"}`}>
                  <Icon size={16} strokeWidth={1.5} className={isActive ? "text-signal-blue-text" : "text-ink-muted"} />
                </div>
                <span className="text-[11px] font-medium text-ink text-center">{step.label}</span>
                <span className="text-[10px] text-ink-muted">{step.description}</span>
                <span className="text-[14px] font-semibold text-ink">{stats.today[step.key]}</span>
              </div>
              {i < flowSteps.length - 1 && (
                <ArrowRight size={14} strokeWidth={1.5} className="text-ink-faint shrink-0 mx-1" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
