"use client";

import { useState } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { SourceSitePill } from "@/components/icps/scrapers/source-site-pill";
import type { ScraperSourceId } from "@/lib/types/scraper";
import type { ScraperSignalRow } from "@/lib/api/scrapers";

const statusLabels: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-signal-blue text-signal-blue-text" },
  enriched: { label: "Enriched", color: "bg-signal-green text-signal-green-text" },
  in_funnel: { label: "In Funnel", color: "bg-signal-slate text-signal-slate-text" },
  dismissed: { label: "Dismissed", color: "bg-section text-ink-faint" },
};

const sourceFilterOptions: ScraperSourceId[] = ["linkedin", "indeed", "glassdoor", "greenhouse", "lever", "theirstack"];
const statusFilterOptions = ["new", "enriched", "in_funnel", "dismissed"];

interface ScraperSignalFeedProps {
  signals: ScraperSignalRow[];
}

export function ScraperSignalFeed({ signals }: ScraperSignalFeedProps) {
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filtered = signals.filter((s) => {
    if (sourceFilter && s.sourceId !== sourceFilter) return false;
    if (statusFilter && s.status !== statusFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} strokeWidth={1.8} className="text-signal-blue-text" />
          <h3 className="text-[13px] font-semibold text-ink">Scraped Signals</h3>
          <span className="text-[10px] text-ink-muted">({filtered.length})</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Source:</span>
        <button
          type="button"
          onClick={() => setSourceFilter(null)}
          className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors",
            !sourceFilter
              ? "bg-ink text-on-ink"
              : "bg-section text-ink-secondary hover:bg-hover",
          )}
        >
          All
        </button>
        {sourceFilterOptions.map((src) => (
          <button
            key={src}
            type="button"
            onClick={() => setSourceFilter(sourceFilter === src ? null : src)}
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-medium capitalize transition-colors",
              sourceFilter === src
                ? "bg-ink text-on-ink"
                : "bg-section text-ink-secondary hover:bg-hover",
            )}
          >
            {src}
          </button>
        ))}

        <span className="text-[10px] text-ink-faint mx-1">|</span>
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Status:</span>
        <button
          type="button"
          onClick={() => setStatusFilter(null)}
          className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors",
            !statusFilter
              ? "bg-ink text-on-ink"
              : "bg-section text-ink-secondary hover:bg-hover",
          )}
        >
          All
        </button>
        {statusFilterOptions.map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(statusFilter === st ? null : st)}
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-medium capitalize transition-colors",
              statusFilter === st
                ? "bg-ink text-on-ink"
                : "bg-section text-ink-secondary hover:bg-hover",
            )}
          >
            {st.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-[14px] border border-border-subtle overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-ink-muted font-medium">Job Title</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-ink-muted font-medium">Company</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-ink-muted font-medium">Source</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-ink-muted font-medium text-center">Score</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-ink-muted font-medium">Location</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-ink-muted font-medium">Posted</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-ink-muted font-medium">Status</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-ink-muted font-medium w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-[11px] text-ink-muted">
                  No signals found matching filters.
                </td>
              </tr>
            ) : (
              filtered.map((signal) => {
                const stCfg = statusLabels[signal.status] || statusLabels.new;
                const scoreColor =
                  signal.score >= 80
                    ? "bg-signal-green text-signal-green-text"
                    : signal.score >= 65
                      ? "bg-signal-blue text-signal-blue-text"
                      : "bg-signal-slate text-signal-slate-text";

                return (
                  <tr key={signal.id} className="hover:bg-hover/50 transition-colors">
                    <td className="px-3 py-2">
                      <p className="text-[11px] text-ink font-medium truncate max-w-[200px]">
                        {signal.jobTitle}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-[11px] text-ink truncate max-w-[140px]">
                        {signal.company}
                      </p>
                      {signal.companyDomain && (
                        <p className="text-[10px] text-ink-faint truncate">
                          {signal.companyDomain}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <SourceSitePill
                        source={signal.sourceId as ScraperSourceId}
                        compact
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center min-w-[28px] text-[10px] font-medium rounded-full px-1.5 py-0.5",
                          scoreColor,
                        )}
                      >
                        {signal.score}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-[11px] text-ink-secondary truncate max-w-[120px]">
                        {signal.location || "—"}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-[10px] text-ink-muted">
                        {signal.postedAt
                          ? formatRelativeTime(new Date(signal.postedAt))
                          : "—"}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "text-[10px] font-medium rounded-full px-2 py-0.5",
                          stCfg.color,
                        )}
                      >
                        {stCfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {signal.jobUrl && (
                        <a
                          href={signal.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ink-faint hover:text-ink-muted transition-colors"
                        >
                          <ExternalLink size={12} strokeWidth={1.5} />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
