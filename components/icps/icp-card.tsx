import Link from "next/link";
import { Building2, Users, Coins, Radio, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ICPStatusBadge } from "./icp-status-badge";
import type { ICP } from "@/lib/types/icp";

export function ICPCard({ icp }: { icp: ICP }) {
  const hasActiveScrapers = icp.stats.scrapersActive > 0;

  return (
    <Link
      href={`/dashboard/icps/${icp.id}`}
      className="bg-surface rounded-[14px] border border-border-subtle p-5 transition-colors hover:border-border-default group block"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h3 className="text-[14px] font-semibold text-ink">{icp.name}</h3>
          <ICPStatusBadge status={icp.status} />
          {hasActiveScrapers && (
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal-green-text opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-signal-green-text" />
            </span>
          )}
        </div>
        <ArrowRight size={14} strokeWidth={1.5} className="text-ink-faint group-hover:text-ink-secondary transition-colors" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <Building2 size={13} strokeWidth={1.5} className="text-ink-muted" />
          <span className="text-[12px] text-ink-secondary">
            <span className="font-medium text-ink">{icp.stats.companiesFound}</span> companies
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={13} strokeWidth={1.5} className="text-ink-muted" />
          <span className="text-[12px] text-ink-secondary">
            <span className="font-medium text-ink">{icp.stats.leadsEnriched}</span> leads enriched
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Coins size={13} strokeWidth={1.5} className="text-ink-muted" />
          <span className="text-[12px] text-ink-secondary">
            <span className="font-medium text-ink">{icp.stats.creditsUsed}</span> credits used
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Radio size={13} strokeWidth={1.5} className="text-ink-muted" />
          <span className="text-[12px] text-ink-secondary">
            <span className="font-medium text-ink">{icp.stats.scrapersActive}</span> active scrapers
          </span>
        </div>
      </div>

      {/* Targeting summary */}
      <div className="mt-4 pt-3 border-t border-border-subtle">
        <p className="text-[11px] text-ink-muted leading-relaxed">
          {icp.companyProfile.industries.join(", ")} &middot;{" "}
          {icp.companyProfile.companySizeMin.toLocaleString()}&ndash;{icp.companyProfile.companySizeMax.toLocaleString()} employees &middot;{" "}
          {icp.personas.length} persona{icp.personas.length !== 1 ? "s" : ""}
        </p>
      </div>
    </Link>
  );
}
