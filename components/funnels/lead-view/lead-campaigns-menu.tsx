"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GitFork, ChevronDown, Plus, X, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { FunnelStatusBadge } from "../funnel-status-badge";
import { getStatusDotClass, getStatusLabel, type LeadStatusOption } from "@/lib/utils/lead-status";
import { useQueryClient } from "@tanstack/react-query";
import { listFunnels } from "@/lib/api/funnels";
import { qk } from "@/lib/queries/keys";
import { STALE } from "@/lib/queries/config";
import {
  listLeadCampaigns, addLeadToCampaign, removeLeadFromCampaign,
  type LeadCampaignMembership,
} from "@/lib/api/lead-campaigns";
import type { FunnelStatus } from "@/lib/types/funnel";

/** Header chip showing the current campaign that opens the cross-campaign
 *  manager: every campaign this person is in (matched by email / phone /
 *  LinkedIn), with add-to and remove-from controls. */
export function LeadCampaignsMenu({
  funnelId,
  leadId,
  campaignName,
  campaignStatus,
  statuses,
}: {
  funnelId: string;
  leadId: string;
  campaignName: string;
  campaignStatus: FunnelStatus;
  statuses: LeadStatusOption[];
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [memberships, setMemberships] = useState<LeadCampaignMembership[] | null>(null);
  const [allCampaigns, setAllCampaigns] = useState<{ id: string; name: string }[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMemberships(null);
    setPickerOpen(false);
    listLeadCampaigns(funnelId, leadId)
      .then((m) => { if (!cancelled) setMemberships(m); })
      .catch(() => { if (!cancelled) setMemberships([]); });
    return () => { cancelled = true; };
  }, [funnelId, leadId]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const qc = useQueryClient();
  const openPicker = useCallback(() => {
    setPickerOpen((v) => !v);
    if (allCampaigns === null) {
      // Shared funnels cache — usually already warm from the sidebar, so this
      // resolves without a network request.
      qc.fetchQuery({ queryKey: qk.funnels, queryFn: listFunnels, staleTime: STALE.LIST })
        .then((fs) => setAllCampaigns(fs.map((f) => ({ id: f.id, name: f.name }))))
        .catch(() => setAllCampaigns([]));
    }
  }, [allCampaigns, qc]);

  const candidates = useMemo(() => {
    const memberIds = new Set((memberships ?? []).map((m) => m.funnelId));
    return (allCampaigns ?? []).filter((c) => !memberIds.has(c.id));
  }, [allCampaigns, memberships]);

  const handleAdd = useCallback(async (targetFunnelId: string) => {
    setAdding(true);
    try {
      const result = await addLeadToCampaign(funnelId, leadId, targetFunnelId);
      if (Array.isArray(result)) setMemberships(result);
      setJustAdded(targetFunnelId);
      setTimeout(() => setJustAdded(null), 1500);
      setPickerOpen(false);
    } catch {
      // keep picker open so the user can retry
    } finally {
      setAdding(false);
    }
  }, [funnelId, leadId]);

  const handleRemove = useCallback(async (membershipLeadId: string) => {
    setBusyId(membershipLeadId);
    try {
      const { wasCurrent } = await removeLeadFromCampaign(funnelId, leadId, membershipLeadId);
      if (wasCurrent) {
        // The row being viewed no longer exists — back to the campaign list.
        router.push(`/dashboard/funnels/${funnelId}`);
        return;
      }
      setMemberships((prev) => (prev ?? []).filter((m) => m.leadId !== membershipLeadId));
    } catch {
      listLeadCampaigns(funnelId, leadId).then(setMemberships).catch(() => {});
    } finally {
      setBusyId(null);
      setConfirmRemove(null);
    }
  }, [funnelId, leadId, router]);

  const extraCount = Math.max(0, (memberships?.length ?? 1) - 1);

  return (
    <div className="relative min-w-0" ref={ref}>
      {/* Trigger — the campaign identity, now interactive */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Campaigns this lead is in"
        className="flex items-center gap-1.5 min-w-0 rounded-full px-1 py-0.5 hover:bg-hover transition-colors"
      >
        <span className="flex items-center gap-1.5 text-[11px] text-ink-muted min-w-0">
          <GitFork size={11} className="shrink-0" />
          <span className="truncate">{campaignName}</span>
        </span>
        <FunnelStatusBadge status={campaignStatus} />
        {extraCount > 0 && (
          <span className="text-[10px] font-medium rounded-full px-1.5 py-px bg-signal-slate text-signal-slate-text shrink-0">
            +{extraCount}
          </span>
        )}
        <ChevronDown size={11} className="text-ink-faint shrink-0" strokeWidth={2} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-[300px] bg-surface rounded-[10px] border border-border-subtle shadow-lg py-1">
          <div className="px-3 pt-1.5 pb-1 text-[10px] uppercase tracking-wider text-ink-muted font-medium">
            Campaigns
          </div>

          {memberships === null ? (
            <div className="flex items-center justify-center py-3 text-ink-muted"><Loader2 size={13} className="animate-spin" /></div>
          ) : (
            memberships.map((m) => (
              <div key={m.leadId} className="group flex items-center gap-2 px-3 py-1.5 hover:bg-hover/60 min-w-0">
                <div className="flex-1 min-w-0">
                  {m.isCurrent ? (
                    <span className="text-[12px] font-medium text-ink truncate block">{m.funnelName}</span>
                  ) : (
                    <Link
                      href={`/dashboard/funnels/${m.funnelId}/leads/${m.leadId}`}
                      className="text-[12px] font-medium text-ink hover:text-accent transition-colors truncate block"
                      title={`Open in ${m.funnelName}`}
                    >
                      {m.funnelName}
                    </Link>
                  )}
                  <span className="flex items-center gap-1.5 text-[10px] text-ink-muted">
                    <span className={cn("w-1.5 h-1.5 rounded-full", getStatusDotClass(m.leadStatus, statuses))} />
                    {getStatusLabel(m.leadStatus, statuses)}
                    {m.isCurrent && <span className="text-ink-faint">· this view</span>}
                  </span>
                </div>
                <FunnelStatusBadge status={m.funnelStatus as FunnelStatus} />
                {confirmRemove === m.leadId ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setConfirmRemove(null)}
                      className="px-2 py-0.5 rounded-full bg-section text-ink-secondary text-[10px] font-medium hover:bg-hover border border-border-subtle"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => void handleRemove(m.leadId)}
                      disabled={busyId === m.leadId}
                      className="px-2 py-0.5 rounded-full bg-signal-red/15 text-signal-red-text text-[10px] font-medium hover:bg-signal-red/25 disabled:opacity-50"
                    >
                      {busyId === m.leadId ? "Removing…" : "Remove"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRemove(m.leadId)}
                    title={`Remove from ${m.funnelName}`}
                    className="flex items-center justify-center w-[20px] h-[20px] rounded-md text-ink-faint opacity-0 group-hover:opacity-100 hover:bg-signal-red/10 hover:text-signal-red-text transition-all shrink-0"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))
          )}

          <div className="my-1 border-t border-border-subtle" />
          <button
            type="button"
            onClick={openPicker}
            className="w-full text-left px-3 py-1.5 text-[11px] font-medium text-signal-blue-text hover:bg-hover transition-colors flex items-center gap-1.5"
          >
            <Plus size={11} /> Add to campaign
          </button>

          {pickerOpen && (
            <div className="mx-2 mb-1 rounded-[8px] border border-border-subtle bg-section/40 p-1 max-h-[180px] overflow-y-auto">
              {allCampaigns === null ? (
                <div className="flex items-center justify-center py-2 text-ink-muted"><Loader2 size={13} className="animate-spin" /></div>
              ) : candidates.length === 0 ? (
                <p className="text-[11px] text-ink-faint px-2 py-1.5">Already in every campaign.</p>
              ) : (
                candidates.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => void handleAdd(c.id)}
                    disabled={adding}
                    className="w-full text-left px-2 py-1.5 rounded-md text-[12px] text-ink-secondary hover:bg-hover hover:text-ink transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {justAdded === c.id ? <Check size={11} className="text-signal-green-text" /> : <Plus size={11} className="text-ink-faint" />}
                    <span className="truncate">{c.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
