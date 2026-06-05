"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, GitFork, FileText, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompanyAvatar } from "@/components/funnels/focus/company-avatar";
import { FunnelStatusBadge } from "@/components/funnels/funnel-status-badge";
import { getStatusLabel, getStatusDotClass, type LeadStatusOption } from "@/lib/utils/lead-status";
import type { FunnelStatus } from "@/lib/types/funnel";

interface LeadActionBarProps {
  funnelId: string;
  companyName: string;
  companyDomain?: string;
  campaignName: string;
  campaignStatus: FunnelStatus;
  status: string;
  statuses: LeadStatusOption[];
  doNotCall?: boolean;
  onStatusChange: (status: string) => void;
  onNote: () => void;
  onEmail: () => void;
  onCall: () => void;
}

export function LeadActionBar({
  funnelId,
  companyName,
  companyDomain,
  campaignName,
  campaignStatus,
  status,
  statuses,
  doNotCall,
  onStatusChange,
  onNote,
  onEmail,
  onCall,
}: LeadActionBarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="border-b border-border-subtle">
      <div className="px-6 pt-4">
        <Link
          href={`/dashboard/funnels/${funnelId}`}
          className="inline-flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft size={13} strokeWidth={1.5} />
          Back to {campaignName}
        </Link>
      </div>

      <div className="flex items-center gap-4 px-6 py-3.5">
        <CompanyAvatar name={companyName} size="lg" domain={companyDomain} />

        <div className="flex-1 min-w-0">
          <h1 className="text-[18px] font-semibold text-ink tracking-[-0.01em] truncate">
            {companyName}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {/* Lead status — editable */}
            <div className="relative" ref={ref}>
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-signal-blue/15 text-signal-blue-text text-[11px] font-medium hover:opacity-90 transition-opacity"
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", getStatusDotClass(status, statuses))} />
                {getStatusLabel(status, statuses)}
                <ChevronDown size={11} strokeWidth={2} />
              </button>
              {open && (
                <div className="absolute left-0 top-full mt-1 z-50 min-w-[170px] max-h-[320px] overflow-y-auto bg-surface rounded-[10px] border border-border-subtle shadow-lg py-1">
                  {statuses.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => {
                        onStatusChange(s.key);
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 text-[11px] hover:bg-hover transition-colors flex items-center gap-2",
                        s.key === status ? "text-ink font-medium" : "text-ink-secondary",
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", getStatusDotClass(s.key, statuses))} />
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="text-ink-faint text-[11px]">·</span>

            {/* Campaign + its live status */}
            <span className="flex items-center gap-1.5 text-[11px] text-ink-muted min-w-0">
              <GitFork size={11} className="shrink-0" />
              <span className="truncate">{campaignName}</span>
            </span>
            <FunnelStatusBadge status={campaignStatus} />

            {doNotCall && (
              <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-signal-red/15 text-signal-red-text">
                Do Not Contact
              </span>
            )}
          </div>
        </div>

        {/* Action pills */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onNote}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
          >
            <FileText size={13} strokeWidth={1.5} />
            Note
          </button>
          <button
            onClick={onEmail}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
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
      </div>
    </div>
  );
}
