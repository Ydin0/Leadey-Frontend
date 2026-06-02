"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { FileText, Mail, Phone, ChevronDown, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getStatusDotClass,
  getStatusLabel,
  BUILTIN_STATUS_OPTIONS,
  type LeadStatusOption,
} from "@/lib/utils/lead-status";
import { CompanyAvatar } from "./company-avatar";
import { ConvertToOpportunityModal } from "@/components/opportunities/convert-to-opportunity-modal";

interface LeadDetailHeaderProps {
  leadId?: string;
  /** When set, the lead has already been converted — show a link to the
   *  opportunity instead of a Convert CTA. */
  opportunityId?: string | null;
  companyName: string;
  companyDomain?: string;
  status: string;
  /** Built-in + custom statuses available for this org. */
  statuses?: LeadStatusOption[];
  onStatusChange: (status: string) => void;
  localTime?: string;
  onEmail?: () => void;
  onNote?: () => void;
  onCall?: () => void;
}

export function LeadDetailHeader({
  leadId,
  opportunityId,
  companyName,
  companyDomain,
  status,
  statuses = BUILTIN_STATUS_OPTIONS,
  onStatusChange,
  localTime,
  onEmail,
  onNote,
  onCall,
}: LeadDetailHeaderProps) {
  const [showConvert, setShowConvert] = useState(false);
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

  const currentStatusLabel = getStatusLabel(status, statuses);

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
                <div className={cn("w-1.5 h-1.5 rounded-full", getStatusDotClass(status, statuses))} />
                {currentStatusLabel}
                <ChevronDown size={11} strokeWidth={2} className="text-ink-faint" />
              </button>
              {dropdownOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 min-w-[160px] max-h-[320px] overflow-y-auto bg-surface rounded-[10px] border border-border-subtle shadow-lg py-1">
                  {statuses.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => {
                        onStatusChange(s.key);
                        setDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 text-[11px] hover:bg-hover transition-colors flex items-center gap-2",
                        s.key === status ? "text-ink font-medium" : "text-ink-secondary"
                      )}
                    >
                      <div className={cn("w-1.5 h-1.5 rounded-full", getStatusDotClass(s.key, statuses))} />
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
        {opportunityId ? (
          <Link
            href={`/dashboard/opportunities/${opportunityId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-signal-blue/15 text-signal-blue-text border border-signal-blue-text/20 text-[11px] font-medium hover:opacity-90 transition-opacity"
          >
            <Briefcase size={13} strokeWidth={1.5} />
            Open Opportunity
          </Link>
        ) : (
          leadId && (
            <button
              onClick={() => setShowConvert(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-signal-green text-signal-green-text border border-signal-green-text/20 text-[11px] font-medium hover:opacity-90 transition-opacity"
            >
              <Briefcase size={13} strokeWidth={1.5} />
              Convert to Opportunity
            </button>
          )
        )}
        <button
          onClick={onNote}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-surface border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors"
        >
          <FileText size={13} strokeWidth={1.5} />
          Note
        </button>
        <button
          onClick={onEmail}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-surface border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors"
        >
          <Mail size={13} strokeWidth={1.5} />
          Email
        </button>
        <button
          onClick={onCall}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
        >
          <Phone size={13} strokeWidth={1.5} />
          Call
        </button>
      </div>
      {showConvert && leadId && (
        <ConvertToOpportunityModal
          leadId={leadId}
          defaultName={`${companyName} — Opportunity`}
          onClose={() => setShowConvert(false)}
        />
      )}
    </div>
  );
}
