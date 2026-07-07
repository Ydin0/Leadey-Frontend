"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, Rocket, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FunnelLeadTable } from "@/components/funnels/leads/funnel-lead-table";
import { ImportsView } from "@/components/leads/imports-view";
import { NativeSelect } from "@/components/ui/native-select";
import { useOrgLeads, useInvalidateOrgLeads } from "@/lib/queries/use-org-leads";
import { useFunnels } from "@/lib/queries/use-funnels";
import { createCampaignFromLeads } from "@/lib/api/leads";
import { bulkAddLeadsToCampaign } from "@/lib/api/lead-campaigns";
import { sortLeads, DEFAULT_LEAD_SORT, type LeadSortKey } from "@/lib/utils/sort-leads";

const SORT_STORAGE_KEY = "leadey:org-lead-sort";

type Tab = "leads" | "imports";

/** Org-wide Leads page — the exact campaign leads table (Smart Views, filter
 *  builder, group-by-company, columns, sort) over every lead in every
 *  campaign, plus create-campaign-from-filter / add-selection-to-campaign. */
export function OrgLeadsShell() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("leads");
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showStatus = useCallback((type: "success" | "error", text: string) => {
    setStatus({ type, text });
  }, []);

  const { data, isLoading } = useOrgLeads();
  const invalidateOrgLeads = useInvalidateOrgLeads();

  // Sort lives at page level (same wiring as the campaign page) so the table
  // and navigation order always agree. Restored lazily — the first paint is
  // the loading state, so no hydration mismatch is possible.
  const [sortBy, setSortBy] = useState<LeadSortKey>(() => {
    if (typeof window === "undefined") return DEFAULT_LEAD_SORT;
    return (window.localStorage.getItem(SORT_STORAGE_KEY) as LeadSortKey) || DEFAULT_LEAD_SORT;
  });
  const changeSort = useCallback((key: LeadSortKey) => {
    setSortBy(key);
    if (typeof window !== "undefined") window.localStorage.setItem(SORT_STORAGE_KEY, key);
  }, []);

  const sorted = useMemo(() => sortLeads(data?.leads ?? [], sortBy), [data?.leads, sortBy]);

  // Campaign actions launched from the table (toolbar = filtered set, bulk bar
  // = explicit selection).
  const [createIds, setCreateIds] = useState<string[] | null>(null);
  const [addIds, setAddIds] = useState<string[] | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-semibold text-ink">Leads</h1>
          <p className="text-[12px] text-ink-muted mt-0.5">
            Every lead across your campaigns — filter them down and launch campaigns from the result.
          </p>
        </div>
        <div className="flex items-center bg-section rounded-full p-0.5 border border-border-subtle">
          {([["leads", "Leads"], ["imports", "Imports"]] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-colors",
                tab === id ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
              )}
            >
              {id === "leads" && <Users size={11} />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {status && (
        <div
          className={cn(
            "flex items-center gap-2 mb-3 px-3 py-2 rounded-[10px] border",
            status.type === "success"
              ? "bg-signal-green/10 border-signal-green-text/20"
              : "bg-signal-red/10 border-signal-red-text/20",
          )}
        >
          {status.type === "success" ? (
            <Check size={13} className="text-signal-green-text shrink-0" />
          ) : (
            <AlertTriangle size={13} className="text-signal-red-text shrink-0" />
          )}
          <span className="text-[11.5px] text-ink-secondary flex-1">{status.text}</span>
          <button onClick={() => setStatus(null)} className="text-ink-muted hover:text-ink transition-colors">
            <X size={12} />
          </button>
        </div>
      )}

      {tab === "imports" ? (
        <ImportsView showStatus={showStatus} />
      ) : isLoading ? (
        <div className="bg-surface rounded-[14px] border border-border-subtle p-8 flex items-center justify-center gap-2 text-[12px] text-ink-muted">
          <Loader2 size={14} className="animate-spin" /> Loading leads…
        </div>
      ) : (
        <>
          {data?.truncated && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-[10px] bg-signal-amber/10 border border-signal-amber-text/20">
              <AlertTriangle size={13} className="text-signal-amber-text shrink-0" />
              <span className="text-[11.5px] text-signal-amber-text">
                Showing the {sorted.length.toLocaleString()} most recent of {data.totalCount.toLocaleString()} leads —
                refine your filters or export for the full set.
              </span>
            </div>
          )}
          <FunnelLeadTable
            leads={sorted}
            sortBy={sortBy}
            onSortChange={changeSort}
            onLeadAdvanced={invalidateOrgLeads}
            onLeadClick={(index) => {
              const lead = sorted[index];
              if (lead?.funnelId) router.push(`/dashboard/leads/${lead.id}?c=${lead.funnelId}&from=leads`);
            }}
            onCreateCampaign={(ids) => setCreateIds(ids)}
            onAddToCampaign={(ids) => setAddIds(ids)}
          />
        </>
      )}

      {createIds && (
        <CreateCampaignModal
          leadIds={createIds}
          onClose={() => setCreateIds(null)}
          onDone={(funnelId) => {
            setCreateIds(null);
            router.push(`/dashboard/funnels/${funnelId}`);
          }}
        />
      )}
      {addIds && (
        <AddToCampaignModal
          leadIds={addIds}
          onClose={() => setAddIds(null)}
          onDone={(added, skipped, name) => {
            setAddIds(null);
            showStatus(
              "success",
              `Added ${added.toLocaleString()} lead${added === 1 ? "" : "s"} to ${name}${skipped > 0 ? ` — ${skipped.toLocaleString()} already there` : ""}.`,
            );
            invalidateOrgLeads();
          }}
        />
      )}
    </div>
  );
}

