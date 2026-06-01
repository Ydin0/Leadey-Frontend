"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Building2,
  Calendar,
  DollarSign,
  Loader2,
  Mail,
  Phone,
  Send,
  Trash2,
  XCircle,
  RotateCcw,
  Linkedin,
} from "lucide-react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { OpportunityActivityTimeline } from "@/components/opportunities/opportunity-activity-timeline";
import { WinLostModal } from "@/components/opportunities/win-lost-modal";
import {
  getOpportunity,
  listOpportunityEvents,
  addOpportunityNote,
  winOpportunity,
  loseOpportunity,
  reopenOpportunity,
  updateOpportunity,
  deleteOpportunity,
  listPipelines,
} from "@/lib/api/opportunities";
import { formatCurrency } from "@/lib/utils";
import type {
  OpportunityDetail,
  OpportunityEvent,
  Pipeline,
  PipelineStage,
} from "@/lib/types/opportunity";

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isAuthReady = useAuthReady();

  const [opp, setOpp] = useState<OpportunityDetail | null>(null);
  const [events, setEvents] = useState<OpportunityEvent[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [showWinModal, setShowWinModal] = useState(false);
  const [showLoseModal, setShowLoseModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const reload = useCallback(async () => {
    if (!isAuthReady) return;
    setLoading(true);
    try {
      const [detail, eventsList, pipelineList] = await Promise.all([
        getOpportunity(id),
        listOpportunityEvents(id),
        listPipelines(),
      ]);
      setOpp(detail);
      setEvents(eventsList);
      setPipelines(pipelineList);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to load opportunity");
    } finally {
      setLoading(false);
    }
  }, [id, isAuthReady]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleAddNote() {
    if (!noteDraft.trim()) return;
    try {
      await addOpportunityNote(id, noteDraft.trim());
      setNoteDraft("");
      const fresh = await listOpportunityEvents(id);
      setEvents(fresh);
    } catch (err: any) {
      setError(err?.message || "Failed to add note");
    }
  }

  async function handleStageChange(stageId: string) {
    if (!opp) return;
    try {
      const updated = await updateOpportunity(id, { stageId });
      setOpp({ ...opp, ...updated });
      const fresh = await listOpportunityEvents(id);
      setEvents(fresh);
    } catch (err: any) {
      setError(err?.message || "Failed to change stage");
    }
  }

  async function handleWin() {
    await winOpportunity(id);
    await reload();
  }
  async function handleLose(reason?: string) {
    await loseOpportunity(id, reason);
    await reload();
  }
  async function handleReopen() {
    try {
      await reopenOpportunity(id);
      await reload();
    } catch (err: any) {
      setError(err?.message || "Failed to reopen");
    }
  }
  async function handleDelete() {
    await deleteOpportunity(id);
    router.push("/dashboard/opportunities");
  }

  if (loading && !opp) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }
  if (!opp) {
    return (
      <div className="card-brand bg-surface rounded-[14px] p-6 text-center">
        <p className="text-[12px] text-ink-muted">{error || "Opportunity not found"}</p>
      </div>
    );
  }

  const pipeline = pipelines.find((p) => p.id === opp.pipelineId) || null;
  const stage = pipeline?.stages.find((s) => s.id === opp.stageId) || null;
  const isClosed = stage?.type === "won" || stage?.type === "lost";
  const probability = opp.probabilityOverride ?? stage?.defaultProbability ?? 50;

  return (
    <div>
      <Link
        href="/dashboard/opportunities"
        className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink transition-colors mb-3"
      >
        <ArrowLeft size={14} strokeWidth={1.5} />
        Back to Opportunities
      </Link>

      <header className="card-brand bg-surface rounded-[14px] px-5 py-4 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <StageBadge stage={stage} />
              {opp.company && (
                <span className="text-[11px] text-ink-muted flex items-center gap-1">
                  <Building2 size={11} />
                  {opp.company.name}
                </span>
              )}
            </div>
            <h1 className="text-[18px] font-semibold text-ink leading-tight">
              {opp.name}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-[12px] text-ink-muted flex-wrap">
              <span className="flex items-center gap-1">
                <DollarSign size={11} />
                <strong className="text-ink">{formatCurrency(opp.value, opp.currency)}</strong>
                <span className="ml-1 text-ink-faint">· {probability}% probability</span>
              </span>
              {opp.expectedCloseDate && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  Close{" "}
                  {new Date(opp.expectedCloseDate + "T00:00:00").toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
              {opp.closedAt && (
                <span className="flex items-center gap-1">
                  Closed {new Date(opp.closedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isClosed ? (
              <button
                type="button"
                onClick={handleReopen}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
              >
                <RotateCcw size={11} /> Reopen
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowLoseModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
                >
                  <XCircle size={11} /> Lose
                </button>
                <button
                  type="button"
                  onClick={() => setShowWinModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-signal-green text-signal-green-text text-[11px] font-medium hover:opacity-90 transition-opacity"
                >
                  <Award size={11} /> Mark Won
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-md text-ink-muted hover:text-signal-red-text hover:bg-signal-red/10"
              title="Delete opportunity"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-[280px_1fr_280px] gap-4">
        {/* Left: company + contact */}
        <aside className="space-y-3">
          {opp.company && (
            <div className="card-brand bg-surface rounded-[12px] p-4">
              <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
                Company
              </p>
              <p className="text-[13px] font-medium text-ink">{opp.company.name}</p>
              {opp.company.domain && (
                <a
                  href={`https://${opp.company.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-signal-blue-text hover:underline"
                >
                  {opp.company.domain}
                </a>
              )}
              {opp.company.industry && (
                <p className="text-[11px] text-ink-muted mt-1">{opp.company.industry}</p>
              )}
            </div>
          )}
          {opp.primaryContact && (
            <div className="card-brand bg-surface rounded-[12px] p-4">
              <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
                Primary Contact
              </p>
              <p className="text-[13px] font-medium text-ink">
                {opp.primaryContact.fullName ||
                  `${opp.primaryContact.firstName || ""} ${opp.primaryContact.lastName || ""}`.trim()}
              </p>
              {opp.primaryContact.currentTitle && (
                <p className="text-[11px] text-ink-muted">{opp.primaryContact.currentTitle}</p>
              )}
              <div className="mt-3 space-y-1.5">
                {opp.primaryContact.email && (
                  <ContactRow icon={Mail} value={opp.primaryContact.email} />
                )}
                {opp.primaryContact.phone && (
                  <ContactRow icon={Phone} value={opp.primaryContact.phone} mono />
                )}
                {opp.primaryContact.linkedinUrl && (
                  <a
                    href={opp.primaryContact.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] text-signal-blue-text hover:underline"
                  >
                    <Linkedin size={11} />
                    LinkedIn profile
                  </a>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Centre: notes form + activity timeline */}
        <section>
          <div className="card-brand bg-surface rounded-[12px] p-4 mb-3">
            <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
              Add a note
            </p>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={2}
              placeholder="What happened? Quick context for the next person on this deal…"
              className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink outline-none resize-none focus:border-border-default placeholder:text-ink-faint"
            />
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={handleAddNote}
                disabled={!noteDraft.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-40"
              >
                <Send size={11} /> Add note
              </button>
            </div>
          </div>

          <div className="card-brand bg-surface rounded-[12px] p-5">
            <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-4">
              Activity
            </p>
            <OpportunityActivityTimeline events={events} />
          </div>
        </section>

        {/* Right: stage picker + meta */}
        <aside className="space-y-3">
          {pipeline && (
            <div className="card-brand bg-surface rounded-[12px] p-4">
              <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
                Stage
              </p>
              <select
                value={opp.stageId}
                onChange={(e) => handleStageChange(e.target.value)}
                className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink outline-none focus:border-border-default"
              >
                {pipeline.stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-ink-muted mt-2">
                Pipeline: <span className="text-ink">{pipeline.name}</span>
              </p>
            </div>
          )}

          <div className="card-brand bg-surface rounded-[12px] p-4">
            <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
              Source
            </p>
            {opp.sourceLeadId ? (
              <p className="text-[12px] text-ink-secondary">
                Converted from a campaign lead.
              </p>
            ) : (
              <p className="text-[12px] text-ink-muted">Created manually</p>
            )}
          </div>
        </aside>
      </div>

      {showWinModal && (
        <WinLostModal variant="win" onClose={() => setShowWinModal(false)} onConfirm={handleWin} />
      )}
      {showLoseModal && (
        <WinLostModal variant="lose" onClose={() => setShowLoseModal(false)} onConfirm={handleLose} />
      )}
      {showDeleteConfirm && (
        <ConfirmDeleteModal
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function StageBadge({ stage }: { stage: PipelineStage | null }) {
  if (!stage) return null;
  const color =
    stage.type === "won"
      ? "bg-signal-green/15 text-signal-green-text"
      : stage.type === "lost"
        ? "bg-signal-red/15 text-signal-red-text"
        : "bg-signal-blue/15 text-signal-blue-text";
  return (
    <span className={`text-[10px] font-medium uppercase tracking-[0.06em] rounded-full px-2 py-0.5 ${color}`}>
      {stage.label}
    </span>
  );
}

function ContactRow({
  icon: Icon,
  value,
  mono,
}: {
  icon: typeof Mail;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-ink-secondary">
      <Icon size={11} className="text-ink-muted shrink-0" />
      <span className={mono ? "font-mono" : ""}>{value}</span>
    </div>
  );
}

function ConfirmDeleteModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  async function handle() {
    setBusy(true);
    try {
      await onConfirm();
    } catch {
      setBusy(false);
    }
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-[14px] border border-border-subtle w-full max-w-sm mx-4 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[14px] font-semibold text-ink mb-2">Delete opportunity?</h3>
        <p className="text-[12px] text-ink-muted mb-4">
          This will remove the opportunity and its activity history. The
          source campaign lead is kept.
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handle}
            disabled={busy}
            className="px-4 py-1.5 rounded-[20px] bg-signal-red-text text-white text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
