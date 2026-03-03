"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { OPPORTUNITY_STAGES } from "@/lib/types/opportunity";
import type { Opportunity, OpportunityStage } from "@/lib/types/opportunity";

interface OpportunityCardProps {
  opportunity: Opportunity;
  ownerName: string;
  onMove: (id: string, stage: OpportunityStage) => void;
}

function probabilityColor(p: number): string {
  if (p >= 60) return "text-signal-green-text";
  if (p >= 30) return "text-signal-blue-text";
  return "text-signal-red-text";
}

function formatCloseDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function OpportunityCard({ opportunity, ownerName, onMove }: OpportunityCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const otherStages = OPPORTUNITY_STAGES.filter((s) => s.value !== opportunity.stage);

  return (
    <div className="bg-surface rounded-[10px] border border-border-subtle p-3 hover:border-border-default transition-colors">
      {/* Company + Contact */}
      <div className="flex items-start gap-2 mb-2">
        <img
          src={`https://logo.clearbit.com/${opportunity.companyDomain}`}
          alt=""
          className="w-6 h-6 rounded-md shrink-0 mt-0.5"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink truncate">{opportunity.companyName}</p>
          <p className="text-[11px] text-ink-secondary truncate">
            {opportunity.contactName}, {opportunity.contactTitle}
          </p>
        </div>
      </div>

      {/* Value + Probability */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-semibold text-ink">
          ${opportunity.value.toLocaleString()}/mo
        </span>
        <span className={cn("text-[12px] font-medium", probabilityColor(opportunity.probability))}>
          {opportunity.probability}%
        </span>
      </div>

      {/* Owner + Date + Move */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <MemberAvatar id={opportunity.ownerId} name={ownerName} />
          <span className="text-[11px] text-ink-secondary truncate">{ownerName.split(" ")[0]}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-ink-muted">{formatCloseDate(opportunity.closeDate)}</span>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] text-ink-muted hover:bg-hover transition-colors"
            >
              Move
              <ChevronDown size={10} strokeWidth={2} />
            </button>
            {showMenu && (
              <div className="absolute bottom-full right-0 mb-1 bg-surface rounded-[10px] border border-border-subtle shadow-lg z-20 min-w-[140px] py-1">
                {otherStages.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => {
                      onMove(opportunity.id, s.value);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-ink-secondary hover:bg-hover/60 transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
