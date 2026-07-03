"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, FileText, Mail, Phone, MessageSquare, Pencil, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompanyAvatar } from "@/components/funnels/focus/company-avatar";
import { LeadCampaignsMenu } from "./lead-campaigns-menu";
import { getStatusLabel, getStatusDotClass, type LeadStatusOption } from "@/lib/utils/lead-status";
import type { FunnelStatus } from "@/lib/types/funnel";

interface LeadActionBarProps {
  funnelId: string;
  leadId: string;
  companyName: string;
  companyDomain?: string;
  campaignName: string;
  campaignStatus: FunnelStatus;
  status: string;
  statuses: LeadStatusOption[];
  doNotCall?: boolean;
  onStatusChange: (status: string) => void;
  /** Rename the company (fans out to every contact at this company). */
  onRenameCompany?: (name: string) => Promise<void>;
  onNote: () => void;
  onEmail: () => void;
  onSms: () => void;
  onCall: () => void;
}

export function LeadActionBar({
  funnelId,
  leadId,
  companyName,
  companyDomain,
  campaignName,
  campaignStatus,
  status,
  statuses,
  doNotCall,
  onStatusChange,
  onRenameCompany,
  onNote,
  onEmail,
  onSms,
  onCall,
}: LeadActionBarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Inline company-name rename (hover the title → pencil → edit).
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(companyName);
  const [savingName, setSavingName] = useState(false);
  const savingRef = useRef(false);
  const cancelRef = useRef(false);

  async function saveName() {
    if (savingRef.current) return;
    const next = nameDraft.trim();
    if (!onRenameCompany || !next || next === companyName) {
      setEditingName(false);
      return;
    }
    savingRef.current = true;
    setSavingName(true);
    try {
      await onRenameCompany(next);
      setEditingName(false);
    } catch {
      /* keep editing so the user can retry */
    } finally {
      savingRef.current = false;
      setSavingName(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // When the rep arrived from the opportunities pipeline (?from=opportunities,
  // set by the board card / list row links), back returns THERE — not to the
  // lead's campaign. Read post-mount (not during render) so SSR and hydration
  // agree; the param survives prev/next because goToLeadId preserves the search.
  const [backTarget, setBackTarget] = useState<string | null>(null);
  useEffect(() => {
    setBackTarget(new URLSearchParams(window.location.search).get("from"));
  }, []);
  const back =
    backTarget === "opportunities"
      ? { href: "/dashboard/opportunities", label: "Back to Opportunities" }
      : backTarget === "companies"
        ? { href: "/dashboard/companies", label: "Back to Companies" }
        : { href: `/dashboard/funnels/${funnelId}`, label: `Back to ${campaignName}` };

  return (
    <div className="border-b border-border-subtle">
      <div className="px-6 pt-4">
        <Link
          href={back.href}
          className="inline-flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft size={13} strokeWidth={1.5} />
          {back.label}
        </Link>
      </div>

      <div className="flex items-center gap-4 px-6 py-3.5">
        <CompanyAvatar name={companyName} size="lg" domain={companyDomain} />

        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); void saveName(); }
                  else if (e.key === "Escape") { cancelRef.current = true; setEditingName(false); }
                }}
                onBlur={() => {
                  if (cancelRef.current) { cancelRef.current = false; return; }
                  void saveName();
                }}
                disabled={savingName}
                className="text-[18px] font-semibold text-ink tracking-[-0.01em] bg-section border border-border-default rounded-[8px] px-2 py-0.5 outline-none focus:border-signal-blue-text/50 min-w-[220px] max-w-full disabled:opacity-60"
              />
              {savingName && <Loader2 size={14} className="animate-spin text-ink-muted shrink-0" />}
            </div>
          ) : (
            <div className="group inline-flex items-center gap-1.5 min-w-0 max-w-full">
              <h1 className="text-[18px] font-semibold text-ink tracking-[-0.01em] truncate">
                {companyName}
              </h1>
              {onRenameCompany && (
                <button
                  type="button"
                  onClick={() => { setNameDraft(companyName); setEditingName(true); }}
                  title="Rename company"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-ink-faint hover:text-ink p-1 rounded-md hover:bg-hover shrink-0"
                >
                  <Pencil size={13} strokeWidth={1.5} />
                </button>
              )}
            </div>
          )}
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
                  {/* Reopen — pulls the lead out of a terminal state (e.g. an
                      auto-"completed" one) and back into the working queue. */}
                  {status !== "pending" && (
                    <button
                      onClick={() => {
                        onStatusChange("pending");
                        setOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-hover transition-colors flex items-center gap-2 text-ink-secondary"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-ink-faint" />
                      Pending (reopen)
                    </button>
                  )}
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

            {/* Campaigns this lead is in — current one shown, dropdown manages all */}
            <LeadCampaignsMenu
              funnelId={funnelId}
              leadId={leadId}
              campaignName={campaignName}
              campaignStatus={campaignStatus}
              statuses={statuses}
            />

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
            onClick={onSms}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
          >
            <MessageSquare size={13} strokeWidth={1.5} />
            Text
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
