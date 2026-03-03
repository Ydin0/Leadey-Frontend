"use client";

import { useState, useRef, useEffect } from "react";
import { FileText, Mail, Phone, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusDot, statusLabel } from "@/lib/utils/lead-status";
import { CompanyAvatar } from "./company-avatar";
import type { LeadStatus } from "@/lib/types/funnel-focus";

const allStatuses = (Object.entries(statusLabel) as [LeadStatus, string][]).map(
  ([value, label]) => ({ value, label })
);

interface LeadDetailHeaderProps {
  companyName: string;
  companyDomain?: string;
  status: LeadStatus;
  onStatusChange: (status: LeadStatus) => void;
  localTime?: string;
}

export function LeadDetailHeader({
  companyName,
  companyDomain,
  status,
  onStatusChange,
  localTime,
}: LeadDetailHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const currentStatusLabel = allStatuses.find((s) => s.value === status)?.label ?? status;

  return (
    <div className="mb-6">
      <div className="flex items-start gap-3 mb-4">
        <CompanyAvatar name={companyName} size="lg" domain={companyDomain} />
        <div className="flex-1 min-w-0">
          <h2 className="text-[18px] font-semibold text-ink leading-tight">{companyName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors"
              >
                <div className={cn("w-1.5 h-1.5 rounded-full", statusDot[status])} />
                {currentStatusLabel}
                <ChevronDown size={11} strokeWidth={2} className="text-ink-faint" />
              </button>
              {dropdownOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 min-w-[160px] bg-surface rounded-[10px] border border-border-subtle shadow-lg py-1">
                  {allStatuses.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => {
                        onStatusChange(s.value);
                        setDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 text-[11px] hover:bg-hover transition-colors flex items-center gap-2",
                        s.value === status ? "text-ink font-medium" : "text-ink-secondary"
                      )}
                    >
                      <div className={cn("w-1.5 h-1.5 rounded-full", statusDot[s.value])} />
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {localTime && (
              <span className="text-[10px] text-ink-faint">
                Local time: {localTime}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-surface border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors">
          <FileText size={13} strokeWidth={1.5} />
          Note
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-surface border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors">
          <Mail size={13} strokeWidth={1.5} />
          Email
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors">
          <Phone size={13} strokeWidth={1.5} />
          Call
        </button>
      </div>
    </div>
  );
}
