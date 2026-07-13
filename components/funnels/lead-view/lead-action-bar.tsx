"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, FileText, Mail, Phone, MessageSquare, MessageCircle, CalendarPlus, Pencil, Loader2, Sparkles, Search, Bot, UserPlus, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompanyAvatar } from "@/components/funnels/focus/company-avatar";
import { LeadCampaignsMenu } from "./lead-campaigns-menu";
import { enrichJobPosts } from "@/lib/api/funnels";
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
  onWhatsapp: () => void;
  onBookMeeting: () => void;
  onCall: () => void;
  /** Called after a successful Magic Enrich so the profile can refresh (e.g.
   *  the Hiring Roles section picks up the newly-scraped job posts). */
  onEnriched?: () => void;
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
  onWhatsapp,
  onBookMeeting,
  onCall,
  onEnriched,
}: LeadActionBarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Magic Enrich (job posts via TheirStack, for now — more options later).
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichMsg, setEnrichMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const enrichRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enrichOpen) return;
    function onClick(e: MouseEvent) {
      if (enrichRef.current && !enrichRef.current.contains(e.target as Node)) setEnrichOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [enrichOpen]);

  async function findJobPosts() {
    if (enriching) return;
    setEnrichOpen(false);
    setEnriching(true);
    setEnrichMsg(null);
    try {
      const res = await enrichJobPosts(funnelId, [{ name: companyName, domain: companyDomain || null }]);
      onEnriched?.();
      setEnrichMsg({
        ok: true,
        text: res.jobsFound > 0
          ? `Found ${res.jobsFound} job${res.jobsFound === 1 ? "" : "s"} · added ${res.rolesCreated} role${res.rolesCreated === 1 ? "" : "s"}`
          : "No open jobs found for this company right now.",
      });
    } catch (err) {
      setEnrichMsg({ ok: false, text: err instanceof Error ? err.message : "Magic Enrich failed" });
    } finally {
      setEnriching(false);
      setTimeout(() => setEnrichMsg(null), 5000);
    }
  }

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
  // The pipeline the opportunity was clicked from (?pipeline=, set by the
  // board card / list row) — carried onto the back link so the board reopens
  // on that pipeline's tab instead of the default one.
  const [backPipelineId, setBackPipelineId] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setBackTarget(params.get("from"));
    setBackPipelineId(params.get("pipeline"));
  }, []);
  const back =
    backTarget === "opportunities"
      ? {
          href: backPipelineId
            ? `/dashboard/opportunities?pipeline=${encodeURIComponent(backPipelineId)}`
            : "/dashboard/opportunities",
          label: "Back to Opportunities",
        }
      : backTarget === "companies" || backTarget === "leads"
        ? { href: "/dashboard/leads", label: "Back to Leads" }
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
          {/* Magic Enrich — job-post scraping now, more options later. */}
          <div className="relative" ref={enrichRef}>
            <button
              onClick={() => setEnrichOpen((v) => !v)}
              disabled={enriching}
              title="Magic Enrich"
              className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[11px] font-semibold text-[#161C38] bg-gradient-to-r from-accent to-signal-blue-text shadow-sm hover:opacity-90 transition-opacity disabled:opacity-70 overflow-hidden"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              {enriching ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} strokeWidth={2} />}
              {enriching ? "Enriching…" : "Magic Enrich"}
            </button>
            {enrichOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-[264px] bg-surface rounded-[12px] border border-border-subtle shadow-lg py-1.5">
                <div className="px-3 pt-0.5 pb-1.5 text-[10px] uppercase tracking-wider text-ink-muted font-medium">Enrich this company</div>
                <button
                  onClick={() => void findJobPosts()}
                  className="w-full text-left px-3 py-2 hover:bg-hover transition-colors flex items-start gap-2.5"
                >
                  <Search size={14} className="text-signal-blue-text mt-0.5 shrink-0" />
                  <span>
                    <span className="block text-[12px] font-medium text-ink">Find job posts</span>
                    <span className="block text-[10.5px] text-ink-muted leading-snug">See if {companyName || "this company"} is hiring and add the roles to this lead.</span>
                  </span>
                </button>
                <div className="my-1 border-t border-border-subtle" />
                <div className="w-full text-left px-3 py-2 flex items-start gap-2.5 opacity-50 cursor-not-allowed">
                  <Bot size={14} className="text-ink-muted mt-0.5 shrink-0" />
                  <span>
                    <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink">Enrich company data <span className="text-[9px] font-medium rounded-full px-1.5 py-px bg-section text-ink-muted">Soon</span></span>
                    <span className="block text-[10.5px] text-ink-muted leading-snug">AI-enrich firmographics &amp; insights.</span>
                  </span>
                </div>
                <div className="w-full text-left px-3 py-2 flex items-start gap-2.5 opacity-50 cursor-not-allowed">
                  <UserPlus size={14} className="text-ink-muted mt-0.5 shrink-0" />
                  <span>
                    <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink">Find more contacts <span className="text-[9px] font-medium rounded-full px-1.5 py-px bg-section text-ink-muted">Soon</span></span>
                    <span className="block text-[10.5px] text-ink-muted leading-snug">Discover additional people at this company.</span>
                  </span>
                </div>
              </div>
            )}
            {enrichMsg && (
              <div className={cn(
                "absolute left-0 top-full mt-1.5 z-50 w-[264px] flex items-start gap-2 px-3 py-2 rounded-[10px] border text-[11px] shadow-lg",
                enrichMsg.ok ? "bg-signal-green/10 border-signal-green-text/20 text-signal-green-text" : "bg-signal-red/10 border-signal-red-text/20 text-signal-red-text",
              )}>
                {enrichMsg.ok ? <Check size={13} className="mt-0.5 shrink-0" /> : <AlertCircle size={13} className="mt-0.5 shrink-0" />}
                <span className="leading-snug">{enrichMsg.text}</span>
              </div>
            )}
          </div>
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
            onClick={onWhatsapp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
          >
            <MessageCircle size={13} strokeWidth={1.5} />
            WhatsApp
          </button>
          <button
            onClick={onBookMeeting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-signal-blue border border-signal-blue-text/40 text-link text-[11px] font-semibold hover:bg-accent/25 transition-colors"
          >
            <CalendarPlus size={13} strokeWidth={1.5} />
            Book meeting
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
