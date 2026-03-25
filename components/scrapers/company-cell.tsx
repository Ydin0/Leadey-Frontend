"use client";

import { useState } from "react";

interface CompanyCellProps {
  name: string;
  domain: string | null;
  industry: string | null;
}

export function CompanyCell({ name, domain, industry }: CompanyCellProps) {
  const [imgError, setImgError] = useState(false);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-2.5">
      {domain && !imgError ? (
        <img
          src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`}
          alt=""
          className="w-6 h-6 rounded-full flex-shrink-0 bg-section"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-6 h-6 rounded-full flex-shrink-0 bg-signal-blue flex items-center justify-center">
          <span className="text-[9px] font-bold text-signal-blue-text">{initials}</span>
        </div>
      )}
      <div className="min-w-0">
        <div className="text-[12px] font-medium text-ink truncate">{name}</div>
        <div className="flex items-center gap-1.5">
          {domain && <span className="text-[10px] text-ink-faint truncate">{domain}</span>}
          {industry && (
            <span className="text-[10px] font-medium rounded-full px-1.5 py-0 bg-section text-ink-muted">
              {industry}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
