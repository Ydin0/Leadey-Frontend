"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ScraperSourceId } from "@/lib/types/scraper";

export const scraperSourceMeta: Record<
  ScraperSourceId,
  { label: string; logo: string; short: string }
> = {
  x: {
    label: "X",
    logo: "https://www.google.com/s2/favicons?domain=x.com&sz=64",
    short: "X",
  },
  reddit: {
    label: "Reddit",
    logo: "https://www.google.com/s2/favicons?domain=reddit.com&sz=64",
    short: "r/",
  },
  linkedin: {
    label: "LinkedIn",
    logo: "https://www.google.com/s2/favicons?domain=linkedin.com&sz=64",
    short: "in",
  },
  indeed: {
    label: "Indeed",
    logo: "https://www.google.com/s2/favicons?domain=indeed.com&sz=64",
    short: "id",
  },
  glassdoor: {
    label: "Glassdoor",
    logo: "https://www.google.com/s2/favicons?domain=glassdoor.com&sz=64",
    short: "g",
  },
  greenhouse: {
    label: "Greenhouse",
    logo: "https://www.google.com/s2/favicons?domain=greenhouse.io&sz=64",
    short: "gh",
  },
  lever: {
    label: "Lever",
    logo: "https://www.google.com/s2/favicons?domain=lever.co&sz=64",
    short: "L",
  },
  crunchbase: {
    label: "Crunchbase",
    logo: "https://www.google.com/s2/favicons?domain=crunchbase.com&sz=64",
    short: "cb",
  },
  pitchbook: {
    label: "PitchBook",
    logo: "https://www.google.com/s2/favicons?domain=pitchbook.com&sz=64",
    short: "pb",
  },
  builtwith: {
    label: "BuiltWith",
    logo: "https://www.google.com/s2/favicons?domain=builtwith.com&sz=64",
    short: "bw",
  },
  wappalyzer: {
    label: "Wappalyzer",
    logo: "https://www.google.com/s2/favicons?domain=wappalyzer.com&sz=64",
    short: "W",
  },
  g2: {
    label: "G2",
    logo: "https://www.google.com/s2/favicons?domain=g2.com&sz=64",
    short: "G2",
  },
  google_news: {
    label: "Google News",
    logo: "https://www.google.com/s2/favicons?domain=news.google.com&sz=64",
    short: "GN",
  },
  techcrunch: {
    label: "TechCrunch",
    logo: "https://www.google.com/s2/favicons?domain=techcrunch.com&sz=64",
    short: "TC",
  },
};

interface SourceSitePillProps {
  source: ScraperSourceId;
  selected?: boolean;
  compact?: boolean;
  onToggle?: () => void;
}

export function SourceSitePill({
  source,
  selected = false,
  compact = false,
  onToggle,
}: SourceSitePillProps) {
  const meta = scraperSourceMeta[source];
  const baseClasses = cn(
    "inline-flex items-center gap-1.5 rounded-full border transition-colors",
    compact ? "px-1.5 py-1" : "px-2 py-1",
    selected
      ? "bg-signal-blue/20 border-signal-blue-text ring-1 ring-signal-blue-text/40"
      : "bg-surface border-border-subtle"
  );
  const labelClass = cn(
    "font-medium leading-none",
    compact ? "text-[9px]" : "text-[10px]",
    selected ? "text-ink" : "text-ink-secondary"
  );
  const content = (
    <>
      <span className="relative inline-flex w-4 h-4 shrink-0 overflow-hidden rounded-sm">
        <Image src={meta.logo} alt={meta.label} fill sizes="16px" unoptimized />
      </span>
      <span className={labelClass}>{compact ? meta.short : meta.label}</span>
      {onToggle && !compact && (
        <span
          className={cn(
            "ml-1 text-[9px] font-medium uppercase tracking-wider",
            selected ? "text-signal-blue-text" : "text-ink-faint"
          )}
        >
          {selected ? "Selected" : "Off"}
        </span>
      )}
    </>
  );

  if (onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={cn(baseClasses, "hover:bg-hover")}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}
