"use client";

import Link from "next/link";
import { ArrowLeft, Linkedin, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompanyAvatar } from "@/components/funnels/focus/company-avatar";
import { FunnelStatusBadge } from "@/components/funnels/funnel-status-badge";
import type { FunnelStatus } from "@/lib/types/funnel";
import type { CompanyProfileCompany, CompanyProfileCampaign } from "@/lib/api/company-profile";

function joinParts(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" · ");
}

const FUNNEL_STATUSES: FunnelStatus[] = ["active", "paused", "draft"];

/**
 * Universal company profile header: identity row + the campaign filter — a
 * pill segmented control over "All activity" and each campaign with leads at
 * this company.
 */
export function CompanyProfileHeader({
  company,
  campaigns,
  activeFunnelId,
  onFunnelFilter,
}: {
  company: CompanyProfileCompany;
  campaigns: CompanyProfileCampaign[];
  activeFunnelId: string | null;
  onFunnelFilter: (funnelId: string | null) => void;
}) {
  const location = joinParts([company.city, company.country]);
  const meta = joinParts([
    company.industry,
    company.employeeCount ? `${company.employeeCount.toLocaleString()} employees` : null,
    location,
  ]);

  return (
    <div className="shrink-0 border-b border-border-subtle bg-surface px-6 pt-4 pb-3">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/dashboard/companies"
          title="All companies"
          className="flex items-center justify-center w-7 h-7 rounded-full border border-border-subtle text-ink-muted hover:text-ink hover:border-border-default transition-colors shrink-0"
        >
          <ArrowLeft size={13} />
        </Link>
        <CompanyAvatar name={company.name} domain={company.domain || undefined} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-display text-[19px] font-light tracking-[-0.01em] text-ink truncate">
              {company.name}
            </h1>
            {company.domain && (
              <a
                href={`https://${company.domain}`}
                target="_blank"
                rel="noreferrer"
                title={company.domain}
                className="text-ink-faint hover:text-ink transition-colors shrink-0"
              >
                <Globe size={13} />
              </a>
            )}
            {company.linkedinUrl && (
              <a
                href={company.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                title="LinkedIn"
                className="text-ink-faint hover:text-ink transition-colors shrink-0"
              >
                <Linkedin size={13} />
              </a>
            )}
          </div>
          {meta && <p className="text-[11.5px] text-ink-muted truncate">{meta}</p>}
        </div>
      </div>

      {/* Campaign filter — server-side: switching refetches the timeline. */}
      {campaigns.length > 0 && (
        <div className="flex items-center gap-1 mt-3 flex-wrap">
          <button
            onClick={() => onFunnelFilter(null)}
            className={cn(
              "text-[11.5px] font-medium px-3 py-1.5 rounded-full transition-colors",
              !activeFunnelId ? "bg-section text-ink" : "text-ink-muted hover:text-ink-secondary",
            )}
          >
            All activity
          </button>
          {campaigns.map((c) => (
            <button
              key={c.funnelId}
              onClick={() => onFunnelFilter(activeFunnelId === c.funnelId ? null : c.funnelId)}
              className={cn(
                "inline-flex items-center gap-1.5 text-[11.5px] font-medium px-3 py-1.5 rounded-full transition-colors",
                activeFunnelId === c.funnelId ? "bg-section text-ink" : "text-ink-muted hover:text-ink-secondary",
              )}
            >
              <span className="truncate max-w-[160px]">{c.funnelName}</span>
              <span className="text-[10px] text-ink-faint">{c.leadCount}</span>
              {FUNNEL_STATUSES.includes(c.funnelStatus as FunnelStatus) && (
                <FunnelStatusBadge status={c.funnelStatus as FunnelStatus} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