function CreateCampaignModal({ leadIds, onClose, onDone }: {
  leadIds: string[];
  onClose: () => void;
  onDone: (funnelId: string) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await createCampaignFromLeads({ name: name.trim(), leadIds });
      onDone(res.funnelId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create campaign");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-[3px]" onClick={onClose}>
      <div className="bg-surface rounded-[14px] border border-border-subtle p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-1">
          <Rocket size={16} className="text-accent" />
          <h3 className="text-[15px] font-semibold text-ink">Create campaign</h3>
        </div>
        <p className="text-[12px] text-ink-muted mb-4">
          {leadIds.length.toLocaleString()} {leadIds.length === 1 ? "lead" : "leads"} will be added to a new campaign
          (deduplicated). You build the sequence after.
        </p>
        <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Campaign name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
          autoFocus
          placeholder="e.g. CEOs · UK · Has phone"
          className="w-full px-3 py-2 rounded-[10px] bg-section text-[13px] text-ink outline-none border border-border-subtle focus:border-accent"
        />
        {error && <p className="text-[11px] text-signal-red-text mt-2">{error}</p>}
        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-full bg-section text-ink-secondary text-[12px] font-medium hover:bg-hover transition-colors">Cancel</button>
          <button onClick={() => void submit()} disabled={!name.trim() || busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-on-ink text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Rocket size={13} />}
            Create campaign
          </button>
        </div>
      </div>
    </div>
  );
}

function AddToCampaignModal({ leadIds, onClose, onDone }: {
  leadIds: string[];
  onClose: () => void;
  onDone: (added: number, skipped: number, campaignName: string) => void;
}) {
  const { data: funnels } = useFunnels();
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = useMemo(() => funnels ?? [], [funnels]);

  async function submit() {
    if (!targetId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await bulkAddLeadsToCampaign(targetId, leadIds);
      onDone(res.added, res.skipped, options.find((f) => f.id === targetId)?.name || "the campaign");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add leads");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-[3px]" onClick={onClose}>
      <div className="bg-surface rounded-[14px] border border-border-subtle p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-1">
          <Users size={16} className="text-accent" />
          <h3 className="text-[15px] font-semibold text-ink">Add to campaign</h3>
        </div>
        <p className="text-[12px] text-ink-muted mb-4">
          {leadIds.length.toLocaleString()} selected {leadIds.length === 1 ? "lead" : "leads"} — people already in the
          target campaign are skipped automatically.
        </p>
        <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Campaign</label>
        <NativeSelect
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          className="w-full px-3 py-2 rounded-[10px] bg-section text-[13px] text-ink outline-none border border-border-subtle focus:border-accent"
        >
          <option value="">Choose a campaign…</option>
          {options.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </NativeSelect>
        {error && <p className="text-[11px] text-signal-red-text mt-2">{error}</p>}
        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-full bg-section text-ink-secondary text-[12px] font-medium hover:bg-hover transition-colors">Cancel</button>
          <button onClick={() => void submit()} disabled={!targetId || busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-on-ink text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Add leads
          </button>
        </div>
      </div>
    </div>
  );
}
