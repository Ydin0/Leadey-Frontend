"use client";

import Link from "next/link";
import { Phone, Mail, FileText, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeadStatuses } from "@/lib/hooks/use-lead-statuses";
import { getStatusDotClass, getStatusLabel } from "@/lib/utils/lead-status";
import type { CompanyProfileContact } from "@/lib/api/company-profile";

function initialsOf(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase() || "?";
}

const CHIP_LIMIT = 2;

/**
 * The person layer of the universal company profile: every contact across all
 * campaigns with cross-campaign enrollment chips + person-level activity
 * counts. Clicking a card narrows the merged timeline to that person; each
 * enrollment chip deep-links into that campaign's lead view.
 */
export function CompanyContactsPanel({
  contacts,
  activeContactId,
  onContactSelect,
}: {
  contacts: CompanyProfileContact[];
  activeContactId: string | null;
  onContactSelect: (personKey: string | null) => void;
}) {
  const { statuses } = useLeadStatuses();

  if (contacts.length === 0) {
    return (
      <div className="rounded-[14px] border border-border-subtle bg-surface p-5 text-center text-[12px] text-ink-muted">
        No contacts at this company yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
          Contacts · {contacts.length}
        </span>
        {activeContactId && (
          <button
            onClick={() => onContactSelect(null)}
            className="text-[10.5px] text-ink-muted hover:text-ink transition-colors"
          >
            Show all
          </button>
        )}
      </div>

      {contacts.map((c) => {
        const active = c.personKey === activeContactId;
        return (
          <button
            key={c.personKey}
            onClick={() => onContactSelect(active ? null : c.personKey)}
            className={cn(
              "w-full text-left rounded-[14px] border bg-surface p-3 transition-colors",
              active
                ? "border-accent/40 bg-accent/10 ring-1 ring-accent/30"
                : "border-border-subtle hover:border-border-default",
            )}
          >
            <div className="flex items-start gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-section text-[11px] font-medium text-ink-secondary shrink-0">
                {initialsOf(c.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-[12.5px] font-medium truncate", c.doNotCall ? "text-signal-red-text" : "text-ink")}>
                    {c.name}
                  </span>
                  {c.doNotCall && <PhoneOff size={11} className="text-signal-red-text shrink-0" />}
                </div>
                {c.title && <p className="text-[11px] text-ink-muted truncate">{c.title}</p>}

                {/* Person-level activity counts (org-wide, all campaigns) */}
                <div className="flex items-center gap-3 mt-1.5 text-[10.5px] text-ink-muted">
                  <span className="flex items-center gap-1" title="Calls">
                    <Phone size={10} /> {c.activity.calls}
                  </span>
                  <span className="flex items-center gap-1" title="Emails">
                    <Mail size={10} /> {c.activity.emails}
                  </span>
                  <span className="flex items-center gap-1" title="Notes">
                    <FileText size={10} /> {c.activity.notes}
                  </span>
                </div>

                {/* Cross-campaign presence — enrollment chips */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {c.enrollments.slice(0, CHIP_LIMIT).map((e) => (
                    <Link
                      key={e.leadId}
                      href={`/dashboard/funnels/${e.funnelId}/leads/${e.leadId}`}
                      onClick={(ev) => ev.stopPropagation()}
                      title={`${e.funnelName} — ${getStatusLabel(e.leadStatus, statuses)} · step ${e.currentStep}/${e.totalSteps}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-section px-2 py-0.5 text-[10px] text-ink-secondary hover:border-border-default transition-colors max-w-full"
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusDotClass(e.leadStatus, statuses))} />
                      <span className="truncate max-w-[110px]">{e.funnelName}</span>
                      <span className="text-ink-faint shrink-0">
                        {e.currentStep}/{e.totalSteps}
                      </span>
                    </Link>
                  ))}
                  {c.enrollments.length > CHIP_LIMIT && (
                    <span
                      className="text-[10px] text-ink-muted bg-section rounded-full px-1.5 py-0.5"
                      title={c.enrollments.slice(CHIP_LIMIT).map((e) => e.funnelName).join(", ")}
                    >
                      +{c.enrollments.length - CHIP_LIMIT}
                    </span>
                  )}
                  {c.enrollments.length === 0 && (
                    <span className="text-[10px] text-ink-faint">Not in any campaign</span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
