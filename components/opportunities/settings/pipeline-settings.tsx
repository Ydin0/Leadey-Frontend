"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";
import { AlertTriangle, ArrowRightLeft, Loader2, Plus, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal, ModalHeader } from "@/components/email/modal";
import {
  listPipelines,
  createPipeline,
  updatePipeline,
  deletePipeline,
  updateStage,
  createStage,
  deleteStage,
  reorderStages,
  type DeletePipelineOptions,
} from "@/lib/api/opportunities";
import type { Pipeline, PipelineStage, StageType } from "@/lib/types/opportunity";

const STAGE_TYPES: Array<{ value: StageType; label: string }> = [
  { value: "open", label: "Open" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export function PipelineSettings() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Pipeline | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listPipelines();
      setPipelines(list);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to load pipelines");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleAddPipeline() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await createPipeline({ name: newName.trim() });
      setNewName("");
      await reload();
    } catch (err: any) {
      setError(err?.message || "Failed to create pipeline");
    } finally {
      setAdding(false);
    }
  }

  async function handleConfirmDelete(options: DeletePipelineOptions) {
    if (!deleteTarget) return;
    // Errors propagate to the modal so it can show them inline.
    await deletePipeline(deleteTarget.id, options);
    setDeleteTarget(null);
    await reload();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={18} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-3 py-2 rounded-[8px] bg-signal-red/10 text-[11px] text-signal-red-text">
          {error}
        </div>
      )}

      <div className="card-brand bg-surface rounded-[14px] p-4">
        <h3 className="text-[13px] font-semibold text-ink mb-1">Pipelines</h3>
        <p className="text-[11px] text-ink-muted mb-3">
          A pipeline groups stages for one motion (new business, renewals,
          partners). Each org gets a default Sales pipeline.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New pipeline name"
            className="flex-1 px-3 py-1.5 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink outline-none focus:border-border-default placeholder:text-ink-faint"
          />
          <button
            type="button"
            onClick={handleAddPipeline}
            disabled={adding || !newName.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-40"
          >
            {adding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
            Add
          </button>
        </div>
      </div>

      {pipelines.map((p) => (
        <PipelineCard
          key={p.id}
          pipeline={p}
          onReload={reload}
          onRequestDelete={() => setDeleteTarget(p)}
        />
      ))}

      {deleteTarget && (
        <DeletePipelineModal
          pipeline={deleteTarget}
          otherPipelines={pipelines.filter((p) => p.id !== deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

interface PipelineCardProps {
  pipeline: Pipeline;
  onReload: () => Promise<void>;
  onRequestDelete: () => void;
}

function PipelineCard({ pipeline, onReload, onRequestDelete }: PipelineCardProps) {
  const [stages, setStages] = useState<PipelineStage[]>(pipeline.stages);
  const [adding, setAdding] = useState(false);
  const [newStageLabel, setNewStageLabel] = useState("");
  const [name, setName] = useState(pipeline.name);

  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // Drag-to-reorder stages — reflect locally, then persist the new order.
  async function moveStage(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    const next = [...stages];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setStages(next);
    try {
      await reorderStages(pipeline.id, next.map((s) => s.id));
    } catch (err: any) {
      alert(err?.message || "Failed to reorder stages");
      onReload();
    }
  }

  useEffect(() => {
    setStages(pipeline.stages);
  }, [pipeline.stages]);
  useEffect(() => {
    setName(pipeline.name);
  }, [pipeline.name]);

  // Rename works for EVERY pipeline, including the default one.
  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === pipeline.name) {
      setName(pipeline.name);
      return;
    }
    try {
      await updatePipeline(pipeline.id, { name: trimmed });
      onReload();
    } catch (err: any) {
      alert(err?.message || "Failed to rename pipeline");
      setName(pipeline.name);
    }
  }

  function patchLocal(stageId: string, patch: Partial<PipelineStage>) {
    setStages((cur) =>
      cur.map((s) => (s.id === stageId ? { ...s, ...patch } : s)),
    );
  }

  async function saveStage(stage: PipelineStage) {
    await updateStage(pipeline.id, stage.id, {
      label: stage.label,
      type: stage.type,
      defaultProbability: stage.defaultProbability,
      color: stage.color || undefined,
    });
  }

  async function handleAddStage() {
    if (!newStageLabel.trim()) return;
    setAdding(true);
    try {
      const created = await createStage(pipeline.id, {
        label: newStageLabel.trim(),
        type: "open",
        defaultProbability: 50,
      });
      setStages((cur) => [...cur, created]);
      setNewStageLabel("");
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteStage(stageId: string) {
    try {
      await deleteStage(pipeline.id, stageId);
      setStages((cur) => cur.filter((s) => s.id !== stageId));
    } catch (err: any) {
      // Block error surfaces via the API message; parent doesn't have toast yet.
      alert(err?.message || "Failed to delete stage");
    }
  }

  return (
    <div className="card-brand bg-surface rounded-[14px] p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            title="Click to rename this pipeline"
            className="text-[13px] font-semibold text-ink bg-transparent outline-none border-b border-transparent hover:border-border-subtle focus:border-border-default rounded-none px-0 py-0.5 min-w-[140px]"
          />
          {pipeline.isDefault && (
            <span className="block text-[10px] uppercase tracking-wider text-ink-faint">Default</span>
          )}
        </div>
        {!pipeline.isDefault && (
          <button
            type="button"
            onClick={onRequestDelete}
            className="text-ink-faint hover:text-signal-red-text p-1.5 rounded hover:bg-signal-red/10"
            title="Delete pipeline"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="rounded-[10px] border border-border-subtle overflow-hidden">
        <div className="grid grid-cols-[24px_1fr_120px_100px_36px] gap-2 px-3 py-2 bg-section text-[10px] uppercase tracking-wider text-ink-muted font-medium">
          <span />
          <span>Label</span>
          <span>Type</span>
          <span>Probability</span>
          <span />
        </div>
        {stages.map((s, i) => (
          <div
            key={s.id}
            onDragOver={(e) => { e.preventDefault(); if (dragOver !== i) setDragOver(i); }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex.current !== null) void moveStage(dragIndex.current, i);
              dragIndex.current = null;
              setDragOver(null);
            }}
            className={cn(
              "grid grid-cols-[24px_1fr_120px_100px_36px] gap-2 px-3 py-2 border-t items-center transition-colors",
              dragOver === i ? "border-signal-blue-text/50 bg-signal-blue/10" : "border-border-subtle",
            )}
          >
            <span
              draggable
              onDragStart={() => { dragIndex.current = i; }}
              onDragEnd={() => { dragIndex.current = null; setDragOver(null); }}
              className="cursor-grab active:cursor-grabbing text-ink-faint hover:text-ink-muted flex items-center justify-center"
              title="Drag to reorder"
            >
              <GripVertical size={14} />
            </span>
            <input
              value={s.label}
              onChange={(e) => patchLocal(s.id, { label: e.target.value })}
              onBlur={() => saveStage(s)}
              className="text-[12px] text-ink bg-transparent outline-none border-b border-transparent focus:border-border-default"
            />
            <NativeSelect
              value={s.type}
              onChange={(e) => {
                const next = { ...s, type: e.target.value as StageType };
                patchLocal(s.id, { type: next.type });
                void saveStage(next);
              }}
              className="text-[11px] text-ink bg-section rounded-[6px] px-2 py-1 outline-none"
            >
              {STAGE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </NativeSelect>
            <input
              type="number"
              min={0}
              max={100}
              value={s.defaultProbability}
              onChange={(e) => patchLocal(s.id, { defaultProbability: Number(e.target.value) || 0 })}
              onBlur={() => saveStage(s)}
              className="text-[11px] text-ink bg-section rounded-[6px] px-2 py-1 outline-none text-center"
            />
            <button
              type="button"
              onClick={() => handleDeleteStage(s.id)}
              className="p-1 rounded text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <input
          value={newStageLabel}
          onChange={(e) => setNewStageLabel(e.target.value)}
          placeholder="New stage label"
          className="flex-1 px-3 py-1.5 rounded-[8px] bg-section border border-border-subtle text-[11px] text-ink outline-none focus:border-border-default"
        />
        <button
          type="button"
          onClick={handleAddStage}
          disabled={adding || !newStageLabel.trim()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover disabled:opacity-40"
        >
          {adding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          Stage
        </button>
      </div>
    </div>
  );
}

interface DeletePipelineModalProps {
  pipeline: Pipeline;
  otherPipelines: Pipeline[];
  onCancel: () => void;
  onConfirm: (options: DeletePipelineOptions) => Promise<void>;
}

function DeletePipelineModal({
  pipeline,
  otherPipelines,
  onCancel,
  onConfirm,
}: DeletePipelineModalProps) {
  const oppCount = pipeline.opportunityCount ?? 0;
  const canMove = otherPipelines.length > 0;

  const [strategy, setStrategy] = useState<"move" | "delete">(
    canMove ? "move" : "delete",
  );
  const [targetPipelineId, setTargetPipelineId] = useState(otherPipelines[0]?.id ?? "");
  const targetPipeline = useMemo(
    () => otherPipelines.find((p) => p.id === targetPipelineId) ?? null,
    [otherPipelines, targetPipelineId],
  );
  const firstStageId = (p: Pipeline | null) =>
    p?.stages.find((s) => s.type === "open")?.id ?? p?.stages[0]?.id ?? "";
  const [targetStageId, setTargetStageId] = useState(firstStageId(targetPipeline));

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Reset the stage selection whenever the target pipeline changes.
  useEffect(() => {
    setTargetStageId(firstStageId(targetPipeline));
  }, [targetPipeline]);

  const moveInvalid = strategy === "move" && (!targetPipelineId || !targetStageId);

  async function confirm() {
    setBusy(true);
    setErr(null);
    try {
      if (oppCount === 0) {
        await onConfirm({});
      } else if (strategy === "move") {
        await onConfirm({ strategy: "move", targetPipelineId, targetStageId });
      } else {
        await onConfirm({ strategy: "delete" });
      }
      // On success the parent unmounts this modal.
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete pipeline");
      setBusy(false);
    }
  }

  const stageCount = pipeline.stages.length;
  const destructive = oppCount === 0 || strategy === "delete";
  const confirmLabel =
    oppCount === 0
      ? "Delete pipeline"
      : strategy === "move"
        ? "Move & delete pipeline"
        : `Delete ${oppCount} ${oppCount === 1 ? "opportunity" : "opportunities"} & pipeline`;

  return (
    <Modal onClose={() => !busy && onCancel()} maxWidth={480}>
      <ModalHeader title="Delete pipeline" onClose={() => !busy && onCancel()} />
      <div className="p-[18px]">
        <p className="text-[12.5px] text-ink-secondary">
          Delete <span className="font-medium text-ink">{pipeline.name}</span> and its{" "}
          {stageCount} {stageCount === 1 ? "stage" : "stages"}? This can&apos;t be undone.
        </p>

        {oppCount > 0 && (
          <>
            <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-[10px] bg-signal-blue/10 border border-signal-blue-text/20 text-[11.5px] text-signal-blue-text">
              <AlertTriangle size={13} className="mt-px shrink-0" />
              <span>
                This pipeline has{" "}
                <span className="font-semibold">
                  {oppCount} {oppCount === 1 ? "opportunity" : "opportunities"}
                </span>
                . Choose what happens to {oppCount === 1 ? "it" : "them"} before deleting.
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {/* Move option */}
              <button
                type="button"
                disabled={!canMove}
                onClick={() => setStrategy("move")}
                className={cn(
                  "w-full text-left rounded-[10px] border px-3 py-2.5 transition-colors",
                  !canMove && "opacity-40 cursor-not-allowed",
                  strategy === "move"
                    ? "border-signal-blue-text/50 bg-signal-blue/10"
                    : "border-border-subtle hover:bg-hover",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex items-center justify-center w-4 h-4 rounded-full border shrink-0",
                      strategy === "move" ? "border-signal-blue-text" : "border-border-default",
                    )}
                  >
                    {strategy === "move" && (
                      <span className="w-2 h-2 rounded-full bg-signal-blue-text" />
                    )}
                  </span>
                  <ArrowRightLeft size={13} className="text-ink-muted" />
                  <span className="text-[12px] font-medium text-ink">
                    Move opportunities to another pipeline
                  </span>
                </div>
                {!canMove && (
                  <p className="text-[11px] text-ink-faint mt-1 ml-6">
                    No other pipeline to move them to.
                  </p>
                )}
              </button>

              {strategy === "move" && canMove && (
                <div className="grid grid-cols-2 gap-2 pl-6">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1">
                      Pipeline
                    </label>
                    <NativeSelect
                      value={targetPipelineId}
                      onChange={(e) => setTargetPipelineId(e.target.value)}
                      className="w-full text-[12px] text-ink bg-section rounded-[8px] px-2 py-1.5 outline-none border border-border-subtle"
                    >
                      {otherPipelines.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1">
                      Stage
                    </label>
                    <NativeSelect
                      value={targetStageId}
                      onChange={(e) => setTargetStageId(e.target.value)}
                      className="w-full text-[12px] text-ink bg-section rounded-[8px] px-2 py-1.5 outline-none border border-border-subtle"
                    >
                      {(targetPipeline?.stages ?? []).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                          {s.type !== "open" ? ` (${s.type})` : ""}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
              )}

              {/* Delete option */}
              <button
                type="button"
                onClick={() => setStrategy("delete")}
                className={cn(
                  "w-full text-left rounded-[10px] border px-3 py-2.5 transition-colors",
                  strategy === "delete"
                    ? "border-signal-red-text/50 bg-signal-red/10"
                    : "border-border-subtle hover:bg-hover",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex items-center justify-center w-4 h-4 rounded-full border shrink-0",
                      strategy === "delete" ? "border-signal-red-text" : "border-border-default",
                    )}
                  >
                    {strategy === "delete" && (
                      <span className="w-2 h-2 rounded-full bg-signal-red-text" />
                    )}
                  </span>
                  <Trash2 size={13} className="text-ink-muted" />
                  <span className="text-[12px] font-medium text-ink">
                    Delete all {oppCount} {oppCount === 1 ? "opportunity" : "opportunities"}
                  </span>
                </div>
                {strategy === "delete" && (
                  <p className="text-[11px] text-signal-red-text/80 mt-1 ml-6">
                    Every opportunity in this pipeline is permanently removed.
                  </p>
                )}
              </button>
            </div>
          </>
        )}

        {err && <p className="mt-3 text-[11.5px] text-signal-red-text">{err}</p>}

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy || moveInvalid}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-[20px] text-[11px] font-medium transition-colors disabled:opacity-50",
              destructive
                ? "bg-signal-red text-signal-red-text hover:bg-signal-red/80"
                : "bg-ink text-on-ink hover:bg-ink/90",
            )}
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
