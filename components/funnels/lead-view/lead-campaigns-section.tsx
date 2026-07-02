"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GitFork, Plus, X, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Section } from "./lead-section";
import { FunnelStatusBadge } from "../funnel-status-badge";
import { getStatusDotClass, getStatusLabel } from "@/lib/utils/lead-status";
import type { LeadStatusOption } from "@/lib/utils/lead-status";
import { listFunnels } from "@/lib/api/funnels";
import {
  listLeadCampaigns, addLeadToCampaign, removeLeadFromCampaign,
  type LeadCampaignMembership,
} from "@/lib/api/lead-campaigns";
import type { FunnelStatus } from "@/lib/types/funnel";

/** Every campaign this person is in — with add-to / remove-from controls.
 *  Matching is by email / phone / LinkedIn (leads are per-campaign rows). */
export function LeadCampaignsSection({
  funnelId,
  leadId,
  statuses,
}: {
  funnelId: string;
  leadId: string;
  statuses: LeadStatusOption[];
}) {
  const router = useRouter();
  const [memberships, setMemberships] = useState<LeadCampaignMembership[] | null>(null);
  const [allCampaigns, setAllCampaigns] = useState<{ id: string; name: string }[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMemberships(null);
    listLeadCampaigns(funnelId, leadId)
      .then((m) => { if (!cancelled) setMemberships(m); })
      .catch(() => { if (!cancelled) setMemberships([]); });
    return () => { cancelled = true; };
  }, [funnelId, leadId]);

  // Campaign list for the picker — loaded lazily on first open.
  const openPicker = useCallback(() => {
    setPickerOpen((v) => !v);
    if (allCampaigns === null) {
      listFunnels()
        .then((fs) => setAllCampaigns(fs.map((f) => ({ id: f.id, name: f.name }))))
        .catch(() => setAllCampaigns([]));
    }
  }, [allCampaigns]);

  const candidates = useMemo(() => {
    const memberFunnelIds = new Set((memberships ?? []).map((m) => m.funnelId));
    return (allCampaigns ?? []).filter((c) => !memberFunnelIds.has(c.id));
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
      // keep the picker open so the user can retry
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
      // row may already be gone — refresh
      listLeadCampaigns(funnelId, leadId).then(setMemberships).catch(() => {});
    } finally {
      setBusyId(null);
      setConfirmRemove(null);
    }
  }, [funnelId, leadId, router]);

  return (
    <Section
      icon={GitFork}
      title="Campaigns"
      count={memberships?.length ?? null}
      actions={
        <button
          type="button"
          onClick={openPicker}
          title="Add to another campaign"
          className="flex items-center justify-center w-[22px] h-[22px] rounded-md text-ink-muted hover:bg-hover hover:text-ink-secondary transition-colors"
        >
          <Plus size={13} />
        </button>
      }
    >
      <div className="flex flex-col gap-1.5 pl-1">
        {/* Add-to-campaign picker */}
        {pickerOpen && (
          <div className="rounded-[10px] border border-border-subtle bg-surface p-1 mb-1 max-h-[220px] overflow-y-auto">
            {allCampaigns === null ? (
              <div className="flex items-center justify-center py-3 text-ink-muted"><Loader2 size={13} className="animate-spin" /></div>
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

        {memberships === null ? (
          <div className="flex items-center py-1 text-ink-muted"><Loader2 size={13} className="animate-spin" /></div>
        ) : memberships.length === 0 ? (
          <p className="text-[12px] text-ink-faint">Not in any campaigns.</p>
        ) : (
          memberships.map((m) => (
            <div key={m.leadId} className="group flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-hover/50 min-w-0">
              <div className="flex-1 min-w-0">
                {m.isCurrent ? (
                  <span className="text-[12.5px] font-medium text-ink truncate block">{m.funnelName}</span>
                ) : (
                  <Link
                    href={`/dashboard/funnels/${m.funnelId}/leads/${m.leadId}`}
                    className="text-[12.5px] font-medium text-ink hover:text-accent transition-colors truncate block"
                    title={`Open ${m.funnelName}`}
                  >
                    {m.funnelName}
                  </Link>
                )}
                <span className="flex items-center gap-1.5 text-[10.5px] text-ink-muted">
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
      </div>
    </Section>
  );
}
